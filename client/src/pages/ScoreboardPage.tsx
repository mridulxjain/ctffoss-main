import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { ScoreboardEntryDTO } from '@fossctf/shared';
import { useAuth } from '../context/AuthContext';
import { Search, RefreshCw, Trophy, Timer, Award, Clock } from 'lucide-react';

export const ScoreboardPage: React.FC = () => {
  const { team: currentTeam } = useAuth();
  const [leaderboard, setLeaderboard] = useState<ScoreboardEntryDTO[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchScoreboard = async () => {
    try {
      setLoading(true);
      const data = await api.get('/scoreboard');
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      console.error('Failed to load scoreboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScoreboard();
  }, []);

  const filtered = leaderboard.filter((entry) =>
    entry.teamName.toLowerCase().includes(search.toLowerCase())
  );

  const topThree = leaderboard.slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Section Indicator */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500 uppercase tracking-widest">
          <span>§ 03 &middot; Official Standings</span>
          <span className="text-zinc-700">&middot;</span>
          <span className="text-emerald-400 font-semibold">POINTS SCOREBOARD</span>
        </div>

        {/* Tab Switcher between Scoreboard and Timed Leaderboard */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg border border-zinc-800 bg-zinc-900/60 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-800 text-zinc-100 font-medium shadow-sm">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Points Board</span>
          </div>
          <Link
            to="/competition/leaderboard"
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 transition-colors font-medium"
          >
            <Timer className="w-3.5 h-3.5 text-emerald-400" />
            <span>Timed Leaderboard</span>
          </Link>
        </div>
      </div>

      {/* Main Header & Description */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <span>Points Scoreboard</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Authoritative cumulative points standings. Ties are resolved by the timestamp of the earlier solve.
          </p>
        </div>

        <button
          onClick={fetchScoreboard}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-colors shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-zinc-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Top 3 Podium Cards (Rendered when there are solves) */}
      {!loading && topThree.length > 0 && topThree[0].totalScore > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {topThree.map((entry, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;
            const isThird = idx === 2;

            return (
              <div
                key={entry.teamId}
                className={`p-4 rounded-xl border flex flex-col justify-between space-y-2 ${
                  isFirst
                    ? 'border-amber-500/40 bg-amber-950/15'
                    : isSecond
                    ? 'border-zinc-500/30 bg-zinc-900/50'
                    : 'border-amber-800/30 bg-zinc-900/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-mono text-xs font-bold border ${
                      isFirst
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : isSecond
                        ? 'bg-zinc-400/20 text-zinc-300 border-zinc-400/40'
                        : 'bg-amber-800/20 text-amber-500 border-amber-800/40'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="font-mono text-xs text-zinc-500">
                    {entry.solvesCount} {entry.solvesCount === 1 ? 'solve' : 'solves'}
                  </span>
                </div>

                <div>
                  <div className="font-bold text-sm text-zinc-100 truncate flex items-center gap-1.5">
                    <span>{entry.teamName}</span>
                    {currentTeam?.id === entry.teamId && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-xl font-bold text-zinc-100 mt-1">
                    {entry.totalScore}{' '}
                    <span className="text-xs font-normal text-zinc-500">pts</span>
                  </div>
                </div>

                {entry.lastSolveAt && (
                  <div className="text-[11px] font-mono text-zinc-500 pt-1 border-t border-zinc-800/60 truncate">
                    Last solve: {new Date(entry.lastSolveAt).toLocaleTimeString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Search Bar & Table Header */}
      {leaderboard.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter teams..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>

          <div className="text-xs text-zinc-500 font-mono self-end sm:self-auto">
            {leaderboard.length} {leaderboard.length === 1 ? 'team' : 'teams'} registered
          </div>
        </div>
      )}

      {/* Standings Table or Empty State */}
      {loading ? (
        <div className="py-20 text-center text-xs font-mono text-zinc-500">
          Loading scoreboard standings...
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-12 text-center space-y-2">
          <Award className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-sm font-semibold text-zinc-300">No solves registered yet</p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            The points scoreboard will populate automatically as teams solve competition challenges.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-medium">
                <tr>
                  <th className="px-4 py-3 w-16 text-center font-mono">Rank</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3 text-center w-28 font-mono">Solves</th>
                  <th className="px-4 py-3 text-right w-32 font-mono">Score</th>
                  <th className="px-4 py-3 text-right w-40 font-mono">Last Solve</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 font-mono">
                      No teams match your search filter.
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
                        <td className="px-4 py-3.5 text-center font-mono font-medium">
                          {entry.rank <= 3 ? (
                            <span
                              className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-center text-[11px] font-bold ${
                                entry.rank === 1
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : entry.rank === 2
                                  ? 'bg-zinc-400/20 text-zinc-300 border border-zinc-400/40'
                                  : 'bg-amber-800/20 text-amber-500 border border-amber-800/40'
                              }`}
                            >
                              {entry.rank}
                            </span>
                          ) : (
                            <span className="text-zinc-500">{entry.rank}</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 font-medium text-zinc-200">
                          <div className="flex items-center gap-2">
                            <span>{entry.teamName}</span>
                            {isCurrentTeam && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-center font-mono text-zinc-400">
                          {entry.solvesCount}
                        </td>

                        <td className="px-4 py-3.5 text-right font-mono font-bold text-zinc-100">
                          {entry.totalScore}{' '}
                          <span className="text-[11px] font-normal text-zinc-500">pts</span>
                        </td>

                        <td className="px-4 py-3.5 text-right font-mono text-zinc-500 text-[11px]">
                          {entry.lastSolveAt
                            ? new Date(entry.lastSolveAt).toLocaleTimeString([], {
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
