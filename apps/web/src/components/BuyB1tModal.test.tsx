import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BuyB1tModal } from './BuyB1tModal'
import * as api from '../lib/api'

describe('BuyB1tModal', () => {
  it('does not render when isOpen is false', () => {
    render(<BuyB1tModal isOpen={false} onClose={vi.fn()} onPurchased={vi.fn()} />)
    expect(screen.queryByText(/buy b1t/i)).not.toBeInTheDocument()
  })

  it('shows three package tiers when open', () => {
    render(<BuyB1tModal isOpen={true} onClose={vi.fn()} onPurchased={vi.fn()} />)
    expect(screen.getByText(/100 b1t/i)).toBeInTheDocument()
    expect(screen.getByText(/500 b1t/i)).toBeInTheDocument()
    expect(screen.getByText(/1000 b1t/i)).toBeInTheDocument()
  })

  it('calls purchaseB1t and onPurchased when a tier is confirmed', async () => {
    vi.spyOn(api, 'purchaseB1t').mockResolvedValue({
      status: 'granted',
      b1t_credited: 500,
      message: '500 B1T$ credited (dev mode).',
    })
    const onPurchased = vi.fn()
    render(<BuyB1tModal isOpen={true} onClose={vi.fn()} onPurchased={onPurchased} />)

    fireEvent.click(screen.getByRole('button', { name: /500 b1t/i }))

    await waitFor(() => expect(onPurchased).toHaveBeenCalledWith(500))
  })

  it('shows an error message when purchase is not yet available', async () => {
    vi.spyOn(api, 'purchaseB1t').mockRejectedValue(
      new Error('B1T$ purchases are not yet available.'),
    )
    render(<BuyB1tModal isOpen={true} onClose={vi.fn()} onPurchased={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /100 b1t/i }))

    expect(
      await screen.findByText(/not yet available/i),
    ).toBeInTheDocument()
  })
})
