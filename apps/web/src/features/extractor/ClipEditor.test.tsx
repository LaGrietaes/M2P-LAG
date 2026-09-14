import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClipEditor } from './ClipEditor'
import type { InspectResponse } from '../../types'

const media: InspectResponse = {
  id: 'abc',
  title: 'Test Video',
  creator: null,
  duration: 3600,
  thumbnail: 'https://example.com/thumb.jpg',
  platform: 'YouTube',
  webpage_url: 'https://example.com/v',
  upload_date: null,
  formats: [],
  subtitles: [],
}

describe('ClipEditor duration cap', () => {
  it('shows an error when selection exceeds a numeric cap', () => {
    const onExtract = vi.fn()
    render(
      <ClipEditor
        media={media}
        onExtract={onExtract}
        isExtracting={false}
        maxClipSeconds={20}
        selectedFormatId={null}
        onSelectFormat={vi.fn()}
        b1tBalance={null}
        mode="clip"
        onModeChange={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText(/^in point$/i), {
      target: { value: '00:00' },
    })
    fireEvent.change(screen.getByLabelText(/^out point$/i), {
      target: { value: '00:30' },
    })
    fireEvent.click(screen.getByRole('button', { name: /download clip/i }))

    expect(screen.getByText(/20 seconds/i)).toBeInTheDocument()
    expect(onExtract).not.toHaveBeenCalled()
  })

  it('allows any duration when maxClipSeconds is null', () => {
    const onExtract = vi.fn()
    render(
      <ClipEditor
        media={media}
        onExtract={onExtract}
        isExtracting={false}
        maxClipSeconds={null}
        selectedFormatId={null}
        onSelectFormat={vi.fn()}
        b1tBalance={null}
        mode="clip"
        onModeChange={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText(/^in point$/i), {
      target: { value: '00:00' },
    })
    fireEvent.change(screen.getByLabelText(/^out point$/i), {
      target: { value: '10:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: /download clip/i }))

    expect(screen.queryByText(/exceeds/i)).not.toBeInTheDocument()
    expect(onExtract).toHaveBeenCalledWith(0, 600)
  })

  it('does not render a video element', () => {
    render(
      <ClipEditor
        media={media}
        onExtract={vi.fn()}
        isExtracting={false}
        maxClipSeconds={20}
        selectedFormatId={null}
        onSelectFormat={vi.fn()}
        b1tBalance={null}
        mode="clip"
        onModeChange={vi.fn()}
      />,
    )
    expect(document.querySelector('video')).toBeNull()
  })
})
