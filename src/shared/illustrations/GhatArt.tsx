import { useId } from 'react';

// Decorative vignettes for each ghat, by kind of water body (lake ghat, kund or
// dam). Illustrative only: not photographs and not site-accurate drawings.

export type GhatKind = 'lake' | 'kund' | 'dam';

const SITE_ART: Record<string, { kind: GhatKind; sky: [string, string]; water: string; label: string }> = {
  bairagarh: { kind: 'kund', sky: ['#ffd7a8', '#f59e6b'], water: '#3d7ea6', label: 'Kund beside the Upper Lake' },
  khatlapura: { kind: 'lake', sky: ['#fde2b8', '#e98a68'], water: '#2f6f9a', label: 'Steps into the Lower Lake' },
  prempura: { kind: 'lake', sky: ['#cfe6f6', '#8ab8dc'], water: '#2c6e93', label: 'Ghat on the Upper Lake' },
  'kamla-park': { kind: 'kund', sky: ['#f9d3c4', '#d98a9a'], water: '#3a7598', label: 'Kund near Kamla Park, Lower Lake' },
  hathaikheda: { kind: 'dam', sky: ['#d9ecdf', '#93c2a3'], water: '#2f7b7a', label: 'Hathaikheda dam embankment' },
  malikhedi: { kind: 'kund', sky: ['#e6dcf5', '#a996d6'], water: '#3b6c9b', label: 'Malikhedi visarjan kund' },
  shahpura: { kind: 'lake', sky: ['#fde8c0', '#f2b264'], water: '#2d7395', label: 'Ghat on Shahpura Lake' },
};

export function ghatArtInfo(siteId: string) {
  return SITE_ART[siteId] ?? { kind: 'lake' as GhatKind, sky: ['#e3eef5', '#a9c6da'] as [string, string], water: '#2f6f9a', label: 'Immersion site' };
}

function Diyas({ y, xs }: { y: number; xs: number[] }) {
  return <g>{xs.map((x) => (
    <g key={x}>
      <ellipse cx={x} cy={y - 6} rx="2.2" ry="4.5" fill="#ffc443" />
      <path d={`M${x - 6} ${y - 2} Q${x} ${y + 4} ${x + 6} ${y - 2} Z`} fill="#a64a26" />
    </g>
  ))}</g>;
}

export function GhatArt({ siteId, className }: { siteId: string; className?: string }) {
  const id = useId().replace(/:/g, '');
  const art = ghatArtInfo(siteId);
  return (
    <svg className={className} viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={art.sky[0]} /><stop offset="1" stopColor={art.sky[1]} />
        </linearGradient>
        <linearGradient id={`water-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={art.water} stopOpacity="0.75" /><stop offset="1" stopColor={art.water} />
        </linearGradient>
      </defs>
      <rect width="320" height="140" fill={`url(#sky-${id})`} />
      <circle cx="250" cy="40" r="16" fill="#fff4d6" opacity="0.9" />
      <path d="M0 78 Q60 60 120 72 T240 68 T320 74 V90 H0 Z" fill="#000" opacity="0.12" />
      {art.kind === 'lake' && <LakeGhat id={id} />}
      {art.kind === 'kund' && <Kund id={id} />}
      {art.kind === 'dam' && <Dam id={id} />}
    </svg>
  );
}

function LakeGhat({ id }: { id: string }) {
  return (
    <g>
      <rect y="84" width="320" height="56" fill={`url(#water-${id})`} />
      <g stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round">
        <path d="M150 100 h40 M200 116 h50 M120 128 h30" />
      </g>
      <path d="M0 76 H96 l14 10 H124 l14 10 H150 l16 12 H170 l10 32 H0 Z" fill="#c4906d" />
      <g stroke="#6e4535" strokeOpacity="0.45" strokeWidth="1.5">
        <path d="M96 76 v10 M110 86 H0 M124 96 H0 M150 108 H0" />
      </g>
      <path d="M26 76 V44 h28 v32" fill="#9a5b45" />
      <path d="M22 44 h36 l-18 -16 z" fill="#e0763a" />
      <path d="M40 28 l12 4 l-12 4 z" fill="#ff9a2e" />
      <Diyas y={86} xs={[70, 88]} />
      <Diyas y={96} xs={[104, 118]} />
      <Diyas y={118} xs={[210, 240]} />
    </g>
  );
}

function Kund({ id }: { id: string }) {
  return (
    <g>
      <rect y="78" width="320" height="62" fill="#c99b78" />
      <path d="M40 140 L70 92 H250 L280 140 Z" fill="#a8775a" />
      <path d="M58 140 L84 100 H236 L262 140 Z" fill="#b78563" />
      <path d="M76 140 L98 108 H222 L244 140 Z" fill={`url(#water-${id})`} />
      <g stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round">
        <path d="M130 122 h30 M170 130 h26" />
      </g>
      <g fill="#7d4a3a">
        <rect x="18" y="58" width="8" height="24" /><rect x="294" y="58" width="8" height="24" />
        <path d="M14 58 h16 l-8 -10 z" fill="#e0763a" /><path d="M290 58 h16 l-8 -10 z" fill="#e0763a" />
      </g>
      <path d="M26 64 Q160 88 294 64" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="1 5" strokeLinecap="round" />
      <Diyas y={100} xs={[96, 140, 180, 224]} />
      <Diyas y={128} xs={[150, 190]} />
    </g>
  );
}

function Dam({ id }: { id: string }) {
  return (
    <g>
      <rect y="70" width="320" height="70" fill={`url(#water-${id})`} />
      <path d="M0 96 H320 V140 H0 Z" fill="#8f9a96" />
      <path d="M0 96 H320 V104 H0 Z" fill="#b8c1bd" />
      <g fill="#6f7a77">
        {[30, 90, 150, 210, 270].map((x) => <rect key={x} x={x} y="106" width="20" height="26" rx="2" />)}
      </g>
      <g stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round">
        <path d="M60 80 h40 M180 86 h50 M250 78 h30" />
      </g>
      <g stroke="#56605d" strokeWidth="2"><path d="M0 92 H320" /></g>
      {[20, 60, 100, 140, 180, 220, 260, 300].map((x) => <rect key={x} x={x} y="86" width="3" height="10" fill="#56605d" />)}
      <Diyas y={96} xs={[120, 200]} />
    </g>
  );
}
