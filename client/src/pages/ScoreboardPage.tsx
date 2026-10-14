import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { ScoreboardEntryDTO } from '@fossctf/shared';
import { useAuth } from '../context/AuthContext';
import { Search, RefreshCw } from 'lucide-react';

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
      console.error(err);
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Scoreboard
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Official team standings. Tied scores are resolved by the timestamp of the earlier solve.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchScoreboard}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-zinc-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {leaderboard.length > 0 && (
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
            {leaderboard.length} {leaderboard.length === 1 ? 'team' : 'teams'} on board
          </div>
        </div>
      )}

      {/* Standings Table or Empty State */}
      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-zinc-500">
          Loading scoreboard standings...
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/20 p-12 text-center">
          <p className="text-sm font-medium text-zinc-300">No solves recorded yet</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            The leaderboard will populate automatically as teams submit valid flags for competition challenges.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-medium">
                <tr>
                  <th className="px-4 py-2.5 w-16 text-center">Rank</th>
                  <th className="px-4 py-2.5">Team</th>
                  <th className="px-4 py-2.5 text-center w-24">Solves</th>
                  <th className="px-4 py-2.5 text-right w-28">Score</th>
                  <th className="px-4 py-2.5 text-right w-36">Last Solve</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
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
                        <td className="px-4 py-3 text-center font-mono font-medium">
                          {entry.rank <= 3 ? (
                            <span
                              className={`inline-block w-5 h-5 leading-5 rounded text-center text-[11px] font-semibold ${
                                entry.rank === 1
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                  : entry.rank === 2
                                  ? 'bg-zinc-400/10 text-zinc-300 border border-zinc-400/30'
                                  : 'bg-amber-800/10 text-amber-600 border border-amber-800/30'
                              }`}
                            >
                              {entry.rank}
                            </span>
                          ) : (
                            <span className="text-zinc-500">{entry.rank}</span>
                          )}
                        </td>

                        <td className="px-4 py-3 font-medium text-zinc-200">
                          <div className="flex items-center gap-2">
                            <span>{entry.teamName}</span>
                            {isCurrentTeam && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center font-mono text-zinc-400">
                          {entry.solvesCount}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-100">
                          {entry.totalScore}
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-zinc-500 text-[11px]">
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
