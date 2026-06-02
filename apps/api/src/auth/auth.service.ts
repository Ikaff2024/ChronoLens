import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { AuditAction, OrganizationRole } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma.service";
import { PILOT_ORGANIZATION_ID, RequestContext, TenantService } from "../tenant/tenant.service";

const PILOT_EMAIL = "pilot@chronolens.local";
const PILOT_PASSWORD = "chronolens-pilot";
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService
  ) {}

  private hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
    return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
  }

  private verifyPassword(password: string, stored: string) {
    const [salt, hash] = stored.split(":");
    const expected = Buffer.from(hash, "hex");
    const actual = scryptSync(password, salt, 64);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  async ensurePilotAccount() {
    await this.prisma.organization.upsert({
      where: { id: PILOT_ORGANIZATION_ID },
      update: {},
      create: { id: PILOT_ORGANIZATION_ID, name: "ChronoLens Pilot" }
    });
    const user = await this.prisma.user.upsert({
      where: { email: PILOT_EMAIL },
      update: {},
      create: {
        email: PILOT_EMAIL,
        name: "Pilot Analyst",
        passwordHash: this.hashPassword(PILOT_PASSWORD)
      }
    });
    await this.prisma.membership.upsert({
      where: { organizationId_userId: { organizationId: PILOT_ORGANIZATION_ID, userId: user.id } },
      update: {},
      create: { organizationId: PILOT_ORGANIZATION_ID, userId: user.id, role: OrganizationRole.OWNER }
    });
    await this.tenant.ensure({ organizationId: PILOT_ORGANIZATION_ID, actorId: user.id, role: OrganizationRole.OWNER });
  }

  async login(email: string, password: string) {
    await this.ensurePilotAccount();
    await this.prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { memberships: { include: { organization: true } } }
    });
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      throw new HttpException("Account temporarily locked", HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!user || !this.verifyPassword(password, user.passwordHash)) {
      if (user) {
        const failedLoginAttempts = user.failedLoginAttempts + 1;
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts,
            lockedUntil: failedLoginAttempts >= MAX_FAILED_LOGINS
              ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
              : null
          }
        });
      }
      throw new UnauthorizedException("Invalid credentials");
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null }
    });
    const token = randomBytes(32).toString("hex");
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
    return {
      token,
      expiresAt: session.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        mustChangePassword: user.mustChangePassword,
        memberships: user.memberships.map((membership) => ({
          organizationId: membership.organizationId,
          organizationName: membership.organization.name,
          role: membership.role
        }))
      }
    };
  }

  async context(authorization?: string, organizationId?: string): Promise<RequestContext> {
    const session = await this.sessionFromAuthorization(authorization);
    if (session.user.mustChangePassword) throw new ForbiddenException("Password change required");
    const targetOrganization = organizationId?.trim() || PILOT_ORGANIZATION_ID;
    const membership = session.user.memberships.find((item) => item.organizationId === targetOrganization);
    if (!membership) throw new UnauthorizedException("Organization access denied");
    return { organizationId: targetOrganization, actorId: session.userId, role: membership.role };
  }

  private async sessionFromAuthorization(authorization?: string) {
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) throw new UnauthorizedException("Missing bearer token");
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: { include: { memberships: true } } }
    });
    if (!session || session.expiresAt <= new Date()) throw new UnauthorizedException("Session expired");
    return session;
  }

  async logout(authorization?: string) {
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) throw new UnauthorizedException("Missing bearer token");
    await this.prisma.session.deleteMany({ where: { tokenHash: this.hashToken(token) } });
    return { loggedOut: true };
  }

  private assertOwner(context: RequestContext) {
    if (context.role !== OrganizationRole.OWNER) throw new ForbiddenException("Owner role required");
  }

  async listMembers(context: RequestContext) {
    this.assertOwner(context);
    return this.prisma.membership.findMany({
      where: { organizationId: context.organizationId },
      include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
      orderBy: { createdAt: "asc" }
    });
  }

  async createMember(context: RequestContext, input: { email: string; name: string; password: string; role: OrganizationRole }) {
    this.assertOwner(context);
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException("User email already exists");
    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name,
        passwordHash: this.hashPassword(input.password),
        mustChangePassword: true,
        memberships: { create: { organizationId: context.organizationId, role: input.role } }
      },
      select: { id: true, name: true, email: true, createdAt: true }
    });
    return { user, role: input.role };
  }

  async updateMemberRole(context: RequestContext, membershipId: string, role: OrganizationRole) {
    this.assertOwner(context);
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId: context.organizationId }
    });
    if (!membership) throw new NotFoundException("Membership not found");
    if (membership.userId === context.actorId && role !== OrganizationRole.OWNER) {
      throw new ForbiddenException("Owners cannot remove their own owner role");
    }
    return this.prisma.membership.update({ where: { id: membershipId }, data: { role } });
  }

  async purgeExpiredSessions(context: RequestContext) {
    this.assertOwner(context);
    const result = await this.prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    await this.audit.record(context, {
      action: AuditAction.SESSIONS_EXPIRED_PURGED,
      resourceType: "Session",
      details: { deleted: result.count }
    });
    return { deleted: result.count };
  }

  async me(authorization?: string, organizationId?: string) {
    const session = await this.sessionFromAuthorization(authorization);
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      include: { memberships: { include: { organization: true } } }
    });
    return {
      user: {
        id: user?.id,
        email: user?.email,
        name: user?.name,
        mustChangePassword: user?.mustChangePassword ?? false,
        memberships: user?.memberships.map((membership) => ({
          organizationId: membership.organizationId,
          organizationName: membership.organization.name,
          role: membership.role
        })) ?? []
      },
      context: {
        organizationId: organizationId?.trim() || PILOT_ORGANIZATION_ID,
        actorId: session.userId,
        role: user?.memberships.find((item) => item.organizationId === (organizationId?.trim() || PILOT_ORGANIZATION_ID))?.role
      }
    };
  }

  async changePassword(authorization: string | undefined, currentPassword: string, newPassword: string) {
    const session = await this.sessionFromAuthorization(authorization);
    if (!this.verifyPassword(currentPassword, session.user.passwordHash)) {
      throw new UnauthorizedException("Current password is invalid");
    }
    if (currentPassword === newPassword) throw new ConflictException("New password must be different");
    await this.prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash: this.hashPassword(newPassword), mustChangePassword: false }
    });
    await this.prisma.session.deleteMany({ where: { userId: session.userId, id: { not: session.id } } });
    return { passwordChanged: true };
  }
}
