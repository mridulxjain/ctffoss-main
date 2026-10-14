import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { CategoryDTO, ChallengeListItemDTO, CompetitionConfigDTO } from '@fossctf/shared';
import { useAuth } from '../context/AuthContext';
import { ChallengeModal } from '../components/challenges/ChallengeModal';
import { Search, CheckCircle2, Circle, Clock, AlertTriangle, Radio } from 'lucide-react';

export const ChallengesPage: React.FC = () => {
  const { team, refreshSession } = useAuth();
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [challenges, setChallenges] = useState<ChallengeListItemDTO[]>([]);
  const [competition, setCompetition] = useState<CompetitionConfigDTO | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalId, setActiveModalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [chalData, compData] = await Promise.all([
        api.get('/challenges').catch(() => ({ categories: [], challenges: [] })),
        api.get('/competition').catch(() => null),
      ]);
      setCategories(chalData.categories || []);
      setChallenges(chalData.challenges || []);
      setCompetition(compData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSolved = () => {
    fetchData();
    refreshSession();
  };

  const filtered = challenges.filter((c) => {
    const matchesCat = selectedCategory === 'ALL' || c.categoryId === selectedCategory;
    const matchesDiff = selectedDifficulty === 'ALL' || c.difficulty === selectedDifficulty;
    const matchesSearch =
      searchQuery.trim() === '' ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesDiff && matchesSearch;
  });

  const solvedCount = challenges.filter((c) => c.isSolvedByTeam).length;

  const difficultyBadge = (diff: string) => {
    switch (diff) {
      case 'EASY':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-900/40';
      case 'MEDIUM':
        return 'text-amber-400 bg-amber-950/40 border-amber-900/40';
      case 'HARD':
        return 'text-rose-400 bg-rose-950/40 border-rose-900/40';
      case 'INSANE':
        return 'text-purple-400 bg-purple-950/40 border-purple-900/40';
      default:
        return 'text-zinc-400 bg-zinc-900 border-zinc-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Challenges
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Browse competition tasks, extract flags, and submit solutions to score points for your team.
          </p>
        </div>

        {team && challenges.length > 0 && (
          <div className="text-xs text-zinc-400 font-mono">
            Progress: <span className="text-zinc-200 font-semibold">{solvedCount}</span> of{' '}
            <span className="text-zinc-200">{challenges.length}</span> solved
          </div>
        )}
      </div>

      {/* Competition Status Banner */}
      {competition && competition.state !== 'LIVE' && (
        <div
          className={`p-4 rounded-lg border text-xs flex items-start gap-3 ${
            competition.state === 'SCHEDULED'
              ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
              : competition.state === 'ENDED'
              ? 'bg-zinc-900 border-zinc-700/80 text-zinc-300'
              : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
          }`}
        >
          {competition.state === 'SCHEDULED' ? (
            <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          ) : competition.state === 'ENDED' ? (
            <CheckCircle2 className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-semibold text-zinc-100 flex items-center gap-2">
              <span>{competition.title}</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                  competition.state === 'SCHEDULED'
                    ? 'bg-amber-900/40 text-amber-300 border-amber-700/50'
                    : competition.state === 'ENDED'
                    ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    : 'bg-rose-900/40 text-rose-300 border-rose-700/50'
                }`}
              >
                {competition.state}
              </span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              {competition.state === 'SCHEDULED' && competition.startTime
                ? `The competition is scheduled to begin at ${new Date(
                    competition.startTime
                  ).toLocaleString()}. Challenge browsing is active in preview mode, but flag submissions are locked until start time.`
                : competition.state === 'SCHEDULED'
                ? 'The competition has not yet started. Flag submissions are locked until the scheduled start time.'
                : competition.state === 'ENDED' && competition.endTime
                ? `The competition concluded at ${new Date(
                    competition.endTime
                  ).toLocaleString()}. Submissions are closed. Challenges remain available for archival study.`
                : competition.state === 'ENDED'
                ? 'The competition has concluded. Flag submissions are closed.'
                : 'The competition is currently paused or inactive. Submissions are temporarily disabled by organizers.'}
            </p>
          </div>
        </div>
      )}

      {competition && competition.state === 'LIVE' && competition.endTime && (
        <div className="p-3 rounded-lg border bg-emerald-950/20 border-emerald-900/40 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span className="font-medium">Competition Live</span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-400">{competition.title}</span>
          </div>
          <div className="font-mono text-zinc-400 text-[11px]">
            Closes at {new Date(competition.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="space-y-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-md text-xs transition-colors whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-zinc-800 text-zinc-100 font-medium border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            All Categories ({challenges.length})
          </button>

          {categories.map((cat) => {
            const count = challenges.filter((c) => c.categoryId === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-md text-xs transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'bg-zinc-800 text-zinc-100 font-medium border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Secondary filters (Search & Difficulty) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by challenge name..."
              className="w-full pl-8 pr-3 py-1.5 rounded-md bg-zinc-900/70 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-zinc-500">Difficulty:</span>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-zinc-700 cursor-pointer"
            >
              <option value="ALL">All</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
              <option value="INSANE">Insane</option>
            </select>
          </div>
        </div>
      </div>

      {/* Challenge List / Table */}
      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-zinc-500">
          Loading challenges...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/20 p-12 text-center">
          <p className="text-sm font-medium text-zinc-300">No challenges found</p>
          <p className="text-xs text-zinc-500 mt-1">
            {challenges.length === 0
              ? 'No competition challenges are currently published. Check back when the round begins.'
              : 'No challenges matched your filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden divide-y divide-zinc-800/80">
          {filtered.map((chal) => (
            <div
              key={chal.id}
              onClick={() => setActiveModalId(chal.id)}
              className="px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-4 hover:bg-zinc-900/80 cursor-pointer transition-colors group"
            >
              {/* Left: Status icon & Title + Category */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="shrink-0">
                  {chal.isSolvedByTeam ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" title="Solved by team" />
                  ) : (
                    <Circle className="w-4 h-4 text-zinc-600" title="Unsolved" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-zinc-200 group-hover:text-emerald-400 transition-colors truncate">
                      {chal.title}
                    </span>
                    {chal.isTimed && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        {chal.durationMinutes}m
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                    <span>{chal.categoryName}</span>
                    {chal.author && (
                      <>
                        <span className="text-zinc-700">&middot;</span>
                        <span>by {chal.author}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Difficulty, Solves & Points */}
              <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                <span
                  className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded border ${difficultyBadge(
                    chal.difficulty
                  )}`}
                >
                  {chal.difficulty}
                </span>

                <div className="text-xs text-zinc-500 font-mono hidden sm:block w-20 text-right">
                  {chal.solveCount} {chal.solveCount === 1 ? 'solve' : 'solves'}
                </div>

                <div className="font-mono text-sm font-semibold text-zinc-200 w-20 text-right">
                  {chal.points} <span className="text-[11px] font-normal text-zinc-500">pts</span>
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
