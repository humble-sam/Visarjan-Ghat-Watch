// Decorative illustration of Bhopal's Upper Lake at dusk: Taj-ul-Masajid,
// the Raja Bhoj statue, a ghat with diyas and floating lamps. Artistic, not to scale.

const MINARET = 'M0 0 l6 -14 l6 14 v8 h-2 v150 h-8 v-150 h-2 z';

function Minaret({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d={MINARET} />
      <rect x="-1" y="40" width="14" height="4" />
      <rect x="-1" y="92" width="14" height="4" />
      <circle cx="6" cy="-16" r="2.2" />
    </g>
  );
}

function Diya({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`} className="hero-diya">
      <ellipse cx="0" cy="-9" rx="3.2" ry="7" fill="url(#flame)" />
      <path d="M-10 -2 Q0 8 10 -2 Z" fill="#b5542a" />
    </g>
  );
}

export function BhopalHero({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1200 360" preserveAspectRatio="xMidYMid slice"
      role="img" aria-label="Illustration of Bhopal's Upper Lake at dusk with Taj-ul-Masajid, the Raja Bhoj statue and an immersion ghat lit with diyas">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d2b53" />
          <stop offset="0.45" stopColor="#7a3e6c" />
          <stop offset="0.78" stopColor="#e9825a" />
          <stop offset="1" stopColor="#f6c37a" />
        </linearGradient>
        <linearGradient id="lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9876a" />
          <stop offset="0.25" stopColor="#6b5a85" />
          <stop offset="1" stopColor="#173a5c" />
        </linearGradient>
        <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.6" stopColor="#ffd27a" />
          <stop offset="1" stopColor="#ffb35c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="flame" cx="0.5" cy="0.7" r="0.6">
          <stop offset="0" stopColor="#fff7d1" />
          <stop offset="0.5" stopColor="#ffc443" />
          <stop offset="1" stopColor="#ff7a1a" stopOpacity="0.2" />
        </radialGradient>
        <linearGradient id="steps" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c98f6b" />
          <stop offset="1" stopColor="#6e4535" />
        </linearGradient>
      </defs>

      <rect width="1200" height="360" fill="url(#sky)" />
      <circle cx="790" cy="196" r="70" fill="url(#sun)" />
      <circle cx="790" cy="200" r="30" fill="#ffe6a6" opacity="0.95" />

      {/* Birds */}
      <g fill="none" stroke="#2b2443" strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <path d="M300 70 q8 -8 16 0 q8 -8 16 0" />
        <path d="M350 95 q6 -6 12 0 q6 -6 12 0" />
        <path d="M980 60 q7 -7 14 0 q7 -7 14 0" />
      </g>

      {/* Shyamla hills and city line */}
      <path d="M0 214 Q120 170 260 200 T520 196 T820 206 T1200 190 V240 H0 Z" fill="#5a3b62" opacity="0.65" />
      <g fill="#3f2a4d" opacity="0.85">
        <rect x="560" y="196" width="22" height="30" /><rect x="586" y="188" width="14" height="38" />
        <rect x="604" y="200" width="26" height="26" /><rect x="880" y="190" width="18" height="36" />
        <rect x="902" y="198" width="30" height="28" /><rect x="1040" y="192" width="20" height="34" />
        <rect x="1066" y="200" width="28" height="26" />
      </g>

      {/* Taj-ul-Masajid */}
      <g fill="#3a2246">
        <Minaret x={150} y={82} scale={1} />
        <Minaret x={392} y={82} scale={1} />
        <rect x="174" y="168" width="208" height="62" />
        <path d="M206 168 a34 38 0 0 1 68 0 z" />
        <path d="M280 168 a40 46 0 0 1 80 0 z" transform="translate(-30 0)" />
        <path d="M318 168 a34 38 0 0 1 68 0 z" transform="translate(-30 0)" />
        <circle cx="240" cy="126" r="3" /><circle cx="290" cy="118" r="3" /><circle cx="322" cy="126" r="3" />
        <g fill="#f3b47a" opacity="0.55">
          {[188, 214, 240, 266, 292, 318, 344].map((x) => <path key={x} d={`M${x} 228 v-24 a7 7 0 0 1 14 0 v24 z`} />)}
        </g>
      </g>

      {/* Lake */}
      <rect y="226" width="1200" height="134" fill="url(#lake)" />
      <g stroke="#ffd9a0" strokeLinecap="round" opacity="0.55">
        <path d="M740 240 h100" strokeWidth="3" /><path d="M755 254 h70" strokeWidth="2.5" />
        <path d="M770 268 h40" strokeWidth="2" /><path d="M780 282 h22" strokeWidth="2" />
      </g>
      <g stroke="#ffffff" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round">
        <path d="M80 262 h60 M520 300 h90 M940 270 h70 M1050 318 h80 M420 336 h60" />
      </g>
      {/* Mosque reflection */}
      <g fill="#2a2a55" opacity="0.35" transform="translate(0 456) scale(1 -1)">
        <rect x="174" y="168" width="208" height="62" />
        <rect x="152" y="160" width="8" height="70" /><rect x="394" y="160" width="8" height="70" />
      </g>

      {/* Raja Bhoj statue on its pillar */}
      <g transform="translate(640 150)" fill="#2b2140">
        <rect x="-16" y="74" width="32" height="10" />
        <rect x="-9" y="38" width="18" height="38" />
        <rect x="-13" y="32" width="26" height="7" />
        <circle cx="0" cy="4" r="6" />
        <path d="M-7 10 h14 l3 22 h-20 z" />
        <path d="M6 14 l14 -22 l3 2 l-13 22 z" />
        <path d="M-6 14 l-8 12 l3 2 l8 -10 z" />
        <rect x="-18" y="84" width="36" height="4" fill="#20304f" />
      </g>
      <g fill="#20304f" opacity="0.4"><rect x="626" y="238" width="28" height="30" /></g>

      {/* Boats */}
      <g fill="#24314f">
        <path d="M470 262 q30 12 60 0 l-8 8 h-44 z" />
        <path d="M498 262 v-26 l14 22 z" fill="#f2e5cf" opacity="0.85" />
        <path d="M1010 290 q26 10 52 0 l-7 7 h-38 z" />
      </g>

      {/* Floating diyas */}
      {[[560, 300], [610, 318], [700, 296], [860, 314], [930, 332], [760, 340]].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <ellipse cx={x} cy={y + 4} rx="14" ry="3" fill="#ffcf73" opacity="0.25" />
          <Diya x={x} y={y} size={0.8} />
        </g>
      ))}

      {/* Ghat steps, foreground right */}
      <g>
        <path d="M1200 238 H1060 l-30 18 H1000 l-30 18 H940 l-30 18 H880 l-30 18 H820 l-40 50 H1200 Z" fill="url(#steps)" />
        <g stroke="#f0c9a0" strokeOpacity="0.45" strokeWidth="2">
          <path d="M1060 238 H1200 M1030 256 H1200 M970 274 H1200 M910 292 H1200 M850 310 H1200" />
        </g>
        <path d="M1110 238 v-46 h40 v46" fill="#7d4a3a" />
        <path d="M1104 192 h52 l-26 -22 z" fill="#e0763a" />
        <path d="M1130 170 v-20" stroke="#5c3428" strokeWidth="2" />
        <path d="M1130 150 l18 6 l-18 6 z" fill="#ff9a2e" />
        {[1070, 1100, 1140, 1180, 1010, 1046, 950, 990, 890, 930].map((x, i) => (
          <Diya key={x} x={x} y={i < 4 ? 238 : i < 6 ? 256 : i < 8 ? 274 : 292} size={0.9} />
        ))}
        {/* Marigold garland */}
        <path d="M1060 238 q70 26 140 0" fill="none" stroke="#f59e0b" strokeWidth="5" strokeDasharray="1 6" strokeLinecap="round" />
      </g>
    </svg>
  );
}
