import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { CreateRelationshipDto } from "./relationships.dto";
import { RelationshipsService } from "./relationships.service";
import { AuthorizationHeader, OrganizationHeader, requestContext } from "../tenant/request-context";
import { AuthService } from "../auth/auth.service";
import { pagination } from "../common/pagination";

@Controller("relationships")
export class RelationshipsController {
  constructor(
    private readonly service: RelationshipsService,
    private readonly auth: AuthService
  ) {}

  @Get()
  async list(
    @Query("investigationId") investigationId: string,
    @Query("page") page: string | undefined,
    @Query("pageSize") pageSize: string | undefined,
    @AuthorizationHeader() authorization?: string,
    @OrganizationHeader() organizationId?: string
  ) {
    return this.service.list(await requestContext(this.auth, authorization, organizationId), investigationId, pagination(page, pageSize));
  }

  @Post()
  async create(@Body() dto: CreateRelationshipDto, @AuthorizationHeader() authorization?: string, @OrganizationHeader() organizationId?: string) {
    return this.service.create(await requestContext(this.auth, authorization, organizationId), dto);
  }
}
