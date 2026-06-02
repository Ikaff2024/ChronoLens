import { Controller, Get, Param } from "@nestjs/common";
import { TimelineService } from "./timeline.service";
import { AuthorizationHeader, OrganizationHeader, requestContext } from "../tenant/request-context";
import { AuthService } from "../auth/auth.service";

@Controller("investigations/:id/timeline")
export class TimelineController {
  constructor(
    private readonly service: TimelineService,
    private readonly auth: AuthService
  ) {}

  @Get()
  async get(@Param("id") investigationId: string, @AuthorizationHeader() authorization?: string, @OrganizationHeader() organizationId?: string) {
    return this.service.get(await requestContext(this.auth, authorization, organizationId), investigationId);
  }
}
