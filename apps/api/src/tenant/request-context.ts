import { Headers } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";

export function requestContext(auth: AuthService, authorization?: string, organizationId?: string) {
  return auth.context(authorization, organizationId);
}

export const OrganizationHeader = () => Headers("x-organization-id");
export const AuthorizationHeader = () => Headers("authorization");
