import React from 'react';

interface KeycapLogoProps {
  className?: string;
  size?: number;
}

export const KeycapLogo: React.FC<KeycapLogoProps> = ({ className = '', size = 36 }) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none group/keycap ${className}`}
      style={{ width: size, height: size }}
      title="UFC FOSS CTF"
    >
      <svg
        viewBox="0 0 44 44"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible transition-transform duration-150 ease-out group-hover/keycap:scale-[1.03] group-active/keycap:translate-y-[2px]"
      >
        <defs>
          {/* Ambient floor shadow */}
          <radialGradient id="keycap-floor-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#000000" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Top dish face gradient (light from top-right) */}
          <linearGradient id="keycap-top" x1="12" y1="8" x2="32" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#323238" />
            <stop offset="45%" stopColor="#242429" />
            <stop offset="100%" stopColor="#1a1a1e" />
          </linearGradient>

          {/* Top dish inner subtle indentation */}
          <radialGradient id="keycap-dish" cx="50%" cy="45%" r="45%">
            <stop offset="0%" stopColor="#1e1e23" stopOpacity="0.9" />
            <stop offset="80%" stopColor="#28282e" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#383840" stopOpacity="0.1" />
          </radialGradient>

          {/* Left-front skirt (medium shadow side) */}
          <linearGradient id="keycap-skirt-left" x1="10" y1="14" x2="18" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1c1c20" />
            <stop offset="50%" stopColor="#141416" />
            <stop offset="100%" stopColor="#0c0c0e" />
          </linearGradient>

          {/* Right-front skirt (facing viewer/light) */}
          <linearGradient id="keycap-skirt-right" x1="22" y1="16" x2="34" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#26262c" />
            <stop offset="50%" stopColor="#1c1c20" />
            <stop offset="100%" stopColor="#101012" />
          </linearGradient>

          {/* Flag neon emerald gradient */}
          <linearGradient id="keycap-flag-grad" x1="16" y1="9" x2="27" y2="17" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="60%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Neon glow filter */}
          <filter id="keycap-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#10b981" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* 1. Floor Drop Shadow */}
        <ellipse cx="21" cy="37" rx="16" ry="5" fill="url(#keycap-floor-shadow)" />

        {/* 2. Switch base peeking at the bottom */}
        <path
          d="M 16 35 L 21 38 L 26 35 L 21 33 Z"
          fill="#064e3b"
          opacity="0.8"
        />

        {/* 3. 3D Keycap Body Group (travels on keystroke) */}
        <g className="transition-transform duration-100 ease-out group-hover/keycap:-translate-y-0.5 group-active/keycap:translate-y-1">
          {/* Left Skirt (sloping outwards & down) */}
          <path
            d="M 10 14 L 20 22 L 20 35 Q 20 36 19 36 L 7 28 Q 6 27 6.5 26 L 9.5 14.5 Q 9.8 13.8 10 14 Z"
            fill="url(#keycap-skirt-left)"
            stroke="#09090b"
            strokeWidth="0.75"
            strokeLinejoin="round"
          />

          {/* Right Skirt (sloping outwards & down) */}
          <path
            d="M 20 22 L 31.5 16 Q 32 16 32.5 16.5 L 35.5 27.5 Q 36 28.5 35 29 L 21 36 Q 20 36 20 35 Z"
            fill="url(#keycap-skirt-right)"
            stroke="#09090b"
            strokeWidth="0.75"
            strokeLinejoin="round"
          />

          {/* Center Ridge Highlight */}
          <line
            x1="20"
            y1="22"
            x2="20"
            y2="35.5"
            stroke="#3f3f46"
            strokeWidth="0.75"
            strokeOpacity="0.6"
          />

          {/* Top Dish Surface (Angled 3/4 POV) */}
          <path
            d="M 21.5 8.2 Q 22 8 22.5 8.2 L 31.5 14.8 Q 32.2 15.3 31.8 16.1 L 20.8 22.2 Q 20.2 22.5 19.6 22.1 L 10.2 15.7 Q 9.6 15.2 10.1 14.4 L 19.5 8.5 Q 20.3 8 21.5 8.2 Z"
            fill="url(#keycap-top)"
            stroke="#52525b"
            strokeWidth="0.75"
            strokeLinejoin="round"
          />

          {/* Top Dish Inset Overlay (for ergonomic keycap scoop) */}
          <path
            d="M 21.5 9.5 L 30 15.2 L 20.2 20.8 L 11.5 15 L 21.5 9.5 Z"
            fill="url(#keycap-dish)"
          />

          {/* Top Edge Specular Bevel Highlight */}
          <path
            d="M 10.5 14.5 L 20 8.5 L 31.5 15"
            fill="none"
            stroke="#71717a"
            strokeWidth="0.6"
            strokeOpacity="0.5"
          />

          {/* 4. Emerald CTF Flag Engraved on the Top Face */}
          <g filter="url(#keycap-glow)">
            {/* Flagpole */}
            <line
              x1="16.5"
              y1="19.5"
              x2="16.5"
              y2="11"
              stroke="#6ee7b7"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            {/* Flag Pole Finial Ball */}
            <circle cx="16.5" cy="10.5" r="0.8" fill="#a7f3d0" />

            {/* Fluttering Flag Cloth (angled to match top plane) */}
            <path
              d="M 16.5 11 L 25.5 13.8 L 16.5 16.5 Z"
              fill="url(#keycap-flag-grad)"
              stroke="#a7f3d0"
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
          </g>
        </g>
      </svg>
    </div>
  );
};
