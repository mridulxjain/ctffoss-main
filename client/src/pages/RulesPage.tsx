import React from 'react';
import { BookOpen, ShieldAlert, Award, Terminal, CheckCircle2 } from 'lucide-react';

export const RulesPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      <div>
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
          <BookOpen className="w-4 h-4" /> Guidelines & Integrity
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Competition Rules</h1>
        <p className="text-slate-400 text-sm mt-1">
          Please review the official regulations governing the FOSS CTF competition.
        </p>
      </div>

      <div className="space-y-6">
        {/* Flag Format Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            1. Flag Formatting
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            All flags follow the standard format:
          </p>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 text-emerald-300 font-mono text-sm inline-block">
            FOSSCTF&#123;sample_flag_contents_here&#125;
          </div>
          <p className="text-xs text-slate-400">
            Flags are case-sensitive unless explicitly stated in the challenge description. Do not remove the
            <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded mx-1">FOSSCTF&#123;&#125;</code>
            wrapper.
          </p>
        </div>

        {/* Scoring & First Blood */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            2. Scoring & Tie-Breaking
          </h2>
          <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside">
            <li>
              Challenges award points based on difficulty (e.g., 50 pts for Easy up to 500+ pts for Hard).
            </li>
            <li>
              <strong className="text-white">First Blood:</strong> The first team to capture any challenge earns
              the First Blood distinction on that challenge.
            </li>
            <li>
              <strong className="text-white">Tie-Breaker:</strong> If two teams tie on points, the team that
              achieved their latest score first is ranked higher on the leaderboard.
            </li>
            <li>
              <strong className="text-white">Hints:</strong> Hints may carry a point penalty. When unlocked,
              the penalty is deducted from your team's total points.
            </li>
          </ul>
        </div>

        {/* Prohibited Behavior */}
        <div className="glass-panel p-6 rounded-2xl border border-rose-500/20 bg-rose-950/10 space-y-3">
          <h2 className="text-base font-bold text-rose-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            3. Strict Prohibitions (Disqualification Offenses)
          </h2>
          <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside">
            <li>Attacking the competition infrastructure, scoreboard server, or network perimeter.</li>
            <li>Sharing flags, hints, or solution writeups between competing teams.</li>
            <li>Denial of Service (DoS) attacks against challenge instances or platform servers.</li>
            <li>Automated brute-forcing of flag submission endpoints using excessive rate requests.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
