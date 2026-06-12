/**
 * Auth-related TypeScript interfaces.
 */

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface ILoginResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    user: IUser;
  };
}

export interface IRefreshTokenRequest {
  refreshToken: string;
}

export interface IRefreshTokenResponse {
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface IForgotPasswordRequest {
  email: string;
}

export interface IForgotPasswordResponse {
  data: {
    message: string;
  };
}

export interface IResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface IResetPasswordResponse {
  data: {
    message: string;
  };
}

export interface ICurrentUserResponse {
  data: IUser;
}
