import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-zinc-800/80 bg-[#09090b] text-zinc-500 text-xs py-6 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>
          FOSS CTF Platform &middot; University FOSS Club
        </p>

        <div className="flex items-center gap-4 text-zinc-400">
          <Link to="/rules" className="hover:text-zinc-200 transition-colors">
            Competition Rules
          </Link>
          <span className="text-zinc-700">&middot;</span>
          <a
            href="https://fossclub.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-200 transition-colors"
          >
            fossclub.tech
          </a>
        </div>
      </div>
    </footer>
  );
};
