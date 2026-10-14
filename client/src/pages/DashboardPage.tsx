import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  Flag,
  Trophy,
  Timer,
  Users,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Shield,
  ArrowRight,
  Activity,
  Award,
  Lock,
  Radio,
  Check,
  XCircle,
  Play,
} from 'lucide-react';
import type {
  CompetitionConfigDTO,
  CompetitionReadinessSummaryDTO,
  ChallengeListItemDTO,
  ScoreboardEntryDTO,
  CompetitionLeaderboardEntryDTO,
} from '@fossctf/shared';

export const DashboardPage: React.FC = () => {
  const { user, team, refreshSession } = useAuth();
  const [competition, setCompetition] = useState<CompetitionConfigDTO | null>(null);
  const [readiness, setReadiness] = useState<CompetitionReadinessSummaryDTO | null>(null);
  const [challenges, setChallenges] = useState<ChallengeListItemDTO[]>([]);
  const [pointsEntry, setPointsEntry] = useState<ScoreboardEntryDTO | null>(null);
  const [timedEntry, setTimedEntry] = useState<CompetitionLeaderboardEntryDTO | null>(null);
  const [elapsedString, setElapsedString] = useState<string>('00:00:00');
  const [togglingReadiness, setTogglingReadiness] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [compData, readyData, chalData, scoreData, leadData] = await Promise.all([
        api.get('/competition').catch(() => null),
        api.get('/competition/readiness').catch(() => null),
        api.get('/challenges').catch(() => ({ challenges: [] })),
        api.get('/scoreboard').catch(() => ({ leaderboard: [] })),
        api.get('/competition/leaderboard').catch(() => ({ leaderboard: [] })),
      ]);

      setCompetition(compData);
      setReadiness(readyData);
      const chals: ChallengeListItemDTO[] = chalData?.challenges || [];
      setChallenges(chals);

      if (team) {
        const pEntry = (scoreData?.leaderboard || []).find((e: ScoreboardEntryDTO) => e.teamId === team.id);
        const tEntry = (leadData?.leaderboard || []).find((e: CompetitionLeaderboardEntryDTO) => e.teamId === team.id);
        setPointsEntry(pEntry || null);
        setTimedEntry(tEntry || null);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [team?.id]);

  // Periodic poll for competition & readiness states (every 6 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [compData, readyData] = await Promise.all([
          api.get('/competition').catch(() => null),
          api.get('/competition/readiness').catch(() => null),
        ]);
        if (compData) setCompetition(compData);
        if (readyData) setReadiness(readyData);
      } catch {
        // silent background poll error
      }
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Synchronized elapsed clock timer when competition is LIVE
  useEffect(() => {
    if (competition?.state !== 'LIVE' || !competition?.startTime) {
      setElapsedString('00:00:00');
      return;
    }

    const startMs = new Date(competition.startTime).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const diffMs = Math.max(0, now - startMs);
      const totalSec = Math.floor(diffMs / 1000);
      const hrs = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      setElapsedString(
        `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    };

    updateTimer();
    const clockInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(clockInterval);
  }, [competition?.state, competition?.startTime]);

  const handleToggleReadiness = async (nextState: boolean) => {
    if (!team) return;
    try {
      setTogglingReadiness(true);
      await api.post('/competition/readiness', { isReady: nextState });
      const updated = await api.get('/competition/readiness');
      setReadiness(updated);
      await refreshSession();
    } catch (err: any) {
      alert(err.message || 'Failed to update squad readiness.');
    } finally {
      setTogglingReadiness(false);
    }
  };

  const solvedCount = challenges.filter((c) => c.isSolvedByTeam).length;
  const totalPoints = challenges.reduce((acc, c) => acc + (c.isSolvedByTeam ? c.points : 0), 0);
  const maxPoints = challenges.reduce((acc, c) => acc + c.points, 0);
  const loventiaChallenge = challenges.find((c) => c.isCompetitionChallenge || c.slug === 'valenfind');

  const isLive = competition?.state === 'LIVE';
  const isPreparing = competition?.state === 'PREPARING';
  const isEnded = competition?.state === 'ENDED';
  const isPaused = competition?.state === 'PAUSED';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Brand & Section Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest">
            § 01 &middot; Competition Operations
          </span>
          <span className="text-zinc-700">&middot;</span>
          <span className="font-mono text-[11px] text-emerald-400 font-semibold">
            USAR FOSS CLUB
          </span>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
              isLive
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                : isPreparing
                ? 'bg-amber-950/40 text-amber-400 border-amber-800/60'
                : isPaused
                ? 'bg-rose-950/40 text-rose-400 border-rose-800/60'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLive
                  ? 'bg-emerald-500 animate-pulse'
                  : isPreparing
                  ? 'bg-amber-400'
                  : isPaused
                  ? 'bg-rose-500'
                  : 'bg-zinc-500'
              }`}
            />
            <span>
              {isLive
                ? `LIVE · ${elapsedString}`
                : isPreparing
                ? 'PREPARING ROUND'
                : isPaused
                ? 'PAUSED'
                : 'STANDBY'}
            </span>
          </div>
        </div>
      </div>

      {/* Hero Overview: Loventia CTF Banner */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
              <Radio className="w-3 h-3 text-emerald-400" />
              <span>Official Competition Target</span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
                Loventia: Web Exploitation CTF
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
                A synchronized, timed security challenge hosted by the USAR FOSS Club. Inspect the
                target environment, exploit application logic, and extract authorized competition flags
                for verified team points.
              </p>
            </div>

            {/* Target Status pill */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-zinc-500 font-mono text-[11px]">Round Scope:</span>
              <span className="font-mono text-zinc-300 text-[11px] px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">
                Single Synchronized CTF Target
              </span>
              {competition?.startTime && (
                <span className="font-mono text-zinc-400 text-[11px] px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">
                  Started: {new Date(competition.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="shrink-0 flex flex-col gap-2.5 sm:min-w-[200px]">
            {isLive ? (
              <>
                <Link
                  to="/challenges"
                  className="px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm text-center"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Enter Challenge Board</span>
                </Link>
                {loventiaChallenge?.externalUrl && (
                  <a
                    href={loventiaChallenge.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-medium transition-colors flex items-center justify-center gap-2 text-center"
                  >
                    <span>Launch Loventia Target</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                  </a>
                )}
              </>
            ) : isPreparing ? (
              <>
                {team ? (
                  <button
                    onClick={() => handleToggleReadiness(!readiness?.myTeamReadiness?.isReady)}
                    disabled={togglingReadiness}
                    className={`px-5 py-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 ${
                      readiness?.myTeamReadiness?.isReady
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {togglingReadiness ? (
                      'Updating...'
                    ) : readiness?.myTeamReadiness?.isReady ? (
                      <>
                        <XCircle className="w-4 h-4 text-zinc-400" />
                        <span>Squad Ready (Click to Revoke)</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>Mark Squad Ready</span>
                      </>
                    )}
                  </button>
                ) : (
                  <Link
                    to="/team"
                    className="px-5 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors text-center"
                  >
                    Assign Team to Participate
                  </Link>
                )}
                <Link
                  to="/challenges"
                  className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium transition-colors text-center"
                >
                  Preview Challenge Catalog
                </Link>
              </>
            ) : isEnded ? (
              <>
                <Link
                  to="/competition/leaderboard"
                  className="px-5 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 font-semibold text-xs transition-colors flex items-center justify-center gap-2 text-center"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>View Final Results</span>
                </Link>
                <Link
                  to="/scoreboard"
                  className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium transition-colors text-center"
                >
                  View Points Scoreboard
                </Link>
              </>
            ) : (
              <Link
                to="/challenges"
                className="px-5 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors text-center"
              >
                View Challenges
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Operational Bento Grid (4 Core Functional Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Your Squad Status */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-400" />
                <span>Your Squad</span>
              </span>
              {team && (
                <span className="font-mono text-[10px] text-zinc-500">
                  {readiness?.myTeamReadiness?.isReady ? 'READY' : 'PREPARING'}
                </span>
              )}
            </div>
            <div className="text-base font-bold text-zinc-100 truncate">
              {team ? team.name : 'No Squad Assigned'}
            </div>
            <p className="text-[11px] text-zinc-400">
              {team
                ? `Logged in as ${user?.username || 'participant'}`
                : 'Join or assign a team via FOSS Club to participate.'}
            </p>
          </div>

          <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
            <Link
              to="/team"
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 font-medium"
            >
              <span>Manage Squad</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
            {team && (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  readiness?.myTeamReadiness?.isReady
                    ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/60'
                    : 'bg-amber-950/50 text-amber-400 border-amber-800/60'
                }`}
              >
                {readiness?.myTeamReadiness?.isReady ? 'Ready' : 'Not Ready'}
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Challenge Progress */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-zinc-400" />
                <span>Challenge Solves</span>
              </span>
              <span className="font-mono text-[10px] text-zinc-500">
                {challenges.length > 0 ? `${Math.round((solvedCount / challenges.length) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="text-base font-bold text-zinc-100">
              <span className="text-emerald-400">{solvedCount}</span>
              <span className="text-zinc-500 font-normal text-xs ml-1.5">/ {challenges.length} solved</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${challenges.length > 0 ? (solvedCount / challenges.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
            <Link
              to="/challenges"
              className="text-xs text-zinc-300 hover:text-zinc-100 transition-colors flex items-center gap-1 font-medium"
            >
              <span>View Board</span>
              <ChevronRight className="w-3 h-3 text-zinc-500" />
            </Link>
            <span className="text-[11px] font-mono text-zinc-500">
              {challenges.length - solvedCount} remaining
            </span>
          </div>
        </div>

        {/* Card 3: Points & Scoreboard Standing */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-zinc-400" />
                <span>Points Standing</span>
              </span>
              <span className="font-mono text-[10px] text-zinc-500">OFFICIAL</span>
            </div>
            <div className="text-base font-bold text-zinc-100">
              <span className="text-zinc-100">{team?.totalScore ?? totalPoints}</span>
              <span className="text-zinc-500 font-normal text-xs ml-1">pts</span>
              {pointsEntry?.rank && (
                <span className="text-xs font-mono font-medium ml-2 text-amber-400">
                  (Rank #{pointsEntry.rank})
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">
              {pointsEntry?.lastSolveAt
                ? `Last solve at ${new Date(pointsEntry.lastSolveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'No points registered yet'}
            </p>
          </div>

          <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
            <Link
              to="/scoreboard"
              className="text-xs text-zinc-300 hover:text-zinc-100 transition-colors flex items-center gap-1 font-medium"
            >
              <span>Scoreboard</span>
              <ChevronRight className="w-3 h-3 text-zinc-500" />
            </Link>
            <span className="text-[11px] font-mono text-zinc-500">Tie: earlier solve</span>
          </div>
        </div>

        {/* Card 4: Timed Loventia Leaderboard Standing */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-zinc-400" />
                <span>Timed Leaderboard</span>
              </span>
              <span className="font-mono text-[10px] text-emerald-400">LOVENTIA</span>
            </div>
            <div className="text-base font-bold text-zinc-100 font-mono">
              {timedEntry?.formattedTime ? (
                <span className="text-emerald-400">{timedEntry.formattedTime}</span>
              ) : timedEntry?.status === 'IN_PROGRESS' ? (
                <span className="text-amber-400 text-sm">Attempt Running</span>
              ) : (
                <span className="text-zinc-500 text-sm">Not Started</span>
              )}
              {timedEntry?.rank && timedEntry.status === 'COMPLETED' && (
                <span className="text-xs font-mono font-medium ml-2 text-amber-400">
                  (#{timedEntry.rank})
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">
              {timedEntry?.status === 'COMPLETED'
                ? 'Flag verified and attempt completed'
                : 'Ranked by synchronized elapsed time'}
            </p>
          </div>

          <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
            <Link
              to="/competition/leaderboard"
              className="text-xs text-zinc-300 hover:text-zinc-100 transition-colors flex items-center gap-1 font-medium"
            >
              <span>Leaderboard</span>
              <ChevronRight className="w-3 h-3 text-zinc-500" />
            </Link>
            <span className="text-[11px] font-mono text-zinc-500">Time-trial rank</span>
          </div>
        </div>
      </div>

      {/* Preparing Squad Readiness Monitor (Shown during PREPARING) */}
      {isPreparing && (
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/15 p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-900/30 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wide">
                Squad Readiness Check &middot; Awaiting Admin Start
              </h2>
            </div>
            <div className="text-xs font-mono text-zinc-400">
              <strong className="text-emerald-400">{readiness?.readyTeamsCount ?? 0}</strong> of{' '}
              <strong className="text-zinc-200">{readiness?.totalEligibleTeams ?? 0}</strong> squads ready
            </div>
          </div>

          <div className="text-xs text-zinc-400 leading-relaxed">
            The competition target remains sealed until officially unlocked by the platform administrators.
            Ensure your squad members are coordinated and your readiness flag is set.
          </div>

          {readiness?.teams && readiness.teams.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
              {readiness.teams.map((t) => (
                <div
                  key={t.teamId}
                  className={`flex items-center justify-between p-2 rounded text-xs border ${
                    t.isReady
                      ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-300'
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <span className="font-medium truncate mr-1.5">{t.teamName}</span>
                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded shrink-0 ${
                      t.isReady
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {t.isReady ? 'Ready' : 'Wait'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Featured Loventia Target & Challenge Quick List */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
              § 02 &middot; Competition Challenges
            </span>
          </div>
          <Link
            to="/challenges"
            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 font-medium"
          >
            <span>Full Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {challenges.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500 font-mono">
            Loading challenge catalog...
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {challenges.slice(0, 5).map((chal) => (
              <div
                key={chal.id}
                className="py-3 flex items-center justify-between gap-3 text-xs group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">
                    {chal.isSolvedByTeam ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center text-[9px] text-zinc-600 font-mono">
                        &middot;
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link
                      to="/challenges"
                      className="font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors truncate block"
                    >
                      {chal.title}
                    </Link>
                    <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-2 mt-0.5">
                      <span>{chal.categoryName}</span>
                      {chal.isCompetitionChallenge && (
                        <>
                          <span>&middot;</span>
                          <span className="text-amber-400 font-semibold">Loventia Target</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 font-mono">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] border ${
                      chal.difficulty === 'EASY'
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40'
                        : chal.difficulty === 'MEDIUM'
                        ? 'bg-amber-950/40 text-amber-400 border-amber-900/40'
                        : 'bg-rose-950/40 text-rose-400 border-rose-900/40'
                    }`}
                  >
                    {chal.difficulty}
                  </span>
                  <span className="text-zinc-200 font-semibold w-14 text-right">
                    {chal.points} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
