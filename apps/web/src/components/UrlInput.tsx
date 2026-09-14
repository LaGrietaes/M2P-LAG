import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { inspectMedia } from '../lib/api'
import type { InspectResponse } from '../types'
import { Button } from './ui/Button'

interface UrlInputProps {
  onInspectSuccess?: (data: InspectResponse) => void
}

export function UrlInput({ onInspectSuccess }: UrlInputProps) {
  const [url, setUrl] = useState('')

  const mutation = useMutation({
    mutationFn: inspectMedia,
    onSuccess: (data) => {
      onInspectSuccess?.(data)
    },
  })

  const handleInspect = () => {
    if (url.trim()) {
      mutation.mutate({ url: url.trim() })
    }
  }

  return (
    <div className="space-y-4">
      <div className="scanline-input relative">
        <input
          type="url"
          placeholder="Paste media URL here"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleInspect()}
          disabled={mutation.isPending}
          className="w-full px-4 py-3 text-lg text-text-primary bg-surface border border-border-subtle placeholder-text-secondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50 font-mono"
        />
      </div>
      <Button
        onClick={handleInspect}
        disabled={mutation.isPending || !url.trim()}
        className="w-full py-3 text-lg"
      >
        {mutation.isPending ? 'Analyzing…' : 'ANALYZE URL'}
      </Button>

      {mutation.isError && (
        <p className="text-sm text-accent-error">
          {mutation.error instanceof Error
            ? mutation.error.message
            : 'Something went wrong. Please try again.'}
        </p>
      )}
    </div>
  )
}