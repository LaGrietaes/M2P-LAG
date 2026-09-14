import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressRail } from './ProgressRail'

describe('ProgressRail', () => {
  it('renders all five step labels', () => {
    render(<ProgressRail current="input" />)
    expect(screen.getByText('ENTER URL')).toBeInTheDocument()
    expect(screen.getByText('PREVIEW')).toBeInTheDocument()
    expect(screen.getByText('OPTIONS')).toBeInTheDocument()
    expect(screen.getByText('PROCESSING')).toBeInTheDocument()
    expect(screen.getByText('DOWNLOAD')).toBeInTheDocument()
  })

  it('marks the step matching the current view as active', () => {
    render(<ProgressRail current="extracting" />)
    expect(screen.getByText('PROCESSING')).toHaveAttribute('aria-current', 'step')
  })

  it('does not mark other steps as active', () => {
    render(<ProgressRail current="extracting" />)
    expect(screen.getByText('ENTER URL')).not.toHaveAttribute('aria-current')
  })
})