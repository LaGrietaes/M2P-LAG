/**
 * LaGrietaFooter — persistent "Powered by LaGrieta.es" footer pill.
 */

export function LaGrietaFooter() {
  return (
    <a
      href="https://www.lagrieta.es"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Powered by LaGrieta.es"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 bg-[#040508]/90 border border-border-subtle backdrop-blur-md font-mono text-[10px] text-text-secondary tracking-[0.18em] uppercase hover:text-white hover:border-border-strong transition-colors shadow-lg"
    >
      {/* LaGrieta signal mark — minimal SVG */}
      <svg
        viewBox="0 0 24 24"
        className="w-3.5 h-3.5 shrink-0"
        fill="none"
        aria-hidden="true"
      >
        <polygon points="12,2 22,20 2,20" fill="#a00000" />
        <polygon points="12,7 18,17 6,17" fill="#040508" />
        <line x1="12" y1="9" x2="12" y2="14" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="square" />
        <rect x="11.2" y="15.2" width="1.6" height="1.6" fill="#ffffff" />
      </svg>
      <span>Powered by</span>
      <span className="text-white font-bold tracking-wider">LaGrieta.es</span>
    </a>
  );
}
