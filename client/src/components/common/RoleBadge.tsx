import React, { useState } from 'react';
import { Crown, Award, Sparkles, UserCheck } from 'lucide-react';
import type { UserDTO } from '@fossctf/shared';

export interface RoleBadgeProps {
  user: Pick<UserDTO, 'role' | 'clubRole' | 'username'>;
  className?: string;
  showText?: boolean;
  tooltipPlacement?: 'bottom' | 'top' | 'bottom-right';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  user,
  className = '',
  showText = false,
  tooltipPlacement = 'bottom-right',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const normalizedRole = user.role?.toUpperCase();
  const rawClubRole = user.clubRole ? String(user.clubRole).toLowerCase().trim() : null;

  const isAdmin =
    normalizedRole === 'ADMIN' ||
    rawClubRole === 'admin' ||
    user.username?.toLowerCase() === 'mridulxjain';

  const isLead = !isAdmin && rawClubRole === 'lead';
  const isCore = !isAdmin && rawClubRole === 'core';

  let roleLabel = 'Member';
  let roleDescription = 'Participant';
  let badgeColor = 'bg-zinc-800 text-emerald-400 border-zinc-700 hover:border-emerald-400';
  let tooltipBg = 'bg-zinc-950 text-emerald-400 border-emerald-400';
  let Icon = UserCheck;

  if (isAdmin) {
    roleLabel = 'Admin';
    roleDescription = 'Platform Administrator';
    badgeColor = 'bg-[#ffd000] text-black border-black shadow-[1px_1px_0px_#000]';
    tooltipBg = 'bg-[#ffd000] text-black border-black';
    Icon = Crown;
  } else if (isLead) {
    roleLabel = 'Lead';
    roleDescription = 'Club Lead';
    badgeColor = 'bg-[#00f0ff] text-black border-black shadow-[1px_1px_0px_#000]';
    tooltipBg = 'bg-[#00f0ff] text-black border-black';
    Icon = Award;
  } else if (isCore) {
    roleLabel = 'Core';
    roleDescription = 'Core Team';
    badgeColor = 'bg-[#c084fc] text-black border-black shadow-[1px_1px_0px_#000]';
    tooltipBg = 'bg-[#c084fc] text-black border-black';
    Icon = Sparkles;
  }

  const isTop = tooltipPlacement === 'top';

  return (
    <div
      className={`relative group inline-flex items-center cursor-help ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      title={`${roleDescription} (${roleLabel})`}
      aria-label={`${roleDescription} (${roleLabel})`}
    >
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 border-2 text-[10px] font-mono font-black uppercase tracking-wider transition-all select-none ${badgeColor}`}
      >
        <Icon className="w-3 h-3 stroke-[2.5] shrink-0" />
        {showText && <span>{roleLabel}</span>}
      </span>

      {/* Neobrutalist Hover Tooltip - Positioned strictly below badge so it never collides with browser top */}
      <div
        role="tooltip"
        className={`absolute z-50 flex flex-col transition-all duration-150 transform ${
          isHovered
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100'
        } ${
          isTop
            ? 'bottom-full mb-2 right-0 sm:left-1/2 sm:-translate-x-1/2 items-end sm:items-center'
            : tooltipPlacement === 'bottom-right'
            ? 'top-full mt-2 right-0 items-end'
            : 'top-full mt-2 left-1/2 -translate-x-1/2 items-center'
        }`}
      >
        {/* Caret arrow pointing UP when tooltip is below */}
        {!isTop && (
          <div
            className={`w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-black -mb-[1px] ${
              tooltipPlacement === 'bottom-right' ? 'mr-3' : ''
            }`}
          />
        )}

        {/* Tooltip Content Pill */}
        <div
          className={`px-2.5 py-1 border-2 font-mono text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-[3px_3px_0px_#000] ${tooltipBg}`}
        >
          <span>{roleDescription}</span>
        </div>

        {/* Caret arrow pointing DOWN when tooltip is top */}
        {isTop && (
          <div
            className={`w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-black -mt-[1px] ${
              tooltipPlacement === 'bottom-right' ? 'mr-3' : ''
            }`}
          />
        )}
      </div>
    </div>
  );
};
