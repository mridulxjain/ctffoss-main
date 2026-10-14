import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { CategoryDTO, ChallengeListItemDTO } from '@fossctf/shared';
import { useAuth } from '../context/AuthContext';
import { ChallengeModal } from '../components/challenges/ChallengeModal';
import { Flag, Search, Trophy, CheckCircle2, Filter, Sparkles, Layers } from 'lucide-react';

export const ChallengesPage: React.FC = () => {
  const { team, refreshSession } = useAuth();
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [challenges, setChallenges] = useState<ChallengeListItemDTO[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalId, setActiveModalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const data = await api.get('/challenges');
      setCategories(data.categories || []);
      setChallenges(data.challenges || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const handleSolved = () => {
    fetchChallenges();
    refreshSession();
  };

  // Filter challenges
  const filtered = challenges.filter((c) => {
    const matchesCat = selectedCategory === 'ALL' || c.categoryId === selectedCategory;
    const matchesDiff = selectedDifficulty === 'ALL' || c.difficulty === selectedDifficulty;
    const matchesSearch =
      searchQuery.trim() === '' ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesDiff && matchesSearch;
  });

  const totalPoints = challenges.reduce((sum, c) => sum + c.points, 0);
  const solvedCount = challenges.filter((c) => c.isSolvedByTeam).length;
  const progressPercent = challenges.length > 0 ? Math.round((solvedCount / challenges.length) * 100) : 0;

  const difficultyColors = {
    EASY: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
    MEDIUM: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    HARD: 'border-rose-500/30 text-rose-400 bg-rose-500/10',
    INSANE: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Hero / Header stats */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl relative overflow-hidden bg-gradient-to-r from-slate-900 via-[#0d1527] to-slate-900 border border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              Capture The Flag Challenges
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Operational Challenges
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
              Solve security puzzles across Web Exploitation, Cryptography, Reverse Engineering, and
              Forensics. Submit flags to capture points for your team.
            </p>
          </div>

          {/* Team Progress Tracker */}
          {team && (
            <div className="w-full md:w-72 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400">Team Progress:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {solvedCount} / {challenges.length} solved ({progressPercent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-glow"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2 font-mono">
                <span>Team Score:</span>
                <span className="text-white font-bold">{team.totalScore} pts</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
              selectedCategory === 'ALL'
                ? 'bg-emerald-500 text-black font-bold shadow-glow'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            All Categories ({challenges.length})
          </button>

          {categories.map((cat) => {
            const count = challenges.filter((c) => c.categoryId === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-500 text-black font-bold shadow-glow'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Secondary filters (Search & Difficulty) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search challenges by title or keyword..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">Difficulty:</span>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
              <option value="INSANE">Insane</option>
            </select>
          </div>
        </div>
      </div>

      {/* Challenge Card Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 font-mono text-sm">
          Loading CTF challenge grid...
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
          <Flag className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No challenges match your criteria</h3>
          <p className="text-xs text-slate-400 mt-1">Try resetting your filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((chal) => (
            <div
              key={chal.id}
              onClick={() => setActiveModalId(chal.id)}
              className={`glass-card p-5 rounded-2xl cursor-pointer relative group flex flex-col justify-between ${
                chal.isSolvedByTeam
                  ? 'border-emerald-500/40 bg-emerald-950/10'
                  : 'hover:border-emerald-500/40'
              }`}
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wide">
                    {chal.categoryName}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      difficultyColors[chal.difficulty]
                    }`}
                  >
                    {chal.difficulty}
                  </span>
                </div>

                {/* Challenge Title */}
                <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition mb-2">
                  {chal.title}
                </h3>
              </div>

              {/* Card Footer */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between mt-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {chal.solveCount} {chal.solveCount === 1 ? 'solve' : 'solves'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {chal.isSolvedByTeam && (
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Solved
                    </span>
                  )}
                  <span className="text-sm font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    {chal.points} pts
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Challenge Detail Modal */}
      {activeModalId && (
        <ChallengeModal
          challengeId={activeModalId}
          onClose={() => setActiveModalId(null)}
          onSolved={handleSolved}
        />
      )}
    </div>
  );
};
