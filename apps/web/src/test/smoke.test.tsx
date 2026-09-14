import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo, LogoMark, LogoFull } from '../components/Logo'

describe('test harness smoke test', () => {
  it('renders the Logo / LogoMark component', () => {
    render(<Logo data-testid="logo" />)
    expect(screen.getByTestId('logo')).toBeInTheDocument()

    render(<LogoMark data-testid="logo-mark" />)
    expect(screen.getByTestId('logo-mark')).toBeInTheDocument()
  })

  it('renders the LogoFull component', () => {
    render(<LogoFull data-testid="logo-full" />)
    expect(screen.getByTestId('logo-full')).toBeInTheDocument()
  })
})
