import React from 'react';
import { Flag } from 'lucide-react';

interface KeycapLogoProps {
  className?: string;
  size?: number;
  useImage?: boolean;
}

/**
 * Mechanical Keyboard Keycap Button
 * - Tactile Keycap housing with 3D mechanical travel depth
 * - Crisp inner dish with subtle specular highlight and neon emerald accent
 * - Mechanical switch press physics with smooth recovery
 */
export const KeycapLogo: React.FC<KeycapLogoProps> = ({ className = '', size = 38, useImage = false }) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none group/keycap cursor-pointer ${className}`}
      style={{ width: size, height: size }}
      title="UFC FOSS CTF (Clickable Key)"
      role="button"
      tabIndex={0}
      aria-label="UFC FOSS CTF Keycap"
    >
      {/* 1. Keycap Outer Housing with 3D Depth */}
      <div className="w-full h-full rounded-[8px] bg-gradient-to-b from-zinc-200 to-zinc-400 border-2 border-black shadow-[0_4px_0_#000] flex items-center justify-center transition-all duration-100 ease-out group-hover/keycap:-translate-y-0.5 group-hover/keycap:shadow-[0_5px_0_#000] group-hover/keycap:border-emerald-500/80 group-active/keycap:translate-y-[3px] group-active/keycap:shadow-[0_1px_0_#000] group-active/keycap:duration-75">
        {/* Specular Top Rim */}
        <div className="absolute inset-x-1 top-0.5 h-[1.5px] bg-white/60 rounded-full pointer-events-none" />

        {/* 2. Keycap Inset Dish */}
        <div className="w-[74%] h-[74%] rounded-[6px] bg-gradient-to-br from-emerald-300 via-emerald-400 to-emerald-500 border-2 border-black flex items-center justify-center shadow-[inset_1px_1px_0px_rgba(255,255,255,0.7),inset_-1px_-1px_0px_rgba(0,0,0,0.3)] overflow-hidden">
          {useImage ? (
            <img
              src="/ctf_foss_pixel_brutalist_favicon_256.png"
              alt="Logo"
              className="w-[80%] h-[80%] object-contain image-rendering-pixelated transition-transform duration-100 group-hover/keycap:scale-110"
            />
          ) : (
            <Flag className="w-[60%] h-[60%] text-zinc-950 fill-zinc-950 transition-transform duration-100 group-hover/keycap:scale-110 drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]" />
          )}
        </div>
      </div>
    </div>
  );
};
