import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressRail } from './ProgressRail'

describe('ProgressRail', () => {
  it('renders all five step labels', () => {
    render(<ProgressRail current="input" />)
    expect(screen.getByText('SOURCE')).toBeInTheDocument()
    expect(screen.getByText('INSPECT')).toBeInTheDocument()
    expect(screen.getByText('CONFIGURE')).toBeInTheDocument()
    expect(screen.getByText('EXTRACT')).toBeInTheDocument()
    expect(screen.getByText('DELIVER')).toBeInTheDocument()
  })

  it('marks the step matching the current view as active', () => {
    render(<ProgressRail current="extracting" />)
    expect(screen.getByText('EXTRACT')).toHaveAttribute('aria-current', 'step')
  })

  it('does not mark other steps as active', () => {
    render(<ProgressRail current="extracting" />)
    expect(screen.getByText('SOURCE')).not.toHaveAttribute('aria-current')
  })
})