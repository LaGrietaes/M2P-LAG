import type { SVGProps } from 'react'

/**
 * M2P logo — geometric diamond/arrow with central downward triangle (§26).
 *
 * Colors: red diamond (#a00000), white inner polygon, charcoal outer frame.
 * Source: M2P Brand/Logos/SVG/Asset 2.svg
 */
export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 345.34 323.17"
      className={className}
      {...props}
    >
      {/* Red diamond/arrow */}
      <path
        fill="#a00000"
        d="M274.91,161.58L172.62,28.49,61.3,161.58l111.33,126.22,102.28-126.22Z"
      />
      {/* Inner arrow (red, with red stroke) */}
      <path
        fill="#a00000"
        stroke="#a00000"
        strokeWidth="1"
        d="M131.23,133.97l41.39,71.7,41.39-71.7h-82.78Z"
      />
      {/* Outer charcoal frame */}
      <polygon
        fill="#bfbfbf"
        points="314.55 161.58 196.68 304.8 188.01 294.28 297.4 161.58 266.61 161.58 172.69 275.7 78.62 161.58 48.04 161.58 157.33 294.37 148.74 304.8 30.68 161.58 .1 161.58 133.09 323.17 133.63 323.17 163.88 323.17 164.2 323.17 172.62 312.95 181.03 323.17 181.56 323.17 211.82 323.17 212.14 323.17 345.34 161.58 314.55 161.58"
      />
      {/* Inner white polygon */}
      <polygon
        fill="#fff"
        points="314.45 161.58 196.58 18.37 187.91 28.88 297.3 161.58 266.51 161.58 172.59 47.47 78.51 161.58 47.94 161.58 157.22 28.8 148.64 18.37 30.57 161.58 0 161.58 132.99 0 133.52 0 163.78 0 164.1 0 172.52 10.22 180.93 0 181.46 0 211.72 0 212.04 0 345.24 161.58 314.45 161.58"
      />
    </svg>
  )
}
