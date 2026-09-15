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

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    let cleanUrl = url.trim()
    if (!cleanUrl) return

    // If user pasted a domain/path without scheme (e.g. youtu.be/xxx or youtube.com/watch?v=xxx), auto-prepend https://
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      if (cleanUrl.includes('.') && !cleanUrl.includes(' ')) {
        cleanUrl = `https://${cleanUrl}`
      }
    }

    mutation.mutate({ url: cleanUrl })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="scanline-input relative">
        <input
          type="text"
          placeholder="Paste media URL here (e.g. YouTube, Vimeo, Twitch...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={mutation.isPending}
          autoFocus
          className="w-full px-4 py-3.5 text-base sm:text-lg text-text-primary bg-surface border border-border-subtle placeholder-text-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50 font-mono tracking-tight"
        />
      </div>
      <Button
        type="submit"
        disabled={mutation.isPending || !url.trim()}
        className="w-full py-3.5 text-base sm:text-lg font-bold tracking-wider"
      >
        {mutation.isPending ? 'ANALYZING SOURCE…' : 'ANALYZE URL'}
      </Button>

      {mutation.isPending && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs font-mono text-accent-bright animate-pulse">
          <span className="inline-block w-2 h-2 bg-accent rounded-full animate-ping" />
          EXTRACTING METADATA AND SOURCE FORMATS...
        </div>
      )}

      {mutation.isError && (
        <div className="p-3.5 text-xs sm:text-sm font-mono text-accent-error bg-accent-error/10 border border-accent-error/40 space-y-1">
          <p className="font-bold uppercase tracking-wider">Analysis Failed</p>
          <p>
            {mutation.error instanceof Error
              ? mutation.error.message
              : 'Could not extract metadata from this URL. Please check the link and try again.'}
          </p>
        </div>
      )}
    </form>
  )
}