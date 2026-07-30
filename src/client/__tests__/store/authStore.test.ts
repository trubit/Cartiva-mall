import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../../store/authStore.js'
import type { IUser } from '../../../shared/types/user.types.js'

const makeMockUser = (overrides = {}): IUser =>
  ({
    _id: 'user-123',
    firstName: 'Alice',
    lastName: 'Smith',
    username: 'alicesmith',
    email: 'alice@example.com',
    role: 'user',
    isActive: true,
    emailVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }) as unknown as IUser

beforeEach(() => {
  useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false })
  localStorage.clear()
})

describe('authStore — initial state', () => {
  it('starts with null user', () => {
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('starts with null accessToken', () => {
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('starts as not authenticated', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })
})

describe('authStore — setAuth', () => {
  it('sets user in state', () => {
    const user = makeMockUser()
    useAuthStore.getState().setAuth(user, 'token-abc')
    expect(useAuthStore.getState().user).toMatchObject({
      _id: 'user-123',
      email: 'alice@example.com',
    })
  })

  it('sets accessToken in state', () => {
    useAuthStore.getState().setAuth(makeMockUser(), 'token-xyz')
    expect(useAuthStore.getState().accessToken).toBe('token-xyz')
  })

  it('marks isAuthenticated as true', () => {
    useAuthStore.getState().setAuth(makeMockUser(), 'token-xyz')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('does not persist token to localStorage (XSS protection)', () => {
    useAuthStore.getState().setAuth(makeMockUser(), 'token-stored')
    expect(localStorage.getItem('accessToken')).toBeNull()
  })
})

describe('authStore — clearAuth', () => {
  it('clears user from state', () => {
    useAuthStore.getState().setAuth(makeMockUser(), 'token-abc')
    useAuthStore.getState().clearAuth()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('clears accessToken from state', () => {
    useAuthStore.getState().setAuth(makeMockUser(), 'token-abc')
    useAuthStore.getState().clearAuth()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('sets isAuthenticated to false', () => {
    useAuthStore.getState().setAuth(makeMockUser(), 'token-abc')
    useAuthStore.getState().clearAuth()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('removes token from localStorage', () => {
    useAuthStore.getState().setAuth(makeMockUser(), 'token-abc')
    useAuthStore.getState().clearAuth()
    expect(localStorage.getItem('accessToken')).toBeNull()
  })
})

describe('authStore — updateUser', () => {
  it('merges partial user data', () => {
    useAuthStore.getState().setAuth(makeMockUser(), 'token-abc')
    useAuthStore.getState().updateUser({ firstName: 'Bob' })
    expect(useAuthStore.getState().user?.firstName).toBe('Bob')
    expect(useAuthStore.getState().user?.email).toBe('alice@example.com')
  })

  it('does nothing when no user is set', () => {
    useAuthStore.getState().updateUser({ firstName: 'Ghost' })
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('preserves all other fields on partial update', () => {
    const user = makeMockUser({ role: 'admin' })
    useAuthStore.getState().setAuth(user, 'token-abc')
    useAuthStore.getState().updateUser({ firstName: 'Charlie' })
    expect(useAuthStore.getState().user?.role).toBe('admin')
    expect(useAuthStore.getState().user?.lastName).toBe('Smith')
  })
})
