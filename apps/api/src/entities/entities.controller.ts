import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { CreateEntityDto, ImportEntitiesCsvDto } from "./entities.dto";
import { EntitiesService } from "./entities.service";
import { AuthorizationHeader, OrganizationHeader, requestContext } from "../tenant/request-context";
import { AuthService } from "../auth/auth.service";
import { pagination } from "../common/pagination";

@Controller("entities")
export class EntitiesController {
  constructor(
    private readonly service: EntitiesService,
    private readonly auth: AuthService
  ) {}

  @Post()
  async create(@Body() dto: CreateEntityDto, @AuthorizationHeader() authorization?: string, @OrganizationHeader() organizationId?: string) {
    return this.service.create(await requestContext(this.auth, authorization, organizationId), dto);
  }

  @Get()
  async list(
    @Query("investigationId") investigationId: string,
    @Query("q") query: string | undefined,
    @Query("page") page: string | undefined,
    @Query("pageSize") pageSize: string | undefined,
    @AuthorizationHeader() authorization?: string,
    @OrganizationHeader() organizationId?: string
  ) {
    return this.service.list(await requestContext(this.auth, authorization, organizationId), investigationId, query, pagination(page, pageSize));
  }

  @Post("import-csv")
  async importCsv(@Body() dto: ImportEntitiesCsvDto, @AuthorizationHeader() authorization?: string, @OrganizationHeader() organizationId?: string) {
    return this.service.importCsv(await requestContext(this.auth, authorization, organizationId), dto);
  }
}
