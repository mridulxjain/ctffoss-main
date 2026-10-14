import React from 'react';
import { Shield, Flag, Award, AlertTriangle, BookOpen, Terminal } from 'lucide-react';

export const RulesPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Section Indicator */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500 uppercase tracking-widest">
          <span>§ 05 &middot; Competition Protocols</span>
          <span className="text-zinc-700">&middot;</span>
          <span className="text-emerald-400 font-semibold">CODE OF CONDUCT</span>
        </div>
      </div>

      {/* Main Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Competition Guidelines & Rules
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Official competition protocols, flag submission syntax, and code of conduct for all FOSS CTF participants.
        </p>
      </div>

      <div className="space-y-4 text-xs sm:text-sm text-zinc-300">
        {/* Rule 1: Flag Format */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-zinc-100">
              1. Flag Format & Submission Protocol
            </h2>
          </div>
          <p className="text-zinc-400 leading-relaxed text-xs">
            All challenge flags adhere to standard case-sensitive casing and bracket conventions:
          </p>
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs text-emerald-400 select-all inline-block">
            FOSSCTF&#123;flag_text_here&#125;
          </div>
          <p className="text-zinc-500 text-xs">
            Submit the entire string including the prefix and outer curly braces. Flags are verified server-side with cryptographic salting.
          </p>
        </div>

        {/* Rule 2: Scoring & Tie-Breakers */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-zinc-100">
              2. Scoring, Timing & Tie-Breaking
            </h2>
          </div>
          <ul className="space-y-2 text-zinc-400 list-disc list-inside text-xs leading-relaxed">
            <li>Challenges award fixed points calibrated to task difficulty.</li>
            <li>On the Points Scoreboard, tied scores are automatically resolved by the timestamp of the earlier solve.</li>
            <li>On the Timed Competition Leaderboard (Loventia), squads are ranked strictly by verified elapsed time from the official synchronized start timestamp.</li>
            <li>Flag submissions are rate-limited to 10 submissions per 30 seconds per squad to maintain service reliability.</li>
          </ul>
        </div>

        {/* Rule 3: Prohibited Behavior */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-semibold text-zinc-100">
              3. Prohibited Behavior & Infrastructure Rules
            </h2>
          </div>
          <ul className="space-y-2 text-zinc-400 list-disc list-inside text-xs leading-relaxed">
            <li>Do not attack the CTF scoring server, admin endpoints, or infrastructure hosting the competition.</li>
            <li>Do not share flags, exploit scripts, or walkthroughs between competing teams during the active round.</li>
            <li>Do not perform automated brute-force attacks or Denial of Service (DoS/DDoS) against endpoints.</li>
            <li>Keep the competition fair, collaborative, and educational. If you discover an unintended infrastructure flaw, report it to administrators responsibly.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
