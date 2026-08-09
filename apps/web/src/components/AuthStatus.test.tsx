import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthStatus } from './AuthStatus'
import * as api from '../lib/api'

describe('AuthStatus register button', () => {
  beforeEach(() => {
    vi.spyOn(api, 'getMe').mockResolvedValue({ role: 'guest' })
    vi.spyOn(api, 'getQuota').mockResolvedValue({
      role: 'guest',
      max_clip_seconds: 20,
      max_file_size: 50000000,
      daily_jobs_remaining: null,
      b1t_balance: 0,
      free_download_used: false,
    })
  })

  it('disables the register link when VITE_LAGRIETA_AUTH_URL is unset', async () => {
    render(<AuthStatus />)
    const link = await screen.findByRole('link', { name: /sign in with lagrieta/i })
    expect(link).toHaveAttribute('aria-disabled', 'true')
  })
})
