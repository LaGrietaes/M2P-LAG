import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo } from '../components/Logo'

describe('test harness smoke test', () => {
  it('renders the Logo component', () => {
    render(<Logo data-testid="logo" />)
    expect(screen.getByTestId('logo')).toBeInTheDocument()
  })
})
