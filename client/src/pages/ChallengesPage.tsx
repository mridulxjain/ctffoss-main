import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type {
  ChallengeListItemDTO,
  CompetitionConfigDTO,
  CompetitionReadinessSummaryDTO,
  CompetitionAttemptDTO,
  LoventiaVoucherRedeemResponse,
  LoventiaVoucherStatusResponse,
} from '@fossctf/shared';
import { useAuth } from '../context/AuthContext';
import {
  ExternalLink,
  Copy,
  Zap,
  CheckCircle2,
  Clock,
  Check,
  Terminal,
  Send,
  Lock,
  AlertTriangle,
  Trophy,
  ArrowRight,
  Ticket,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

export const ChallengesPage: React.FC = () => {
  const { team, user, refreshSession } = useAuth();
  const [competition, setCompetition] = useState<CompetitionConfigDTO | null>(null);
  const [readiness, setReadiness] = useState<CompetitionReadinessSummaryDTO | null>(null);
  const [compAttempt, setCompAttempt] = useState<CompetitionAttemptDTO | null>(null);
  const [loventiaChallenge, setLoventiaChallenge] = useState<ChallengeListItemDTO | null>(null);
  const [, setLoading] = useState(true);

  // Voucher redemption states
  const [voucherId, setVoucherId] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [redeemingVoucher, setRedeemingVoucher] = useState(false);
  const [voucherFeedback, setVoucherFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [issuedFlag, setIssuedFlag] = useState<string | null>(null);
  const [copiedFlag, setCopiedFlag] = useState(false);

  // Readiness toggle state
  const [togglingReadiness, setTogglingReadiness] = useState(false);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Live timer for elapsed competition/attempt duration
  const [elapsedString, setElapsedString] = useState<string>('00:00:00');
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  const targetUrl = 'https://ctffoss.vercel.app';

  const fetchData = async () => {
    try {
      const [chalData, compData, readinessData, attemptData, voucherStatusRaw] = await Promise.all([
        api.get('/challenges').catch(() => ({ challenges: [] })),
        api.get('/competition').catch(() => null),
        api.get('/competition/readiness').catch(() => null),
        team ? api.get('/competition/attempt').catch(() => null) : Promise.resolve(null),
        team ? api.get<LoventiaVoucherStatusResponse>('/competition/loventia/voucher-status').catch(() => null) : Promise.resolve(null),
      ]);

      const voucherStatus: LoventiaVoucherStatusResponse | null =
        (voucherStatusRaw as any)?.data !== undefined ? (voucherStatusRaw as any).data : voucherStatusRaw;

      if (voucherStatus?.redeemed && voucherStatus?.flag) {
        setIssuedFlag(voucherStatus.flag);
      }

      const chals: ChallengeListItemDTO[] = chalData?.challenges || [];
      const loventia =
        chals.find(
          (c) =>
            c.isCompetitionChallenge ||
            c.slug === 'valenfind' ||
            c.title.toLowerCase().includes('loventia')
        ) ||
        chals[0] ||
        null;

      const normalizedAttempt: CompetitionAttemptDTO | null =
        (attemptData as any)?.attempt !== undefined
          ? (attemptData as any).attempt
          : (attemptData as any)?.data !== undefined
          ? (attemptData as any).data
          : attemptData || null;

      setLoventiaChallenge(loventia);
      setCompetition(compData);
      setReadiness(readinessData);
      setCompAttempt(normalizedAttempt);
    } catch (err) {
      console.error('Failed to load Loventia Arena data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, [team?.id]);

  // Synchronized timer display
  useEffect(() => {
    if (competition?.state === 'LIVE' && competition.startTime) {
      const startMs = new Date(competition.startTime).getTime();
      const updateTimer = () => {
        const diffMs = Math.max(0, Date.now() - startMs);
        const totalSecs = Math.floor(diffMs / 1000);
        const hrs = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
        const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
        const secs = (totalSecs % 60).toString().padStart(2, '0');
        setElapsedString(`${hrs}:${mins}:${secs}`);
      };
      updateTimer();
      elapsedTimerRef.current = setInterval(updateTimer, 1000);
      return () => {
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      };
    } else {
      setElapsedString('00:00:00');
    }
  }, [competition?.state, competition?.startTime]);

  const handleCopyUrl = async () => {
    if (!canLaunchTarget) return;
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleRedeemVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherId.trim() || !passphrase.trim()) return;

    if (!team) {
      setVoucherFeedback({
        type: 'error',
        message: 'You must belong to a team in the FOSS Club identity system to redeem voucher flags.',
      });
      return;
    }

    setRedeemingVoucher(true);
    setVoucherFeedback(null);

    try {
      const resRaw = await api.post<LoventiaVoucherRedeemResponse>('/competition/loventia/redeem', {
        voucherId: voucherId.trim(),
        passphrase: passphrase.trim(),
      });
      const redeemed: LoventiaVoucherRedeemResponse | null =
        (resRaw as any)?.data !== undefined ? (resRaw as any).data : resRaw;
      const flag = redeemed?.flag;
      if (flag) {
        setIssuedFlag(flag);
      }
      setVoucherFeedback({
        type: 'success',
        message: (resRaw as any)?.message || 'VOUCHER VERIFIED! OFFICIAL TEAM FLAG ISSUED.',
      });
    } catch (err: any) {
      setVoucherFeedback({
        type: 'error',
        message: err.message || 'Invalid Voucher ID or Passphrase. Please verify the credentials found in Loventia.',
      });
    } finally {
      setRedeemingVoucher(false);
    }
  };

  const handleCopyFlag = async () => {
    if (!issuedFlag) return;
    try {
      await navigator.clipboard.writeText(issuedFlag);
      setCopiedFlag(true);
      setTimeout(() => setCopiedFlag(false), 2000);
    } catch {
      // ignore
    }
  };

  const submissionUrl = typeof window !== 'undefined' ? `${window.location.origin}/submit` : 'https://ctf.fossclub.tech/submit';

  const handleToggleReadiness = async (nextReady: boolean) => {
    if (!team) return;
    setReadinessError(null);
    try {
      setTogglingReadiness(true);
      await api.post('/competition/readiness', { isReady: nextReady });
      const updated = await api.get('/competition/readiness');
      setReadiness(updated);
    } catch (err: any) {
      setReadinessError(err.message || 'Failed to update squad readiness.');
      setTimeout(() => setReadinessError(null), 5000);
    } finally {
      setTogglingReadiness(false);
    }
  };

  const isLive = competition?.state === 'LIVE';
  const isAdmin =
    user?.role?.toLowerCase() === 'admin' ||
    user?.clubRole?.toLowerCase() === 'admin' ||
    user?.username?.toLowerCase() === 'mridulxjain';
  const isSolved = Boolean(loventiaChallenge?.isSolvedByTeam || compAttempt?.status === 'COMPLETED');

  // CRITICAL: Target link is NEVER visible / launchable until the challenge has officially started (isLive)
  const canLaunchTarget = isLive;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-7">
      {/* Top Cyber Navigation Tracker & Restored Classic Cyber Stickers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 uppercase tracking-wider">
          <span className="text-emerald-400 font-bold">&gt;_ UFC_ARENA</span>
          <span className="text-zinc-700">/</span>
          <span>Target Environment</span>
          <span className="text-zinc-700">/</span>
          <span className="text-emerald-400 font-bold">Loventia</span>
        </div>

        {/* Playful Stickers (Pastel Soft Colors with Serrated Wrapper Cut Edges) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="sticker-tape bg-[#fef08a] text-zinc-950">
            // TODO: TOUCH GRASS
          </div>
          <div className="sticker-tape-right bg-[#a7f3d0] text-zinc-950">
            TIMED SPEED RUN
          </div>
          <div className="sticker-tape bg-[#fbcfe8] text-zinc-950">
            BREAK CODE // CAPTURE FLAG
          </div>
        </div>
      </div>

      {/* Hero Header with Neobrutal Category Badges & Red-and-White Funky Title */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-4xl font-black font-mono uppercase tracking-tight flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="text-white drop-shadow-[2px_2px_0px_#000]">OPERATION:</span>
              <span className="px-3.5 py-1 bg-red-600 text-white font-mono font-black border-2 border-black shadow-[3px_3px_0px_#000] tracking-wider -rotate-1 inline-block">
                LOVENTIA
              </span>
            </h1>
          </div>

          {/* Badges for "Timed Challenge" and "Web Exploitation": dashed border with dots on each border and high contrast */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="relative px-3.5 py-1.5 bg-[#fefce8] text-black border-2 border-dashed border-black font-black uppercase shadow-[2px_2px_0px_#000] tracking-wide inline-flex items-center justify-center select-none">
              {/* Dots on corners */}
              <span className="absolute -top-1 -left-1 w-2 h-2 bg-black rounded-full" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-black rounded-full" />
              <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-black rounded-full" />
              <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-black rounded-full" />
              {/* Dots on each border */}
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-black rounded-full" />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-black rounded-full" />
              <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-1.5 bg-black rounded-full" />
              <span className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-1.5 bg-black rounded-full" />
              <span>difficulty: easy</span>
            </div>

            <div className="relative px-3.5 py-1.5 bg-[#fefce8] text-black border-2 border-dashed border-black font-black uppercase shadow-[2px_2px_0px_#000] tracking-wide inline-flex items-center justify-center select-none">
              {/* Dots on corners */}
              <span className="absolute -top-1 -left-1 w-2 h-2 bg-black rounded-full" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-black rounded-full" />
              <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-black rounded-full" />
              <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-black rounded-full" />
              {/* Dots on each border */}
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-black rounded-full" />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-black rounded-full" />
              <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-1.5 bg-black rounded-full" />
              <span className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-1.5 bg-black rounded-full" />
              <span>Web Exploitation</span>
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm font-mono text-zinc-400 max-w-3xl leading-relaxed">
          <strong className="text-zinc-200">USAR FOSS CLUB, GGSIPU</strong> Official CTF Challenge. Reverse the client-side voucher validation algorithm,
          forge an unauthorized high-value VIP discount token, and check out the secret administrator flag.
        </p>
      </div>

      {/* Readiness error message if any */}
      {readinessError && (
        <div className="p-3 border-2 border-black bg-rose-500 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-[3px_3px_0px_#000]">
          <AlertTriangle className="w-4 h-4 text-white shrink-0 stroke-[2.5]" />
          <span>{readinessError}</span>
        </div>
      )}

      {/* MAIN TARGET COMMAND CENTER */}
      <section className="border-2 border-black bg-zinc-950 p-6 sm:p-7 shadow-[4px_4px_0px_#000] space-y-6">
        {/* Top Status Bar with Neobrutal Status & Squad Readiness Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black text-emerald-400 uppercase tracking-wider">
                Live Target Application
              </span>
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-zinc-100 flex items-center gap-2">
              <span className="text-zinc-500 font-medium">Host:</span>
              <span className="text-zinc-100 font-black tracking-wide">USAR FOSS CLUB, GGSIPU</span>
            </div>
          </div>

          {/* Right Corner: Permanent Side-by-Side Status & Squad Readiness Controls (Zero Shift on Click) */}
          <div className="flex items-center gap-3 shrink-0 flex-nowrap self-start sm:self-auto">
            {/* Neobrutal Preparation Phase / Round Live Indicator */}
            {isLive ? (
              <div className="h-10 px-3.5 bg-emerald-400 text-black border-2 border-black font-mono text-xs font-black uppercase shadow-[3px_3px_0px_#000] inline-flex items-center gap-2 shrink-0 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                <span>Round Live: {elapsedString}</span>
              </div>
            ) : (
              <div className="h-10 px-3.5 bg-amber-400 text-black border-2 border-black font-mono text-xs font-black uppercase shadow-[3px_3px_0px_#000] inline-flex items-center gap-2 shrink-0 whitespace-nowrap">
                <Clock className="w-4 h-4 text-black stroke-[2.5]" />
                <span>Preparation Phase</span>
              </div>
            )}

            {/* Neobrutal Squad Readiness Button (Locked Width & Height to Prevent Shifting) */}
            {isAdmin ? (
              <div
                className="h-10 px-3.5 bg-zinc-900 text-zinc-300 border-2 border-black font-mono text-xs font-bold uppercase shadow-[2px_2px_0px_#000] inline-flex items-center gap-2 shrink-0 whitespace-nowrap"
                title="Admin clearance: Squad readiness managed by participant squads"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                <span>Squads Ready:</span>
                <span className="px-1.5 py-0.5 bg-black text-emerald-400 font-black border border-black text-[11px]">
                  {readiness?.readyTeamsCount ?? 0}/{readiness?.totalEligibleTeams ?? 0}
                </span>
              </div>
            ) : team ? (
              <button
                type="button"
                onClick={() => handleToggleReadiness(!readiness?.myTeamReadiness?.isReady)}
                disabled={togglingReadiness}
                className={`h-10 px-4 min-w-[215px] border-2 border-black font-mono text-xs font-black uppercase tracking-wider transition-colors shadow-[3px_3px_0px_#000] inline-flex items-center justify-between gap-2 shrink-0 whitespace-nowrap select-none ${
                  readiness?.myTeamReadiness?.isReady
                    ? 'bg-emerald-400 hover:bg-emerald-300 text-black'
                    : 'bg-amber-400 hover:bg-amber-300 text-black'
                }`}
                title={
                  readiness?.myTeamReadiness?.isReady
                    ? 'Your squad is marked ready. Click to cancel.'
                    : 'Click to mark your squad assembled and ready to attack.'
                }
              >
                <div className="flex items-center gap-2">
                  <Check
                    className={`w-4 h-4 ${
                      readiness?.myTeamReadiness?.isReady ? 'text-black stroke-[3]' : 'text-black stroke-[2]'
                    }`}
                  />
                  <span>
                    {togglingReadiness
                      ? 'SYNCING...'
                      : readiness?.myTeamReadiness?.isReady
                      ? 'SQUAD READY'
                      : 'MARK SQUAD READY'}
                  </span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-black text-white font-black border border-black shrink-0">
                  {readiness?.readyTeamsCount ?? 0}/{readiness?.totalEligibleTeams ?? 0}
                </span>
              </button>
            ) : (
              <div
                className="h-10 px-3.5 bg-zinc-900 text-zinc-500 border-2 border-black font-mono text-xs font-bold uppercase shadow-[2px_2px_0px_#000] inline-flex items-center gap-2 shrink-0 whitespace-nowrap"
                title="Sign in with your squad account to toggle readiness"
              >
                <Clock className="w-3.5 h-3.5 text-zinc-600" />
                <span>Squads Ready: {readiness?.readyTeamsCount ?? 0}/{readiness?.totalEligibleTeams ?? 0}</span>
              </div>
            )}
          </div>
        </div>

        {/* Target Action Strip */}
        <div className="p-4 sm:p-5 bg-zinc-900 border-2 border-black shadow-[3px_3px_0px_#000] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
              Direct Target Endpoint:
            </span>
            <div className="relative overflow-hidden bg-black p-2.5 sm:p-3 border-2 border-black shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8)]">
              <div
                className={`font-mono text-xs sm:text-sm font-bold transition-all duration-300 select-none ${
                  canLaunchTarget
                    ? 'filter-none opacity-100 text-emerald-300'
                    : 'filter blur-[7px] opacity-25 text-zinc-600 pointer-events-none'
                }`}
              >
                {canLaunchTarget ? targetUrl : 'https://ctffoss.vercel.app/classified-target-endpoint-locked'}
              </div>

              {!canLaunchTarget && (
                <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-black uppercase tracking-wider text-amber-400 bg-black/60 backdrop-blur-[1px] select-none">
                  <Lock className="w-3.5 h-3.5 mr-1.5 text-amber-400 shrink-0" />
                  <span>Target Locked Until Round Start</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleCopyUrl}
              disabled={!canLaunchTarget}
              className={`px-3.5 py-2 text-xs font-mono font-bold uppercase border-2 border-black shadow-[2px_2px_0px_#000] transition-all flex items-center gap-1.5 ${
                canLaunchTarget
                  ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-100 active:translate-x-0.5 active:translate-y-0.5'
                  : 'bg-zinc-900 text-zinc-600 cursor-not-allowed opacity-60'
              }`}
            >
              {canLaunchTarget ? (
                <>
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy Link'}</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Locked</span>
                </>
              )}
            </button>

            {canLaunchTarget ? (
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2 text-xs sm:text-sm font-mono font-black uppercase bg-emerald-400 hover:bg-emerald-300 text-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-2 transition-all"
              >
                <span>Launch Target Site</span>
                <ExternalLink className="w-4 h-4 stroke-[2.5]" />
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="px-4 py-2 text-xs sm:text-sm font-mono font-bold uppercase bg-zinc-850 text-zinc-500 border-2 border-black shadow-[2px_2px_0px_#000] cursor-not-allowed flex items-center gap-2 opacity-60"
                title="Target unlocks automatically when the competition officially begins"
              >
                <Lock className="w-3.5 h-3.5 text-zinc-600" />
                <span>Target Locked (Staging)</span>
              </button>
            )}
          </div>
        </div>

        {/* Target Instructions Callout */}
        <div className="flex items-start gap-2.5 text-xs font-mono text-zinc-300 p-3.5 bg-zinc-900 border-2 border-black shadow-[2px_2px_0px_#000]">
          {canLaunchTarget ? (
            <>
              <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 fill-emerald-400" />
              <span>
                <strong className="text-emerald-400 uppercase font-black mr-1.5">[TARGET ACTIVE]:</strong>
                Inspect network requests on the target to understand the voucher verification API and sign your customized voucher.
              </span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-amber-400 uppercase font-black mr-1.5">[PREPARATION]:</strong>
                Competition is in staging state. Mark your squad ready above. Once the administrator starts the round, the target link will immediately activate.
              </span>
            </>
          )}
        </div>
      </section>

      {/* VOUCHER REDEMPTION CONSOLE */}
      <section className="border-3 border-black bg-zinc-950 p-6 sm:p-7 shadow-[6px_6px_0px_#000] space-y-5 relative overflow-hidden">
        {/* Corner Sticker */}
        <div className="absolute right-3 top-3 hidden sm:block">
          <div className="sticker-tape-right bg-[#fde047] text-zinc-950 font-black text-[10px] uppercase tracking-wider">
            // STEP 1: RECOVER CREDENTIALS
          </div>
        </div>

        {/* Console Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-black inline-block" />
              <span className="ml-1 text-xs font-mono font-black text-amber-400 uppercase tracking-widest">
                [EXPLOIT_PAYLOAD_AUTH] // LOVENTIA_VOUCHER_KEY
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-black font-mono text-zinc-100 uppercase tracking-tight flex items-center gap-2">
              <Ticket className="w-5 h-5 text-amber-400 stroke-[2.5]" />
              <span>CLAIM VOUCHER & RECOVER TEAM FLAG</span>
            </h2>
          </div>
        </div>

        <p className="text-xs sm:text-sm font-mono text-zinc-400 leading-relaxed">
          Discovered the shared Voucher ID and Passphrase on the live target? Enter both credentials below to mint your squad's persistent competition flag.
        </p>

        {/* Issued Flag Card (if already redeemed or newly minted) */}
        {issuedFlag ? (
          <div className="p-5 border-3 border-black bg-zinc-900 shadow-[4px_4px_0px_#000] space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-mono font-black uppercase text-emerald-400">
                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                <span>OFFICIAL SQUAD FLAG ISSUED</span>
              </div>
              <span className="px-2 py-0.5 bg-black text-emerald-400 font-mono text-[10px] font-black border border-black uppercase tracking-wider">
                {team?.name || 'SQUAD VERIFIED'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-black p-3.5 border-2 border-black shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8)]">
              <div className="flex-1 font-mono text-xs sm:text-sm font-black text-emerald-300 select-all break-all tracking-wider">
                {issuedFlag}
              </div>
              <button
                type="button"
                onClick={handleCopyFlag}
                className="px-4 py-2 border-2 border-black bg-emerald-400 hover:bg-emerald-300 text-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 shrink-0"
              >
                {copiedFlag ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>COPIED!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>COPY FLAG</span>
                  </>
                )}
              </button>
            </div>

            {/* Instruction callout with button to submit flag opening the URL */}
            <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 stroke-[2.5]" />
                <span>
                  <strong className="text-emerald-300 uppercase font-black mr-1">[FLAG READY]:</strong>
                  Your squad flag has been generated and copied. Click below to open the submission terminal and transmit your flag!
                </span>
              </div>
              <a
                href={issuedFlag ? `/submit?flag=${encodeURIComponent(issuedFlag)}` : '/submit'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 border-2 border-black bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 text-black font-mono text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 shrink-0 select-none"
              >
                <Send className="w-3.5 h-3.5 stroke-[3]" />
                <span>SUBMIT FLAG</span>
                <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRedeemVoucher} className="space-y-4 font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="voucherIdInput"
                  className="text-xs font-mono text-zinc-200 font-black uppercase tracking-wider block"
                >
                  VOUCHER ID
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-amber-400 text-xs select-none font-black">
                    #
                  </span>
                  <input
                    id="voucherIdInput"
                    type="text"
                    value={voucherId}
                    onChange={(e) => setVoucherId(e.target.value)}
                    placeholder="e.g. LOVENTIA-..."
                    disabled={redeemingVoucher || !isLive}
                    className="w-full pl-8 pr-4 py-2.5 border-2 border-zinc-700 hover:border-zinc-500 focus:border-amber-400 bg-[#080d16] text-zinc-100 font-mono text-xs font-bold placeholder-zinc-600 shadow-[2px_2px_0px_#000] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="passphraseInput"
                  className="text-xs font-mono text-zinc-200 font-black uppercase tracking-wider block"
                >
                  VOUCHER PASSPHRASE
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-amber-400 text-xs select-none font-black">
                    *
                  </span>
                  <input
                    id="passphraseInput"
                    type="text"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Discovered passphrase..."
                    disabled={redeemingVoucher || !isLive}
                    className="w-full pl-8 pr-4 py-2.5 border-2 border-zinc-700 hover:border-zinc-500 focus:border-amber-400 bg-[#080d16] text-zinc-100 font-mono text-xs font-bold placeholder-zinc-600 shadow-[2px_2px_0px_#000] focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-zinc-500 font-mono">
                {isLive ? '// Shared challenge credentials discovered on the Loventia target application' : '// Available once competition officially goes LIVE'}
              </span>

              <button
                type="submit"
                disabled={redeemingVoucher || !isLive || !voucherId.trim() || !passphrase.trim()}
                className="px-6 py-2.5 border-2 border-black bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-black font-mono font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0 select-none"
              >
                <KeyRound className="w-4 h-4 stroke-[2.5]" />
                <span>{redeemingVoucher ? 'VERIFYING...' : 'REDEEM VOUCHER'}</span>
              </button>
            </div>

            {/* Voucher Feedback Message */}
            {voucherFeedback && (
              <div
                className={`p-3 border-2 border-black font-mono text-xs font-bold flex items-center gap-2.5 shadow-[3px_3px_0px_#000] ${
                  voucherFeedback.type === 'success'
                    ? 'bg-emerald-400 text-black'
                    : 'bg-rose-500 text-white'
                }`}
              >
                {voucherFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-black shrink-0 stroke-[2.5]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-white shrink-0 stroke-[2.5]" />
                )}
                <span>{voucherFeedback.message}</span>
              </div>
            )}
          </form>
        )}
      </section>

      {/* SEPARATE FLAG SUBMISSION URL TERMINAL CARD */}
      <section className="border-3 border-black bg-zinc-950 p-6 sm:p-7 shadow-[6px_6px_0px_#000] space-y-5 relative overflow-hidden">
        {/* Corner Tape Sticker */}
        <div className="absolute right-3 top-3 hidden sm:block">
          <div className="sticker-tape-right bg-[#bae6fd] text-zinc-950 font-black text-[10px] uppercase tracking-wider">
            // SEPARATE SUBMISSION URL
          </div>
        </div>

        {/* Console Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-black inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-black inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black inline-block" />
              <span className="ml-1 text-xs font-mono font-black text-emerald-400 uppercase tracking-widest">
                [SEPARATE_URL_PORTAL] // MANUAL_DISPATCH
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-black font-mono text-zinc-100 uppercase tracking-tight flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
              <span>DISPATCH CAPTURE TOKEN TERMINAL</span>
            </h2>
          </div>
        </div>

        {/* Solved Victory Banner */}
        {isSolved ? (
          <div className="p-5 sm:p-6 border-3 border-black bg-emerald-400 text-black shadow-[5px_5px_0px_#000] font-mono space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 font-black text-sm sm:text-base uppercase">
                <Trophy className="w-5 h-5 text-black stroke-[2.5]" />
                <span>LOVENTIA FLAG CONQUERED &amp; VERIFIED</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/competition/leaderboard"
                  className="px-3.5 py-1.5 bg-black text-emerald-400 hover:text-white font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 transition-all"
                >
                  <span>View Leaderboard</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </Link>
                <Link
                  to="/submit"
                  className="px-3.5 py-1.5 bg-zinc-900 text-zinc-200 hover:text-white font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 transition-all"
                >
                  <span>Submission Status</span>
                </Link>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-zinc-950 font-semibold leading-relaxed">
              Your squad has officially captured the Loventia flag. Your solve timestamp and duration are recorded on the synchronized scoreboard.
            </p>
          </div>
        ) : (
          <div className="space-y-4 font-mono">
            <p className="text-xs sm:text-sm font-mono text-zinc-300 leading-relaxed">
              Once you redeem your voucher and copy your squad flag above, click the button below to open the dedicated flag submission terminal and transmit your flag:
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-1">
              <a
                href={issuedFlag ? `/submit?flag=${encodeURIComponent(issuedFlag)}` : '/submit'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3.5 border-2 border-black bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 text-black font-mono font-black text-xs sm:text-sm uppercase tracking-wider shadow-[4px_4px_0px_#000] active:translate-x-1 active:translate-y-1 transition-all inline-flex items-center justify-center gap-2.5 select-none"
              >
                <Send className="w-4 h-4 stroke-[3]" />
                <span>SUBMIT FLAG</span>
                <ExternalLink className="w-4 h-4 stroke-[2.5]" />
              </a>

              {issuedFlag && (
                <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Team flag ready to transmit</span>
                </span>
              )}
            </div>

            <div className="pt-2 flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
              <span>Terminal URL:</span>
              <code className="text-zinc-400 bg-black px-2 py-0.5 border border-zinc-800">{submissionUrl}</code>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
