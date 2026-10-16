import React from 'react';
import { Flag } from 'lucide-react';

interface KeycapLogoProps {
  className?: string;
  size?: number;
}

/**
 * Neobrutalist Mechanical Keyboard Keycap Button
 * - Primary Color: Tactile Keycap Grey (Zinc-300 / Zinc-200) for maximum visibility on black bg
 * - Secondary Color: Vivid Light Green (Emerald-400) for inner keycap dish
 * - Perfectly aligned centered CTF Flag
 * - Clickable mechanical switch press animation (travels down 3px with 4px hard shadow)
 */
export const KeycapLogo: React.FC<KeycapLogoProps> = ({ className = '', size = 38 }) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none group/keycap cursor-pointer ${className}`}
      style={{ width: size, height: size }}
      title="UFC FOSS CTF (Clickable Key)"
      role="button"
      tabIndex={0}
      aria-label="UFC FOSS CTF Keycap"
    >
      {/* 1. Neobrutalist Mechanical Keycap Body (Primary: Grey with 4px hard black shadow) */}
      <div className="w-full h-full rounded-[7px] bg-zinc-300 hover:bg-zinc-200 border-2 border-black shadow-[0_4px_0_#000] flex items-center justify-center transition-all duration-75 ease-out group-hover/keycap:-translate-y-0.5 group-hover/keycap:shadow-[0_5px_0_#000] group-active/keycap:translate-y-[3px] group-active/keycap:shadow-[0_1px_0_#000]">
        {/* 2. Keycap Inset Dish (Secondary: Light Green with crisp black border) */}
        <div className="w-[72%] h-[72%] rounded-[5px] bg-emerald-400 border-2 border-black flex items-center justify-center shadow-[inset_1px_1px_0px_rgba(255,255,255,0.7),inset_-1px_-1px_0px_rgba(0,0,0,0.2)]">
          {/* 3. Centered CTF Flag Emblem in exact alignment */}
          <Flag className="w-[62%] h-[62%] text-black fill-black transition-transform duration-75 group-hover/keycap:scale-110 drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]" />
        </div>
      </div>
    </div>
  );
};
