import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-zinc-800 bg-[#070709] text-zinc-500 text-xs py-6 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="font-bold text-zinc-200 uppercase tracking-wider">UFC_CTF</span>
          <span className="text-zinc-700">&middot;</span>
          <span>USAR FOSS Club</span>
        </div>

        <div className="flex items-center gap-5 text-zinc-400 text-xs">
          <Link to="/challenges" className="hover:text-emerald-400 transition-colors">
            Loventia
          </Link>
          <Link to="/competition/leaderboard" className="hover:text-emerald-400 transition-colors">
            Leaderboard
          </Link>
          <Link to="/team" className="hover:text-emerald-400 transition-colors">
            Squad
          </Link>
          <a
            href="https://fossclub.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 hover:text-emerald-400 transition-colors"
          >
            fossclub.tech ↗
          </a>
        </div>
      </div>
    </footer>
  );
};
