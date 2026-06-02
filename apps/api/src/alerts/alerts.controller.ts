import { Controller, Get, Param } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { AuthorizationHeader, OrganizationHeader, requestContext } from "../tenant/request-context";
import { AlertsService } from "./alerts.service";

@Controller("investigations/:id/alerts")
export class AlertsController {
  constructor(
    private readonly service: AlertsService,
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
