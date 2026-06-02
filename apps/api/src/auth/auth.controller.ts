import { Body, Controller, Get, Post } from "@nestjs/common";
import { AuthorizationHeader, OrganizationHeader, requestContext } from "../tenant/request-context";
import { AuthService } from "./auth.service";
import { ChangePasswordDto, LoginDto } from "./auth.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.service.login(dto.email, dto.password);
  }

  @Get("me")
  me(@AuthorizationHeader() authorization?: string, @OrganizationHeader() organizationId?: string) {
    return this.service.me(authorization, organizationId);
  }

  @Post("logout")
  logout(@AuthorizationHeader() authorization?: string) {
    return this.service.logout(authorization);
  }

  @Post("change-password")
  changePassword(@AuthorizationHeader() authorization: string | undefined, @Body() dto: ChangePasswordDto) {
    return this.service.changePassword(authorization, dto.currentPassword, dto.newPassword);
  }

  @Post("sessions/purge-expired")
  async purgeExpiredSessions(@AuthorizationHeader() authorization?: string, @OrganizationHeader() organizationId?: string) {
    return this.service.purgeExpiredSessions(await requestContext(this.service, authorization, organizationId));
  }
}
