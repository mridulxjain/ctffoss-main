import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Award,
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
  }, []);

  const leaderboard = data?.leaderboard || [];
  const filtered = leaderboard.filter((entry) =>
    entry.teamName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Tab Switcher & Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mb-3">
            <Link
              to="/scoreboard"
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Points Scoreboard</span>
            </Link>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm">
              <Timer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Timed Challenge Leaderboard</span>
            </div>
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
            <span>Timed Competition Leaderboard</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Official time-based standings for the Valenfind challenge. Teams are ranked by verified
            elapsed time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-colors disabled:opacity-60"
            title="Refresh leaderboard"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-zinc-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
              Total Teams
            </div>
            <div className="text-xl font-semibold font-mono text-zinc-100 mt-1">
              {data.totalTeams}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="text-[11px] font-mono text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Completed</span>
            </div>
            <div className="text-xl font-semibold font-mono text-emerald-400 mt-1">
              {data.completedCount}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="text-[11px] font-mono text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>In Progress</span>
            </div>
            <div className="text-xl font-semibold font-mono text-amber-400 mt-1">
              {data.inProgressCount}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
              <span>Not Started</span>
            </div>
            <div className="text-xl font-semibold font-mono text-zinc-400 mt-1">
              {data.notStartedCount}
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="rounded-md border border-rose-900/50 bg-rose-950/20 p-4 text-xs text-rose-400 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchLeaderboard}
            className="px-2.5 py-1 rounded bg-rose-900/30 hover:bg-rose-900/50 text-rose-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search Bar */}
      {!loading && leaderboard.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team name..."
              className="w-full pl-8 pr-3 py-1.5 rounded-md bg-zinc-900/70 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>

          <div className="text-xs text-zinc-500 font-mono">
            {leaderboard.length} {leaderboard.length === 1 ? 'team' : 'teams'} registered
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      {loading ? (
        <div className="py-20 text-center text-xs font-mono text-zinc-500 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-zinc-600" />
          <span>Loading timed competition standings...</span>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/20 p-12 text-center">
          <Timer className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-300">No competition teams found</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Eligible teams will automatically appear on the board once competition attempts begin.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-medium">
                <tr>
                  <th className="px-4 py-2.5 w-16 text-center">Rank</th>
                  <th className="px-4 py-2.5">Team</th>
                  <th className="px-4 py-2.5 text-center w-32">Status</th>
                  <th className="px-4 py-2.5 text-right w-36">Elapsed Time</th>
                  <th className="px-4 py-2.5 text-right w-36 hidden sm:table-cell">Started</th>
                  <th className="px-4 py-2.5 text-right w-36 hidden md:table-cell">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                      No teams match your search.
                    </td>
                  </tr>
                ) : (
                  filtered.map((entry) => {
                    const isCurrentTeam = currentTeam?.id === entry.teamId;

                    return (
                      <tr
                        key={entry.teamId}
                        className={`transition-colors hover:bg-zinc-900/80 ${
                          isCurrentTeam ? 'bg-zinc-800/40' : ''
                        }`}
                      >
                        {/* Rank Column */}
                        <td className="px-4 py-3 text-center font-mono font-medium">
                          {entry.status === 'COMPLETED' ? (
                            entry.rank === 1 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/30 text-[11px]">
                                1
                              </span>
                            ) : entry.rank === 2 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-300/10 text-zinc-300 font-bold border border-zinc-300/30 text-[11px]">
                                2
                              </span>
                            ) : entry.rank === 3 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/10 text-amber-600 font-bold border border-amber-700/30 text-[11px]">
                                3
                              </span>
                            ) : (
                              <span className="text-zinc-400">{entry.rank}</span>
                            )
                          ) : (
                            <span className="text-zinc-600">{entry.rank}</span>
                          )}
                        </td>

                        {/* Team Name Column */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium ${
                                isCurrentTeam ? 'text-emerald-400' : 'text-zinc-200'
                              }`}
                            >
                              {entry.teamName}
                            </span>
                            {isCurrentTeam && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status Column */}
                        <td className="px-4 py-3 text-center">
                          {entry.status === 'COMPLETED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Completed</span>
                            </span>
                          ) : entry.status === 'IN_PROGRESS' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock className="w-3 h-3" />
                              <span>In progress</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/40">
                              <MinusCircle className="w-3 h-3" />
                              <span>Not started</span>
                            </span>
                          )}
                        </td>

                        {/* Elapsed Time Column */}
                        <td className="px-4 py-3 text-right">
                          {entry.status === 'COMPLETED' && entry.formattedTime ? (
                            <span className="font-mono font-semibold text-emerald-400 text-sm">
                              {entry.formattedTime}
                            </span>
                          ) : (
                            <span
                              className="font-mono text-zinc-600 text-xs"
                              title={
                                entry.status === 'IN_PROGRESS'
                                  ? 'Attempt is currently running'
                                  : 'Attempt not yet started'
                              }
                            >
                              —
                            </span>
                          )}
                        </td>

                        {/* Started At Column */}
                        <td className="px-4 py-3 text-right font-mono text-[11px] text-zinc-400 hidden sm:table-cell">
                          {entry.startedAt
                            ? new Date(entry.startedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })
                            : '—'}
                        </td>

                        {/* Completed At Column */}
                        <td className="px-4 py-3 text-right font-mono text-[11px] text-zinc-400 hidden md:table-cell">
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
