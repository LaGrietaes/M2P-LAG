import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { inspectMedia } from '../lib/api'
import type { InspectResponse } from '../types'

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
      <input
        type="url"
        placeholder="Paste media URL here"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleInspect()}
        disabled={mutation.isPending}
        className="w-full px-4 py-3 text-lg text-white bg-gray-900 border border-gray-700 rounded-lg placeholder-gray-500 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red disabled:opacity-50"
      />
      <button
        onClick={handleInspect}
        disabled={mutation.isPending || !url.trim()}
        className="w-full py-3 text-lg font-medium text-white bg-brand-red rounded-lg hover:bg-brand-red-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 focus:ring-offset-gray-900"
      >
        {mutation.isPending ? 'Inspecting…' : 'INSPECT'}
      </button>

      {mutation.isError && (
        <p className="text-sm text-brand-red">
          {mutation.error instanceof Error
            ? mutation.error.message
            : 'Something went wrong. Please try again.'}
        </p>
      )}
    </div>
  )
}
