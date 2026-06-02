import { Controller, Get, Param } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { AuthorizationHeader, OrganizationHeader, requestContext } from "../tenant/request-context";
import { AuthService } from "../auth/auth.service";

@Controller("investigations/:id/audit")
export class AuditController {
  constructor(
    private readonly service: AuditService,
    private readonly auth: AuthService
  ) {}

  @Get()
  async list(
    @Param("id") investigationId: string,
    @AuthorizationHeader() authorization?: string,
    @OrganizationHeader() organizationId?: string
  ) {
    return this.service.list(await requestContext(this.auth, authorization, organizationId), investigationId);
  }
}
