import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../lib/api';
import type {
  CompetitionLeaderboardEntryDTO,
  CompetitionLeaderboardResponse,
} from '@fossctf/shared';
import { useAuth } from '../context/AuthContext';
import {
  Trophy,
  Timer,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  MinusCircle,
  AlertCircle,
  Zap,
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
    const interval = setInterval(fetchLeaderboard, 8000);
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
          <p className="text-sm font-mono text-zinc-400 max-w-2xl">
            Rankings for Operation: Loventia. Squads are ranked strictly by verified elapsed time
            from the synchronized competition launch signal.
          </p>
        </div>

        <button
          onClick={fetchLeaderboard}
          disabled={loading}
          className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-2 border-zinc-700 font-mono text-xs font-bold uppercase transition-all flex items-center gap-2 shadow-[2px_2px_0px_#000] shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary KPI Badges (Brutalist style) */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="tech-corner-box border-2 border-zinc-800 bg-zinc-950 p-4 space-y-1 shadow-[3px_3px_0px_#27272a]">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              Total Squads
            </div>
            <div className="text-2xl font-black font-mono text-zinc-100">
              {data.totalTeams}
            </div>
          </div>
          <div className="tech-corner-box border-2 border-emerald-500 bg-zinc-950 p-4 space-y-1 shadow-[3px_3px_0px_#10b981]">
            <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Flag Captured</span>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400">
              {data.completedCount}
            </div>
          </div>
          <div className="tech-corner-box border-2 border-amber-500 bg-zinc-950 p-4 space-y-1 shadow-[3px_3px_0px_#f59e0b]">
            <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>In Flight</span>
            </div>
            <div className="text-2xl font-black font-mono text-amber-400">
              {data.inProgressCount}
            </div>
          </div>
          <div className="tech-corner-box border-2 border-zinc-800 bg-zinc-950 p-4 space-y-1 shadow-[3px_3px_0px_#27272a]">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
              <span>Staging</span>
            </div>
            <div className="text-2xl font-black font-mono text-zinc-400">
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
            onClick={fetchLeaderboard}
            className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-900 text-rose-200 text-xs font-mono font-bold"
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
              className="w-full pl-8 pr-3 py-2 bg-zinc-900 border-2 border-zinc-800 font-mono text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="text-xs text-zinc-500 font-mono">
            {leaderboard.length} squads competing
          </div>
        </div>
      )}

      {/* Leaderboard Table (Neo-brutalist) */}
      {loading ? (
        <div className="py-20 text-center text-xs font-mono text-zinc-500">
          Loading synchronized telemetry...
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="border-2 border-zinc-800 bg-zinc-950 p-12 text-center space-y-2 shadow-[4px_4px_0px_#27272a]">
          <Timer className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="font-mono text-sm font-bold text-zinc-300">No competition squads found</p>
          <p className="text-xs font-mono text-zinc-500 max-w-sm mx-auto">
            Eligible teams will automatically appear on the board once competition attempts begin.
          </p>
        </div>
      ) : (
        <div className="border-2 border-zinc-800 bg-zinc-950 shadow-[5px_5px_0px_#27272a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-zinc-900 border-b-2 border-zinc-800 text-zinc-400 uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3.5 w-16 text-center">Rank</th>
                  <th className="px-4 py-3.5">Squad</th>
                  <th className="px-4 py-3.5 text-center w-36">Status</th>
                  <th className="px-4 py-3.5 text-right w-44">Elapsed Duration</th>
                  <th className="px-4 py-3.5 text-right w-36 hidden sm:table-cell">Started</th>
                  <th className="px-4 py-3.5 text-right w-36 hidden md:table-cell">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
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
                              <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-400 text-black font-black text-xs border border-black shadow-[1px_1px_0px_#000]">
                                1
                              </span>
                            ) : entry.rank === 2 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 bg-zinc-300 text-black font-black text-xs border border-black shadow-[1px_1px_0px_#000]">
                                2
                              </span>
                            ) : entry.rank === 3 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-700 text-white font-black text-xs border border-black shadow-[1px_1px_0px_#000]">
                                3
                              </span>
                            ) : (
                              <span className="text-zinc-400 font-bold">#{entry.rank}</span>
                            )
                          ) : (
                            <span className="text-zinc-600">#{entry.rank}</span>
                          )}
                        </td>

                        {/* Team Name Column */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold ${
                                isCurrentTeam ? 'text-emerald-400' : 'text-zinc-100'
                              }`}
                            >
                              {entry.teamName}
                            </span>
                            {isCurrentTeam && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase font-bold">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status Column */}
                        <td className="px-4 py-3.5 text-center">
                          {entry.status === 'COMPLETED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-emerald-500/40 bg-emerald-950/40 text-emerald-400 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>SOLVED</span>
                            </span>
                          ) : entry.status === 'IN_PROGRESS' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-amber-500/40 bg-amber-950/40 text-amber-400 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              <span>IN PROGRESS</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-zinc-800 bg-zinc-900 text-zinc-500 text-[10px]">
                              <span>STAGING</span>
                            </span>
                          )}
                        </td>

                        {/* Elapsed Duration Column */}
                        <td className="px-4 py-3.5 text-right font-bold text-sm">
                          {entry.status === 'COMPLETED' ? (
                            <span className="text-emerald-400">
                              {entry.formattedDuration || '00:00'}
                            </span>
                          ) : entry.status === 'IN_PROGRESS' ? (
                            <span className="text-amber-400 text-xs">
                              In Progress
                            </span>
                          ) : (
                            <span className="text-zinc-600 text-xs">—</span>
                          )}
                        </td>

                        {/* Started Time */}
                        <td className="px-4 py-3.5 text-right text-zinc-400 text-xs hidden sm:table-cell">
                          {entry.startedAt
                            ? new Date(entry.startedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })
                            : '—'}
                        </td>

                        {/* Completed Time */}
                        <td className="px-4 py-3.5 text-right text-zinc-400 text-xs hidden md:table-cell">
                          {entry.completedAt
                            ? new Date(entry.completedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })
                            : '—'}
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
