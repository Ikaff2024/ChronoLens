import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { AuthorizationHeader, OrganizationHeader, requestContext } from "../tenant/request-context";
import { AuthService } from "./auth.service";
import { CreateMemberDto, UpdateMemberRoleDto } from "./auth.dto";

@Controller("members")
export class MembersController {
  constructor(private readonly service: AuthService) {}

  @Get()
  async list(@AuthorizationHeader() authorization?: string, @OrganizationHeader() organizationId?: string) {
    return this.service.listMembers(await requestContext(this.service, authorization, organizationId));
  }

  @Post()
  async create(
    @Body() dto: CreateMemberDto,
    @AuthorizationHeader() authorization?: string,
    @OrganizationHeader() organizationId?: string
  ) {
    return this.service.createMember(await requestContext(this.service, authorization, organizationId), dto);
  }

  @Patch(":id/role")
  async updateRole(
    @Param("id") membershipId: string,
    @Body() dto: UpdateMemberRoleDto,
    @AuthorizationHeader() authorization?: string,
    @OrganizationHeader() organizationId?: string
  ) {
    return this.service.updateMemberRole(await requestContext(this.service, authorization, organizationId), membershipId, dto.role);
  }
}
