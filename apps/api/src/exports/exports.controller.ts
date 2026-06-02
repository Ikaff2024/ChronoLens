import { Controller, Get, Header, Param } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { AuthorizationHeader, OrganizationHeader, requestContext } from "../tenant/request-context";
import { ExportsService } from "./exports.service";

@Controller("investigations/:id/export")
export class ExportsController {
  constructor(
    private readonly service: ExportsService,
    private readonly auth: AuthService
  ) {}

  @Get("json")
  async json(
    @Param("id") investigationId: string,
    @AuthorizationHeader() authorization?: string,
    @OrganizationHeader() organizationId?: string
  ) {
    return this.service.bundle(await requestContext(this.auth, authorization, organizationId), investigationId);
  }

  @Get("timeline.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  async timelineCsv(
    @Param("id") investigationId: string,
    @AuthorizationHeader() authorization?: string,
    @OrganizationHeader() organizationId?: string
  ) {
    return this.service.timelineCsv(await requestContext(this.auth, authorization, organizationId), investigationId);
  }
}
