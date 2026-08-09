import { describe, it, expect, beforeEach } from 'vitest'
import { getGuestToken } from './guestToken'

describe('getGuestToken', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('generates a token on first call and persists it', () => {
    const token = getGuestToken()
    expect(token).toBeTruthy()
    expect(localStorage.getItem('m2p-guest-token')).toBe(token)
  })

  it('returns the same token on subsequent calls', () => {
    const first = getGuestToken()
    const second = getGuestToken()
    expect(second).toBe(first)
  })

  it('generates a different token after localStorage is cleared', () => {
    const first = getGuestToken()
    localStorage.clear()
    const second = getGuestToken()
    expect(second).not.toBe(first)
  })
})
