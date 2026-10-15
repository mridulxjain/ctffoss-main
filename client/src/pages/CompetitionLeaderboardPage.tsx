import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../lib/api';
import type {
  CompetitionLeaderboardResponse,
} from '@fossctf/shared';
import { useAuth } from '../context/AuthContext';
import {
  Timer,
  Search,
  RefreshCw,
  AlertCircle,
  Users,
} from 'lucide-react';

export const CompetitionLeaderboardPage: React.FC = () => {
  const { team: currentTeam } = useAuth();
  const [data, setData] = useState<CompetitionLeaderboardResponse | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<CompetitionLeaderboardResponse>('/competition/leaderboard');
      setData(res);
    } catch (err: any) {
      console.error('Failed to load competition leaderboard:', err);
      setError(
        err instanceof ApiError ? err.message : 'Failed to load timed competition leaderboard.'
      );
    } finally {
      setLoading(false);
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Cyber Tracker & Stickers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-zinc-800 pb-4">
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 uppercase tracking-widest">
          <span className="text-emerald-400 font-bold">&gt;_ LEADERBOARD</span>
          <span className="text-zinc-600">//</span>
          <span>§ 02 &middot; SQUAD RANKINGS</span>
          <span className="text-zinc-600">//</span>
          <span className="text-amber-400 font-bold">SYNCHRONIZED TIMING</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="sticker-tape bg-amber-400 text-black border border-black shadow-[2px_2px_0px_#000]">
            FIRST BLOOD // SPEED RECORD
          </div>
          <div className="sticker-tape-right bg-emerald-400 text-black border border-black shadow-[2px_2px_0px_#000]">
            VERIFIED CLOCKS
          </div>
        </div>
      </div>

      {/* Main Header & Description */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-zinc-100 uppercase">
            Official Standings
          </h1>
          <p className="text-xs sm:text-sm font-mono text-zinc-400 max-w-2xl leading-relaxed">
            Rankings for Operation: Loventia. Squads are ranked strictly by verified elapsed time
            from the synchronized competition launch signal.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLeaderboard}
          disabled={loading}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border-2 border-zinc-700 font-mono text-xs font-bold uppercase transition-all shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-2 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary KPI Badges */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="border-2 border-zinc-800 bg-zinc-950 p-4 space-y-1 shadow-[3px_3px_0px_#18181b]">
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between font-bold">
              <span>Total Squads</span>
              <Users className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-zinc-100">
              {data.totalTeams}
            </div>
          </div>
          <div className="border-2 border-emerald-500/50 bg-emerald-950/20 p-4 space-y-1 shadow-[3px_3px_0px_#064e3b]">
            <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none" />
              <span>Flag Captured</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
              {data.completedCount}
            </div>
          </div>
          <div className="border-2 border-amber-500/50 bg-amber-950/20 p-4 space-y-1 shadow-[3px_3px_0px_#78350f]">
            <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>In Flight</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-400">
              {data.inProgressCount}
            </div>
          </div>
          <div className="border-2 border-zinc-800 bg-zinc-950 p-4 space-y-1 shadow-[3px_3px_0px_#18181b]">
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              <span>Staging</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-zinc-400">
              {data.notStartedCount}
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="border-2 border-rose-500 bg-rose-950/40 p-4 font-mono text-xs text-rose-300 flex items-center justify-between gap-3 shadow-[3px_3px_0px_#f43f5e]">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchLeaderboard}
            className="px-3 py-1 bg-rose-900/60 hover:bg-rose-900 text-rose-200 text-xs font-mono font-bold uppercase border border-rose-400 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search Bar */}
      {!loading && leaderboard.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search squad name..."
              className="w-full pl-8 pr-3 py-2 bg-zinc-950 border-2 border-zinc-800 font-mono text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 shadow-[2px_2px_0px_#000] transition-colors"
            />
          </div>

          <div className="text-xs text-zinc-400 font-mono font-bold uppercase tracking-wider">
            {leaderboard.length} squads competing
          </div>
        </div>
      )}

      {/* Leaderboard Table (3 Columns: Rank, Squad, Time Taken) */}
      {loading ? (
        <div className="py-20 text-center text-xs font-mono text-zinc-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Loading synchronized telemetry...</span>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="border-2 border-zinc-800 bg-zinc-950 p-12 text-center space-y-2 shadow-[4px_4px_0px_#000]">
          <Timer className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="font-mono text-sm font-bold text-zinc-300 uppercase">No competition squads found</p>
          <p className="text-xs font-mono text-zinc-500 max-w-sm mx-auto">
            Eligible teams will automatically appear on the board once competition attempts begin.
          </p>
        </div>
      ) : (
        <div className="border-2 border-zinc-800 bg-zinc-950 shadow-[4px_4px_0px_#000] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-zinc-900 border-b-2 border-zinc-800 text-zinc-300 uppercase text-[11px] font-bold">
                <tr>
                  <th className="px-4 py-3.5 w-20 text-center">Rank</th>
                  <th className="px-4 py-3.5">Squad</th>
                  <th className="px-4 py-3.5 text-right w-48">Time Taken</th>
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

                    return (
                      <tr
                        key={entry.teamId}
                        className={`transition-colors hover:bg-zinc-900/60 ${
                          isCurrentTeam ? 'bg-emerald-950/20' : ''
                        }`}
                      >
                        {/* Rank Column */}
                        <td className="px-4 py-3.5 text-center">
                          {entry.status === 'COMPLETED' ? (
                            entry.rank === 1 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 bg-amber-400 text-black font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000]">
                                1
                              </span>
                            ) : entry.rank === 2 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 bg-zinc-200 text-black font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000]">
                                2
                              </span>
                            ) : entry.rank === 3 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 bg-amber-600 text-white font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000]">
                                3
                              </span>
                            ) : (
                              <span className="text-zinc-300 font-black text-sm">#{entry.rank}</span>
                            )
                          ) : (
                            <span className="text-zinc-600 font-bold">#{entry.rank}</span>
                          )}
                        </td>

                        {/* Squad Name Column */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold sm:text-sm tracking-tight ${
                                isCurrentTeam ? 'text-emerald-400' : 'text-zinc-100'
                              }`}
                            >
                              {entry.teamName}
                            </span>
                            {isCurrentTeam && (
                              <span className="text-[10px] px-2 py-0.5 bg-emerald-400 text-black font-black uppercase border border-black shadow-[1px_1px_0px_#000]">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Time Taken Column (duration, "In Progress", or "—") */}
                        <td className="px-4 py-3.5 text-right font-mono">
                          {entry.status === 'COMPLETED' ? (
                            <span className="text-emerald-400 font-bold text-sm sm:text-base">
                              {entry.formattedDuration || '00:00'}
                            </span>
                          ) : entry.status === 'IN_PROGRESS' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-400/10 text-amber-400 border border-amber-500/30 font-semibold text-xs rounded">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse motion-reduce:animate-none" />
                              <span>In Progress</span>
                            </span>
                          ) : (
                            <span className="text-zinc-600 text-xs font-bold">—</span>
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
