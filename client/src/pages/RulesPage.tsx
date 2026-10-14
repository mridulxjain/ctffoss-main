import React from 'react';

export const RulesPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="border-b border-zinc-800 pb-5">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
          Competition Guidelines & Rules
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          General regulations and code of conduct for participants in FOSS CTF.
        </p>
      </div>

      <div className="space-y-4 text-xs sm:text-sm text-zinc-300">
        {/* Flag Format Card */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-5 space-y-2">
          <h2 className="text-sm font-semibold text-zinc-100">
            1. Flag Format
          </h2>
          <p className="text-zinc-400 leading-relaxed">
            All challenge flags adhere to the standard casing and wrapper convention:
          </p>
          <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-xs text-emerald-400 select-all inline-block">
            FOSSCTF&#123;flag_text_here&#125;
          </div>
          <p className="text-zinc-500 text-xs">
            Submit the entire string including the prefix and braces. Flags are case-sensitive.
          </p>
        </div>

        {/* Scoring & Tie-Breaking */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-5 space-y-2">
          <h2 className="text-sm font-semibold text-zinc-100">
            2. Scoring & Tie-Breakers
          </h2>
          <ul className="space-y-1.5 text-zinc-400 list-disc list-inside">
            <li>Challenges award fixed points based on calibrated difficulty.</li>
            <li>First blood is credited to the first team to successfully solve a challenge.</li>
            <li>Tie-breaking on the scoreboard is resolved by the timestamp of the team's earlier solve.</li>
            <li>Unlocking hints may carry point deductions which are subtracted from your team total.</li>
          </ul>
        </div>

        {/* Prohibited Actions */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-5 space-y-2">
          <h2 className="text-sm font-semibold text-zinc-100">
            3. Prohibited Behavior
          </h2>
          <ul className="space-y-1.5 text-zinc-400 list-disc list-inside">
            <li>Attacking the competition platform infrastructure or scoring servers.</li>
            <li>Sharing flags, keys, or spoilers between competing teams.</li>
            <li>Denial of service (DoS) attacks or automated brute-forcing against endpoints.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
