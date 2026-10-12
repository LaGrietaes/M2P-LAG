import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HeaderHUD } from './HeaderHUD'
import type { QuotaResponse } from '../types'

describe('HeaderHUD La Grieta Nav Pill', () => {
  const guestQuota: QuotaResponse = {
    role: 'guest',
    b1t_balance: 0,
    free_download_used: false,
    max_clip_seconds: 20,
  }

  const registeredQuota: QuotaResponse = {
    role: 'registered',
    b1t_balance: 42,
    free_download_used: true,
    max_clip_seconds: null,
    name: 'CYBER_OPERATOR',
    email: 'operator@lagrieta.es',
  }

  it('renders guest pill with GUEST callsign and opens expandable drawer on click', () => {
    const onOpenLoginModal = vi.fn()
    const onOpenB1tInfo = vi.fn()

    render(
      <HeaderHUD
        quota={guestQuota}
        onOpenLoginModal={onOpenLoginModal}
        onOpenB1tInfo={onOpenB1tInfo}
      />
    )

    // Verify collapsed nav pill elements
    expect(screen.getByText('[GUEST]')).toBeInTheDocument()
    expect(screen.getByText('B!T$ [1 FREE DL]')).toBeInTheDocument()

    // Expand the pill drawer
    const pillButton = screen.getByRole('button', { expanded: false })
    fireEvent.click(pillButton)

    // Verify expanded drawer contents
    expect(screen.getByText('01 // HISTORIAL DE DESCARGAS')).toBeInTheDocument()
    expect(screen.getByText('MODO VISITANTE')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar con lagrieta/i })).toBeInTheDocument()

    // Click login button from inside expanded drawer
    fireEvent.click(screen.getByRole('button', { name: /entrar con lagrieta/i }))
    expect(onOpenLoginModal).toHaveBeenCalledTimes(1)
  })

  it('renders registered operator pill with live balance and shows operator dossier', () => {
    const onLogout = vi.fn()

    render(
      <HeaderHUD
        quota={registeredQuota}
        onOpenLoginModal={vi.fn()}
        onLogout={onLogout}
      />
    )

    // Verify operator identity in pill
    expect(screen.getByText(/CYBER_OPER/i)).toBeInTheDocument()
    expect(screen.getByText('B!T$ [42 B1T$]')).toBeInTheDocument()

    // Expand drawer
    const pillButton = screen.getByRole('button', { expanded: false })
    fireEvent.click(pillButton)

    expect(screen.getByText('OPERADOR CONECTADO')).toBeInTheDocument()
    expect(screen.getByText('CYBER_OPERATOR')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})
