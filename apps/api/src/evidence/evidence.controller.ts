import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { CreateEvidenceDto } from "./evidence.dto";
import { EvidenceService } from "./evidence.service";
import { AuthorizationHeader, OrganizationHeader, requestContext } from "../tenant/request-context";
import { AuthService } from "../auth/auth.service";
import { pagination } from "../common/pagination";

@Controller("evidence")
export class EvidenceController {
  constructor(
    private readonly service: EvidenceService,
    private readonly auth: AuthService
  ) {}

  @Post()
  async create(@Body() dto: CreateEvidenceDto, @AuthorizationHeader() authorization?: string, @OrganizationHeader() organizationId?: string) {
    return this.service.create(await requestContext(this.auth, authorization, organizationId), dto);
  }

  @Post("backfill")
  async backfill(@Query("investigationId") investigationId: string | undefined, @AuthorizationHeader() authorization?: string, @OrganizationHeader() organizationId?: string) {
    return this.service.backfill(await requestContext(this.auth, authorization, organizationId), investigationId);
  }

  @Get()
  async list(@Query("investigationId") investigationId: string, @Query("page") page: string | undefined, @Query("pageSize") pageSize: string | undefined, @AuthorizationHeader() authorization?: string, @OrganizationHeader() organizationId?: string) {
    return this.service.list(await requestContext(this.auth, authorization, organizationId), investigationId, pagination(page, pageSize));
  }

  @Get(":id/verify")
  async verify(@Param("id") id: string, @AuthorizationHeader() authorization?: string, @OrganizationHeader() organizationId?: string) {
    return this.service.verify(await requestContext(this.auth, authorization, organizationId), id);
  }
}
