import { Controller, Get, Param, Query } from "@nestjs/common";
import { TimelineService } from "./timeline.service";
import { AuthorizationHeader, OrganizationHeader, requestContext } from "../tenant/request-context";
import { AuthService } from "../auth/auth.service";
import { pagination } from "../common/pagination";

@Controller("investigations/:id/timeline")
export class TimelineController {
  constructor(
    private readonly service: TimelineService,
    private readonly auth: AuthService
  ) {}

  @Get()
  async get(
    @Param("id") investigationId: string,
    @Query("page") page: string | undefined,
    @Query("pageSize") pageSize: string | undefined,
    @AuthorizationHeader() authorization?: string,
    @OrganizationHeader() organizationId?: string
  ) {
    const value = pagination(page, pageSize);
    const context = await requestContext(this.auth, authorization, organizationId);
    return value ? this.service.get(context, investigationId, value) : this.service.get(context, investigationId);
  }
}
