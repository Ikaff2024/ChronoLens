import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CreateInvestigationDto, PurgeInvestigationDto, UpdateInvestigationDto } from "./investigations.dto";
import { InvestigationsService } from "./investigations.service";
import { AuthorizationHeader, OrganizationHeader, requestContext } from "../tenant/request-context";
import { AuthService } from "../auth/auth.service";
import { pagination } from "../common/pagination";

@Controller("investigations")
export class InvestigationsController {
  constructor(
    private readonly service: InvestigationsService,
    private readonly auth: AuthService
  ) {}

  @Get()
  async list(@Query("page") page: string | undefined, @Query("pageSize") pageSize: string | undefined, @AuthorizationHeader() authorization?: string, @OrganizationHeader() organizationId?: string) {
    return this.service.list(await requestContext(this.auth, authorization, organizationId), pagination(page, pageSize));
  }

  @Get("retention/due")
  async retentionDue(@AuthorizationHeader() authorization?: string, @OrganizationHeader() organizationId?: string) {
    return this.service.retentionDue(await requestContext(this.auth, authorization, organizationId));
  }

  @Get(":id")
  async get(@Param("id") id: string, @AuthorizationHeader() authorization?: string, @OrganizationHeader() organizationId?: string) {
    return this.service.get(await requestContext(this.auth, authorization, organizationId), id);
  }

  @Post()
  async create(@Body() dto: CreateInvestigationDto, @AuthorizationHeader() authorization?: string, @OrganizationHeader() organizationId?: string) {
    return this.service.create(await requestContext(this.auth, authorization, organizationId), dto);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateInvestigationDto, @AuthorizationHeader() authorization?: string, @OrganizationHeader() organizationId?: string) {
    return this.service.update(await requestContext(this.auth, authorization, organizationId), id, dto);
  }

  @Post(":id/archive")
  async archive(@Param("id") id: string, @AuthorizationHeader() authorization?: string, @OrganizationHeader() organizationId?: string) {
    return this.service.archive(await requestContext(this.auth, authorization, organizationId), id);
  }

  @Get(":id/governance")
  async governance(@Param("id") id: string, @AuthorizationHeader() authorization?: string, @OrganizationHeader() organizationId?: string) {
    return this.service.governance(await requestContext(this.auth, authorization, organizationId), id);
  }

  @Delete(":id")
  async purge(@Param("id") id: string, @Body() dto: PurgeInvestigationDto, @AuthorizationHeader() authorization?: string, @OrganizationHeader() organizationId?: string) {
    return this.service.purge(await requestContext(this.auth, authorization, organizationId), id, dto);
  }
}
