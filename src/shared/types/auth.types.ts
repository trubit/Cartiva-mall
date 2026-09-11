export type UserRole = 'user' | 'seller' | 'admin'

export type OtpPurpose =
  | 'EMAIL_VERIFICATION'
  | 'PASSWORD_RESET'
  | 'CHANGE_EMAIL'
  | 'MFA'
  | 'SECURITY_CONFIRMATION'

export interface TokenPayload {
  userId: string
  email: string
  role: UserRole
  permissions?: string[]
  iat?: number
  exp?: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  firstName: string
  lastName: string
  username: string
  email: string
  password: string
  phoneNumber?: string
  role?: UserRole
}

export interface VerifyEmailOtpCredentials {
  email: string
  otp: string
}

export interface ResetPasswordOtpCredentials {
  email: string
  otp: string
  password: string
  confirmPassword: string
}

export interface ResendOtpCredentials {
  email: string
  purpose?: OtpPurpose
}
