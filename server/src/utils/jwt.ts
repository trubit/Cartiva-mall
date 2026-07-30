import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import type { TokenPayload, AuthTokens } from '../../../src/shared/types/auth.types.js'

export const signAccessToken = (payload: Omit<TokenPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    algorithm: 'HS256',
  } as jwt.SignOptions)

export const signRefreshToken = (payload: Omit<TokenPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    algorithm: 'HS256',
  } as jwt.SignOptions)

export const verifyAccessToken = (token: string): TokenPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as TokenPayload

export const verifyRefreshToken = (token: string): TokenPayload =>
  jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] }) as TokenPayload

export const generateTokenPair = (payload: Omit<TokenPayload, 'iat' | 'exp'>): AuthTokens => ({
  accessToken: signAccessToken(payload),
  refreshToken: signRefreshToken(payload),
})
