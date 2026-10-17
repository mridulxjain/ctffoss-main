import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Ascii } from 'ascii.rest/react';
import { cloudSea } from 'ascii.rest/pieces';

export const Footer: React.FC = () => {
  return (
    <footer className="relative w-full border-t-2 border-black bg-[#0e0e0f] overflow-hidden mt-auto select-none">
      {/* Full-width animated ASCII cloudSea container */}
      <div className="relative w-full h-44 sm:h-52 overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 w-full h-full flex items-center justify-center opacity-85 pointer-events-none">
          <Ascii
            piece={cloudSea}
            className="w-full h-full block object-cover"
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* Subtle gradient vignette to blend top and bottom cleanly */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/75 pointer-events-none" />

        {/* Content positioned directly over the ASCII art */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 h-full">
          {/* UFC Logo on the ASCII art */}
          <div className="flex items-center gap-3">
            <img
              src="/ufc_logo.png"
              alt="USAR FOSS Club"
              className="h-16 sm:h-20 w-auto object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]"
            />
          </div>

          {/* fossclub.tech link */}
          <a
            href="https://fossclub.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-[#ffd000] hover:bg-[#ffe040] text-black border-2 border-black font-mono font-black uppercase text-xs tracking-wider transition-all shadow-[3px_3px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] inline-flex items-center gap-2 shrink-0 select-none"
          >
            <span>fossclub.tech</span>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
          </a>
        </div>
      </div>
    </footer>
  );
};
