import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { ScoreboardEntryDTO, ScoreboardTimelinePoint } from '@fossctf/shared';
import { Trophy, Medal, Search, Clock, Award, RefreshCw, Sparkles, TrendingUp } from 'lucide-react';

export const ScoreboardPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<ScoreboardEntryDTO[]>([]);
  const [timeline, setTimeline] = useState<ScoreboardTimelinePoint[]>([]);
  const [isFrozen, setIsFrozen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchScoreboard = async () => {
    try {
      setLoading(true);
      const data = await api.get('/scoreboard');
      setLeaderboard(data.leaderboard || []);
      setTimeline(data.timeline || []);
      setIsFrozen(data.isFrozen || false);
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

  const firstPlace = leaderboard[0];
  const secondPlace = leaderboard[1];
  const thirdPlace = leaderboard[2];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <Trophy className="w-4 h-4" /> Live Standings
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Competition Scoreboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time rankings based on total points and atomic solve timestamps (tie-breaker).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchScoreboard}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Podium Highlight (Top 3) */}
      {leaderboard.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {/* 2nd Place */}
          {secondPlace ? (
            <div className="glass-card p-6 rounded-2xl border-slate-700/60 bg-gradient-to-b from-slate-900 to-[#0c1424] flex flex-col items-center text-center relative order-2 md:order-1">
              <div className="w-12 h-12 rounded-full bg-slate-400/10 border border-slate-400/30 flex items-center justify-center text-slate-300 mb-3">
                <Medal className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                2nd Place
              </span>
              <h3 className="text-lg font-bold text-white mt-1">{secondPlace.teamName}</h3>
              <div className="text-2xl font-mono font-extrabold text-slate-200 mt-2">
                {secondPlace.totalScore} <span className="text-xs text-slate-400">pts</span>
              </div>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                {secondPlace.solvesCount} solves
              </div>
            </div>
          ) : (
            <div className="order-2 md:order-1"></div>
          )}

          {/* 1st Place */}
          {firstPlace && (
            <div className="glass-card p-6 rounded-2xl border-amber-500/40 bg-gradient-to-b from-amber-950/20 via-slate-900 to-[#0c1424] flex flex-col items-center text-center relative shadow-glow order-1 md:order-2 md:-translate-y-2">
              <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3">
                <Trophy className="w-8 h-8" />
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> 1st Place Leader
              </span>
              <h3 className="text-xl font-extrabold text-white mt-1">{firstPlace.teamName}</h3>
              <div className="text-3xl font-mono font-extrabold text-amber-400 mt-2">
                {firstPlace.totalScore} <span className="text-xs text-amber-400/80">pts</span>
              </div>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                {firstPlace.solvesCount} solves
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {thirdPlace ? (
            <div className="glass-card p-6 rounded-2xl border-slate-700/60 bg-gradient-to-b from-slate-900 to-[#0c1424] flex flex-col items-center text-center relative order-3">
              <div className="w-12 h-12 rounded-full bg-amber-700/10 border border-amber-700/30 flex items-center justify-center text-amber-600 mb-3">
                <Award className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold text-amber-600 uppercase tracking-widest">
                3rd Place
              </span>
              <h3 className="text-lg font-bold text-white mt-1">{thirdPlace.teamName}</h3>
              <div className="text-2xl font-mono font-extrabold text-slate-200 mt-2">
                {thirdPlace.totalScore} <span className="text-xs text-slate-400">pts</span>
              </div>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                {thirdPlace.solvesCount} solves
              </div>
            </div>
          ) : (
            <div className="order-3"></div>
          )}
        </div>
      )}

      {/* Leaderboard Table with Search */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        {/* Search header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team rankings..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="text-xs text-slate-400 font-mono hidden sm:block">
            {leaderboard.length} competing {leaderboard.length === 1 ? 'team' : 'teams'}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-xs text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3 w-16 text-center">Rank</th>
                <th className="px-6 py-3">Team</th>
                <th className="px-6 py-3 text-center">Solves</th>
                <th className="px-6 py-3 text-right">Score</th>
                <th className="px-6 py-3 text-right">Last Solve</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No teams found on the leaderboard.
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => {
                  const isTop3 = entry.rank <= 3;
                  return (
                    <tr
                      key={entry.teamId}
                      className="hover:bg-slate-800/30 transition group"
                    >
                      <td className="px-6 py-4 text-center font-mono font-bold">
                        {entry.rank === 1 ? (
                          <span className="inline-flex w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 items-center justify-center text-xs">
                            1
                          </span>
                        ) : entry.rank === 2 ? (
                          <span className="inline-flex w-7 h-7 rounded-full bg-slate-400/20 text-slate-300 items-center justify-center text-xs">
                            2
                          </span>
                        ) : entry.rank === 3 ? (
                          <span className="inline-flex w-7 h-7 rounded-full bg-amber-700/20 text-amber-600 items-center justify-center text-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-400">{entry.rank}</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-white group-hover:text-emerald-400 transition flex items-center gap-2">
                          {entry.teamName}
                          {isTop3 && (
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center font-mono text-slate-300">
                        {entry.solvesCount}
                      </td>

                      <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400 text-base">
                        {entry.totalScore}
                      </td>

                      <td className="px-6 py-4 text-right text-xs text-slate-400 font-mono">
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
    </div>
  );
};
