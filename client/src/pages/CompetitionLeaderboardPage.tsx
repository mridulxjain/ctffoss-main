import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../lib/api';
import type { CompetitionLeaderboardDTO } from '@fossctf/shared';
import { useAuth } from '../context/AuthContext';
import {
  Timer,
  Crown,
  Medal,
  Award,
  RefreshCw,
  Search,
  AlertCircle,
  Zap,
} from 'lucide-react';

export const CompetitionLeaderboardPage: React.FC = () => {
  const { team: currentTeam } = useAuth();
  const [data, setData] = useState<CompetitionLeaderboardDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchLeaderboard = async () => {
    try {
      setError(null);
      const res = await api.get('/competition/leaderboard');
      setData(res);
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to load timed competition leaderboard.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await fetchLeaderboard();
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 650);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 20000);
    return () => clearInterval(interval);
  }, []);

  const leaderboard = data?.leaderboard || [];
  const filtered = leaderboard.filter((entry) =>
    entry.teamName.toLowerCase().includes(search.toLowerCase())
  );

  // Solved podium slots (only assigned when flags are verified)
  const top1 = leaderboard.find((e) => e.rank === 1 && e.status === 'COMPLETED');
  const top2 = leaderboard.find((e) => e.rank === 2 && e.status === 'COMPLETED');
  const top3 = leaderboard.find((e) => e.rank === 3 && e.status === 'COMPLETED');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-7">
      {/* Top Cyber Tracker & Stickers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 uppercase tracking-widest">
          <span className="text-emerald-400 font-bold">&gt;_ LEADERBOARD</span>
          <span className="text-zinc-600">//</span>
          <span>§ 02 &middot; SQUAD RANKINGS</span>
          <span className="text-zinc-600">//</span>
          <span className="text-zinc-300 font-semibold">SYNCHRONIZED TIMING</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="sticker-tape bg-[#fef08a] text-zinc-950">
            FIRST BLOOD
          </div>
          <div className="sticker-tape-right bg-[#a7f3d0] text-zinc-950">
            VERIFIED CLOCKS
          </div>
        </div>
      </div>

      {/* Main Header & Description */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-zinc-100 uppercase">
            Official Standings
          </h1>
          <p className="text-xs sm:text-sm font-mono text-zinc-400 max-w-2xl leading-relaxed">
            Rankings for Operation: Loventia. Squads are ranked strictly by verified elapsed time from the synchronized competition launch signal.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading || isManualRefreshing}
          className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-2 border-black font-mono text-xs font-bold uppercase transition-all shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-2 shrink-0 select-none disabled:opacity-80"
          title="Refresh leaderboard standings"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading || isManualRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="border-2 border-rose-500/80 bg-rose-950/40 p-3.5 font-mono text-xs text-rose-300 flex items-center justify-between gap-3 shadow-[3px_3px_0px_#000]">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-900 text-rose-200 text-xs font-mono font-bold uppercase border-2 border-rose-400 transition-colors shadow-[2px_2px_0px_#000]"
          >
            Retry
          </button>
        </div>
      )}

      {/* PODIUM SHOWCASE (Bright Neon Neobrutalist Spotlight Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        {/* #2 Runner-Up Podium Card (Silver Neon) */}
        <div
          className={`p-4 border-2 border-black shadow-[4px_4px_0px_#94a3b8] flex flex-col justify-between space-y-3 transition-all ${
            top2
              ? 'bg-gradient-to-b from-slate-200/25 via-slate-300/10 to-zinc-950 border-slate-300'
              : 'bg-gradient-to-b from-slate-400/10 to-zinc-950 border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 text-[10px] font-mono font-black uppercase bg-slate-200 text-black border border-black shadow-[1px_1px_0px_#000] flex items-center gap-1">
              <Medal className="w-3.5 h-3.5 stroke-black" />
              <span>#2 RUNNER-UP</span>
            </span>
            <Medal className="w-5 h-5 text-slate-300" />
          </div>
          {top2 ? (
            <div className="space-y-2">
              <div className="font-mono font-black text-base text-slate-100 truncate">
                {top2.teamName}
              </div>
              <div className="flex items-center justify-between border-t border-zinc-800 pt-2 font-mono text-xs">
                <span className="text-zinc-500 font-medium">Record Time:</span>
                <span className="font-bold text-slate-200">{top2.formattedDuration}</span>
              </div>
            </div>
          ) : (
            <div className="py-2 space-y-1">
              <div className="font-mono text-xs font-bold text-slate-300">Awaiting Runner-Up</div>
              <div className="text-[11px] font-mono text-zinc-500">Solve in progress...</div>
            </div>
          )}
        </div>

        {/* #1 Champion Podium Card (Bright Neon Gold, Prominent & Elevated) */}
        <div
          className={`p-5 border-2 border-black shadow-[6px_6px_0px_#ffd000] md:-translate-y-2 flex flex-col justify-between space-y-3 transition-all ${
            top1
              ? 'bg-gradient-to-b from-[#ffd000]/25 via-amber-400/10 to-zinc-950 border-[#ffd000]'
              : 'bg-gradient-to-b from-[#ffd000]/15 to-zinc-950 border-amber-500/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 text-[11px] font-mono font-black uppercase bg-[#ffd000] text-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 fill-black stroke-black" />
              <span>#1 CHAMPION</span>
            </span>
            <Crown className="w-6 h-6 text-[#ffd000] fill-[#ffd000]" />
          </div>
          {top1 ? (
            <div className="space-y-2">
              <div className="font-mono font-black text-lg text-amber-300 truncate">
                {top1.teamName}
              </div>
              <div className="flex items-center justify-between border-t border-amber-500/30 pt-2 font-mono text-xs">
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Record Time:</span>
                </span>
                <span className="px-2 py-0.5 bg-[#ffd000] text-black font-black border border-black shadow-[1px_1px_0px_#000]">
                  {top1.formattedDuration}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-2 space-y-1">
              <div className="font-mono text-sm font-bold text-amber-300 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Awaiting Champion</span>
              </div>
              <div className="text-xs font-mono text-zinc-400">First blood pending...</div>
            </div>
          )}
        </div>

        {/* #3 Podium Card (Bronze / Neon Orange) */}
        <div
          className={`p-4 border-2 border-black shadow-[4px_4px_0px_#d97706] flex flex-col justify-between space-y-3 transition-all ${
            top3
              ? 'bg-gradient-to-b from-amber-700/25 via-amber-800/10 to-zinc-950 border-amber-600'
              : 'bg-gradient-to-b from-amber-700/10 to-zinc-950 border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 text-[10px] font-mono font-black uppercase bg-amber-600 text-white border border-black shadow-[1px_1px_0px_#000] flex items-center gap-1">
              <Award className="w-3.5 h-3.5 stroke-white" />
              <span>#3 PODIUM</span>
            </span>
            <Award className="w-5 h-5 text-amber-500" />
          </div>
          {top3 ? (
            <div className="space-y-2">
              <div className="font-mono font-black text-base text-zinc-100 truncate">
                {top3.teamName}
              </div>
              <div className="flex items-center justify-between border-t border-zinc-800 pt-2 font-mono text-xs">
                <span className="text-zinc-500 font-medium">Record Time:</span>
                <span className="font-bold text-amber-400">{top3.formattedDuration}</span>
              </div>
            </div>
          ) : (
            <div className="py-2 space-y-1">
              <div className="font-mono text-xs font-bold text-zinc-400">Awaiting 3rd Place</div>
              <div className="text-[11px] font-mono text-zinc-500">Solve in progress...</div>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar (Sharp, Rough Neobrutalist Edges) */}
      {!loading && leaderboard.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search squad name..."
              className="w-full pl-8 pr-3 py-2 bg-zinc-950 border-2 border-black font-mono text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-400 transition-colors shadow-[2px_2px_0px_#000]"
            />
          </div>

          <div className="text-xs text-zinc-400 font-mono font-black uppercase tracking-wider">
            {leaderboard.length} squads competing
          </div>
        </div>
      )}

      {/* Leaderboard Table (Not Curved, Rough 90-Degree Neobrutalist Edges) */}
      {loading ? (
        <div className="py-20 text-center text-xs font-mono text-zinc-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Loading synchronized telemetry...</span>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="border-2 border-black bg-zinc-950 p-12 text-center space-y-2 shadow-[4px_4px_0px_#000]">
          <Timer className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="font-mono text-sm font-bold text-zinc-300 uppercase">No competition squads found</p>
          <p className="text-xs font-mono text-zinc-500 max-w-sm mx-auto">
            Eligible teams will automatically appear on the board once competition attempts begin.
          </p>
        </div>
      ) : (
        <div className="border-2 border-black bg-zinc-950 shadow-[4px_4px_0px_#000] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-zinc-900 border-b-2 border-black text-zinc-300 uppercase text-[11px] font-black tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 w-20 text-center">Rank</th>
                  <th className="px-5 py-3.5">Squad</th>
                  <th className="px-5 py-3.5 text-right w-44">Time Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-zinc-800/80">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-zinc-500 font-mono">
                      No squads match your search filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((entry) => {
                    const isCurrentTeam = currentTeam?.id === entry.teamId;
                    const isSolved = entry.status === 'COMPLETED';

                    // Podium placement effects ONLY when team has completed
                    const isTop1 = isSolved && entry.rank === 1;
                    const isTop2 = isSolved && entry.rank === 2;
                    const isTop3 = isSolved && entry.rank === 3;

                    let rowStyle = 'hover:bg-zinc-900/50 transition-colors';
                    if (isTop1) {
                      rowStyle = 'bg-amber-500/[0.06] border-l-4 border-l-amber-400 hover:bg-amber-500/[0.09]';
                    } else if (isTop2) {
                      rowStyle = 'bg-zinc-400/[0.04] border-l-4 border-l-zinc-300 hover:bg-zinc-400/[0.07]';
                    } else if (isTop3) {
                      rowStyle = 'bg-amber-700/[0.04] border-l-4 border-l-amber-600 hover:bg-amber-700/[0.07]';
                    } else if (isCurrentTeam) {
                      rowStyle = 'bg-emerald-950/20 border-l-4 border-l-emerald-400';
                    }

                    return (
                      <tr key={entry.teamId} className={`${rowStyle} transition-colors`}>
                        {/* Rank Column */}
                        <td className="px-5 py-3.5 text-center">
                          {isTop1 ? (
                            <div className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-amber-400 text-black font-black text-xs border border-black shadow-[1px_1px_0px_#000]">
                              <Crown className="w-3.5 h-3.5 fill-black stroke-black shrink-0" />
                              <span>1</span>
                            </div>
                          ) : isTop2 ? (
                            <div className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-zinc-300 text-black font-black text-xs border border-black shadow-[1px_1px_0px_#000]">
                              <Medal className="w-3.5 h-3.5 stroke-black shrink-0" />
                              <span>2</span>
                            </div>
                          ) : isTop3 ? (
                            <div className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-amber-600 text-white font-black text-xs border border-black shadow-[1px_1px_0px_#000]">
                              <Award className="w-3.5 h-3.5 stroke-white shrink-0" />
                              <span>3</span>
                            </div>
                          ) : (
                            <span className="text-zinc-500 font-mono text-xs">#{entry.rank}</span>
                          )}
                        </td>

                        {/* Squad Name Column */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span
                              className={`font-bold ${
                                isTop1
                                  ? 'text-amber-300 text-sm'
                                  : isTop2
                                  ? 'text-zinc-100 text-sm'
                                  : isTop3
                                  ? 'text-amber-200 text-sm'
                                  : isCurrentTeam
                                  ? 'text-emerald-400 text-sm'
                                  : 'text-zinc-200 text-xs sm:text-sm'
                              }`}
                            >
                              {entry.teamName}
                            </span>

                            {/* Placement badges ONLY shown when flag captured */}
                            {isTop1 && (
                              <span className="text-[9px] font-mono font-black uppercase tracking-wider px-2 py-0.5 bg-amber-400 text-black border border-black shadow-[1px_1px_0px_#000]">
                                Champion
                              </span>
                            )}
                            {isTop2 && (
                              <span className="text-[9px] font-mono font-black uppercase tracking-wider px-2 py-0.5 bg-zinc-300 text-black border border-black shadow-[1px_1px_0px_#000]">
                                Runner-Up
                              </span>
                            )}
                            {isTop3 && (
                              <span className="text-[9px] font-mono font-black uppercase tracking-wider px-2 py-0.5 bg-amber-600 text-white border border-black shadow-[1px_1px_0px_#000]">
                                3rd Podium
                              </span>
                            )}
                            {isCurrentTeam && (
                              <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 bg-emerald-400 text-black border border-black shadow-[1px_1px_0px_#000]">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Time Taken Column */}
                        <td className="px-5 py-3.5 text-right font-mono">
                          {isSolved ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-black text-sm">
                              <Timer className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{entry.formattedDuration || '00:00'}</span>
                            </span>
                          ) : entry.status === 'IN_PROGRESS' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/40 text-amber-400 border border-amber-500/40 text-[11px] font-mono font-bold shadow-[1px_1px_0px_#000]">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse motion-reduce:animate-none" />
                              <span>In Flight</span>
                            </span>
                          ) : (
                            <span className="text-zinc-600 text-xs font-mono font-bold">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
