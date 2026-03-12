import React from 'react';
import { useGameStore } from '../store/gameStore';
import { COMMANDER_DEFS } from '../types/game';
import type { Faction, CommanderSlot } from '../types/game';

interface BenchSideProps {
  faction: Faction;
}

function BenchSide({ faction }: BenchSideProps): React.ReactElement {
  const phase = useGameStore((s) => s.phase);
  const opener = useGameStore((s) => s.opener);
  const blocker = useGameStore((s) => s.blocker);
  const useCommanderAbility = useGameStore((s) => s.useCommanderAbility);

  const player = faction === 'opener' ? opener : blocker;
  const { commander } = player;
  const morale = player.resources.morale;

  const isOpener = faction === 'opener';
  const accentColor = isOpener ? 'text-blue-400' : 'text-red-400';
  const bgAccent = isOpener ? 'bg-blue-950 border-blue-800' : 'bg-red-950 border-red-800';

  const activeCmd = commander.activeCommanderId;
  const activeDef =
    activeCmd && activeCmd !== 'interim'
      ? COMMANDER_DEFS[activeCmd]
      : null;

  const canUseAbility =
    phase === 'build' &&
    !commander.abilityUsedThisRound &&
    !commander.interimActive &&
    activeCmd !== null &&
    activeCmd !== 'interim' &&
    morale >= 10;

  function slotLabel(slot: CommanderSlot): string {
    const def = COMMANDER_DEFS[slot.commanderId];
    return def.name;
  }

  return (
    <div className={`rounded-lg border p-2 ${bgAccent}`}>
      <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${accentColor}`}>
        {isOpener ? 'Opener' : 'Blocker'} — Commander
      </div>

      {/* Active commander */}
      <div className="mb-1.5">
        {commander.interimActive || activeCmd === 'interim' ? (
          <div>
            <div className="text-yellow-400 text-xs font-bold">INTERIM COMMANDER</div>
            <div className="text-gray-400 text-xs italic">
              The mission continues. (No active ability)
            </div>
          </div>
        ) : activeDef ? (
          <div>
            <div className="text-gray-100 text-xs font-semibold">{activeDef.name}</div>
            <div className="text-gray-400 text-xs">{activeDef.passive}</div>
          </div>
        ) : (
          <div className="text-gray-500 text-xs italic">No commander assigned</div>
        )}
      </div>

      {/* Bench slots */}
      <div className="flex gap-1.5 mb-1.5">
        {commander.bench.map((slot) => (
          <div
            key={slot.commanderId}
            title={slotLabel(slot)}
            className={`flex-1 rounded px-1 py-0.5 text-center text-xs font-semibold border ${
              slot.status === 'active'
                ? isOpener
                  ? 'bg-blue-800 border-blue-600 text-blue-100'
                  : 'bg-red-800 border-red-600 text-red-100'
                : slot.status === 'dead'
                ? 'bg-gray-900 border-gray-700 text-gray-600 line-through'
                : 'bg-gray-800 border-gray-700 text-gray-400'
            }`}
          >
            {slot.status === 'dead' ? (
              <span>✕</span>
            ) : (
              <span>
                {slot.rank === 1 ? '★' : slot.rank === 2 ? '2' : '3'}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Ability button */}
      {!commander.interimActive && activeCmd && activeCmd !== 'interim' && (
        <button
          onClick={() => useCommanderAbility(faction)}
          disabled={!canUseAbility}
          title={activeDef?.active ?? ''}
          className={`w-full py-1 text-xs font-bold rounded transition-colors ${
            canUseAbility
              ? 'bg-purple-700 hover:bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
        >
          {commander.abilityUsedThisRound
            ? 'Ability used'
            : `Use Ability (10 Morale)`}
        </button>
      )}
    </div>
  );
}

export default function CommanderBench(): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-2 px-3 pb-2 pt-1">
      <BenchSide faction="opener" />
      <BenchSide faction="blocker" />
    </div>
  );
}
