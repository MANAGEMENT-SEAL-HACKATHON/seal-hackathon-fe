/**
 * Decorative isometric cubes — from FinalRoundConfigPage.
 * Hidden on mobile by parent (do not show when isMobile).
 */
const TechDecoration = () => (
  <svg
    width="380"
    height="100%"
    viewBox="0 0 380 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      position: 'absolute',
      right: 0,
      top: 0,
      height: '100%',
      pointerEvents: 'none',
      opacity: 0.85,
      zIndex: 0,
    }}
    aria-hidden
  >
    <defs>
      <radialGradient id="coord-hero-glow" cx="80%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="coord-hero-cubeGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.45" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#coord-hero-glow)" />
    <path
      d="M 280,100 L 320,60 M 280,100 L 240,80 M 320,60 L 360,80 M 320,60 L 320,10"
      stroke="#818cf8"
      strokeOpacity="0.25"
      strokeWidth="1.5"
      strokeDasharray="3 3"
    />
    <circle cx="320" cy="60" r="4" fill="#818cf8" opacity="0.6" />
    <circle cx="240" cy="80" r="3" fill="#818cf8" opacity="0.4" />
    <g transform="translate(320, 20)">
      <polygon points="0,-8 14,-15 28,-8 14,0" fill="#a5b4fc" fillOpacity="0.65" />
      <polygon points="0,-8 14,0 14,16 0,8" fill="#818cf8" fillOpacity="0.5" />
      <polygon points="14,0 28,-8 28,8 14,16" fill="#4f46e5" fillOpacity="0.75" />
    </g>
    <g transform="translate(210, 110)">
      <polygon points="0,-6 10,-11 20,-6 10,0" fill="#a5b4fc" fillOpacity="0.55" />
      <polygon points="0,-6 10,0 10,12 0,6" fill="#818cf8" fillOpacity="0.45" />
      <polygon points="10,0 20,-6 20,6 10,12" fill="#4f46e5" fillOpacity="0.65" />
    </g>
    <g transform="translate(260, 60)">
      <polygon
        points="30,-10 65,-30 100,-10 100,30 65,50 30,30"
        stroke="#818cf8"
        strokeWidth="1.5"
        strokeOpacity="0.35"
        fill="none"
      />
      <polygon points="35,-4 65,-20 95,-4 65,12" fill="#e0e7ff" fillOpacity="0.8" />
      <polygon points="35,-4 65,12 65,42 35,26" fill="url(#coord-hero-cubeGrad)" />
      <polygon points="65,12 95,-4 95,26 65,42" fill="#4f46e5" fillOpacity="0.9" />
      <circle cx="65" cy="12" r="10" fill="#818cf8" opacity="0.6" style={{ filter: 'blur(4px)' }} />
    </g>
    <g transform="translate(330, 115)" stroke="#818cf8" strokeOpacity="0.35" strokeWidth="1.5" fill="none">
      <circle cx="15" cy="15" r="8" />
      <path d="M15,2 L15,5 M15,25 L15,28 M2,15 L5,15 M25,15 L28,15 M6,6 L8,8 M22,22 L24,24 M6,24 L8,22 M22,6 L24,8" />
    </g>
  </svg>
);

export default TechDecoration;
