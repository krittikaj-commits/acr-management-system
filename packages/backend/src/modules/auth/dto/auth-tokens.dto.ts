/**
 * AuthTokensDto — Response payload after successful login or token refresh.
 */
export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
