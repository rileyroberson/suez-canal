import React from 'react';
import { useGameStore } from '../store/gameStore';
import { RESEARCH_THRESHOLDS, isResearchUnlocked } from '../types/game';
import type { Faction, ResearchTrack as ResearchTrackType } from '../types/game';

// ─── Research tier data ───────────────────────────────────────────────────────

const OPENER_TIERS = [
  {
    tier: 1 as const,
    name: 'Maritime Logistics',
    unlocks: 'Cargo Escorts +10% openness; Frigates available',
  },
  {
    tier: 2 as const,
    name: 'Blue Water Doctrine',
    unlocks: 'Carriers available; air units cost 1 less Fuel',
  },
  {
    tier: 3 as const,
    name: 'Precision Clearance',
    unlocks: 'Precision missiles; clear 2 obstruction tokens per action',
  },
];

const BLOCKER_TIERS = [
  {
    tier: 1 as const,
    name: 'Asymmetric Warfare',
    unlocks: 'Mine Layers available; mines deal +1 damage',
  },
  {
    tier: 2 as const,
    name: 'Denial Operations',
    unlocks: 'EMP & Supply Strike missiles; fortifications cost 1 less Steel',
  },
  {
    tier: 3 as const,
    name: 'Total Blockade',
    unlocks: 'Obstruction tokens -15% openness; place 2 tokens per Build action',
  },
];

// ─── Single tier row ──────────────────────────────────────────────────────────

interface TierRowProps {
  tier: 1 | 2 | 3;
  name: string;
  unlocks: string;
  track: ResearchTrackType;
  faction: Faction;
  currentFaction: Faction;
  canSpend: boolean;
  intel: number;
  onInvest: () => void;
}

function TierRow({
  tier,
  name,
  unlocks,
  track,
  faction,
  currentFaction,
  canSpend,
  intel,
  onInvest,
}: TierRowProps): React.ReactElement {
  const threshold = RESEARCH_THRESHOLDS[`tier${tier}`];
  const spent = track[`tier${tier}`];
  const done = isResearchUnlocked(track, tier);
  const prevDone = tier === 1 || isResearchUnlocked(track, (tier - 1) as 1 | 2 | 3);
  const inProgress = prevDone && !done;
  const locked = !prevDone;

  const pct = Math.min(100, (spent / threshold) * 100);
  const isMyTurn = faction === currentFaction;

  return (
    <div
      className={`rounded-lg p-2 ${
        done
          ? 'bg-green-950 border border-green-800'
          : locked
          ? 'bg-gray-900 border border-gray-800 opacity-50'
          : 'bg-gray-800 border border-gray-700'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {done ? (
            <span className="text-green-400 text-xs font-bold">DONE</span>
          ) : locked ? (
            <span className="text-gray-600 text-xs font-bold">LOCKED</span>
          ) : (
            <span className="text-yellow-400 text-xs font-bold">T{tier}</span>
          )}
          <span
            className={`text-xs font-semibold ${
              done ? 'text-green-300' : locked ? 'text-gray-600' : 'text-gray-200'
            }`}
          >
            {name}
          </span>
        </div>
        <span className="text-gray-500 text-xs">
          {spent}/{threshold} Intel
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-1">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            done
              ? 'bg-green-500'
              : faction === 'opener'
              ? 'bg-blue-500'
              : 'bg-red-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="text-gray-500 text-xs">{unlocks}</div>

      {/* Invest button — only for current faction's in-progress tier */}
      {inProgress && isMyTurn && canSpend && (
        <button
          onClick={onInvest}
          disabled={intel < 1}
          className={`mt-1.5 w-full py-1 text-xs font-bold rounded transition-colors ${
            intel >= 1
              ? faction === 'opener'
                ? 'bg-blue-700 hover:bg-blue-600 text-white'
                : 'bg-red-700 hover:bg-red-600 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          Invest 1 Intel
        </button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ResearchTrack(): React.ReactElement {
  const researchTrack = useGameStore((s) => s.researchTrack);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const phase = useGameStore((s) => s.phase);
  const opener = useGameStore((s) => s.opener);
  const blocker = useGameStore((s) => s.blocker);
  const spendResearch = useGameStore((s) => s.spendResearch);

  if (phase !== 'build') return <></>;

  const canSpend = true; // always allowed during build phase
  const openerIntel = opener.resources.intel;
  const blockerIntel = blocker.resources.intel;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
      <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 text-center">
        Arms Race — Research Tracks
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Opener track */}
        <div>
          <div className="text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Opener
          </div>
          <div className="flex flex-col gap-1.5">
            {OPENER_TIERS.map(({ tier, name, unlocks }) => (
              <TierRow
                key={tier}
                tier={tier}
                name={name}
                unlocks={unlocks}
                track={researchTrack.opener}
                faction="opener"
                currentFaction={currentTurn}
                canSpend={canSpend}
                intel={openerIntel}
                onInvest={() => spendResearch('opener', 1)}
              />
            ))}
          </div>
        </div>

        {/* Blocker track */}
        <div>
          <div className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Blocker
          </div>
          <div className="flex flex-col gap-1.5">
            {BLOCKER_TIERS.map(({ tier, name, unlocks }) => (
              <TierRow
                key={tier}
                tier={tier}
                name={name}
                unlocks={unlocks}
                track={researchTrack.blocker}
                faction="blocker"
                currentFaction={currentTurn}
                canSpend={canSpend}
                intel={blockerIntel}
                onInvest={() => spendResearch('blocker', 1)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
