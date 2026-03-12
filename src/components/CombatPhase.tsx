import React from 'react';
import { useGameStore } from '../store/gameStore';
import type { CombatLogEntry } from '../types/game';

export default function CombatPhase(): React.ReactElement {
  const phase = useGameStore((s) => s.phase);
  const zones = useGameStore((s) => s.zones);
  const units = useGameStore((s) => s.units);
  const combatLog = useGameStore((s) => s.combatLog);
  const winResult = useGameStore((s) => s.winResult);

  const resolveAllCombat = useGameStore((s) => s.resolveAllCombat);
  const endPhase = useGameStore((s) => s.endPhase);

  if (phase !== 'combat') return <></>;

  // Find contested zones
  const allZoneIds = Object.keys(zones) as Array<keyof typeof zones>;
  const contestedZones = allZoneIds.filter((zid) => {
    const hasOpener = units.some((u) => u.zoneId === zid && u.faction === 'opener');
    const hasBlocker = units.some((u) => u.zoneId === zid && u.faction === 'blocker');
    return hasOpener && hasBlocker;
  });

  const combatResolved = combatLog.length > 0;

  return (
    <div className="flex flex-col gap-3 p-3 bg-gray-900 border-t border-gray-700 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base text-orange-400">COMBAT Phase</h2>
        <button
          onClick={endPhase}
          disabled={!combatResolved && contestedZones.length > 0 || !!winResult}
          className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-xs rounded transition-colors"
        >
          End Combat →
        </button>
      </div>

      {/* Contested zones summary */}
      {!combatResolved && (
        <>
          {contestedZones.length === 0 ? (
            <div className="text-gray-500 text-xs italic text-center py-2">
              No contested zones — no combat this round.
            </div>
          ) : (
            <div className="bg-gray-800 rounded p-2">
              <div className="text-orange-300 text-xs font-semibold mb-1">
                Contested Zones ({contestedZones.length}):
              </div>
              <div className="flex flex-wrap gap-1">
                {contestedZones.map((zid) => (
                  <span
                    key={zid}
                    className="bg-orange-900 text-orange-200 text-xs px-2 py-0.5 rounded"
                  >
                    {zones[zid].name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {contestedZones.length > 0 && (
            <button
              onClick={resolveAllCombat}
              disabled={!!winResult}
              className="w-full py-2 bg-red-700 hover:bg-red-600 text-white font-bold text-sm rounded transition-colors"
            >
              ⚔ Resolve All Combat
            </button>
          )}
        </>
      )}

      {/* Combat log */}
      {combatResolved && (
        <div className="flex flex-col gap-2">
          <div className="text-gray-300 text-xs font-semibold uppercase tracking-wider">
            Combat Results
          </div>
          {combatLog.map((entry, i) => (
            <CombatLogCard key={i} entry={entry} />
          ))}
          {combatLog.length === 0 && (
            <div className="text-gray-600 text-xs italic">No combat occurred.</div>
          )}
        </div>
      )}

      {/* Auto-advance if no contests */}
      {contestedZones.length === 0 && (
        <div className="text-gray-600 text-xs text-center italic">
          Advance to Current Events →
        </div>
      )}
    </div>
  );
}

function CombatLogCard({ entry }: { entry: CombatLogEntry }): React.ReactElement {
  return (
    <div className="bg-gray-800 rounded p-2 border border-gray-700">
      <div className="flex items-center justify-between mb-1">
        <span className="text-orange-300 font-semibold text-xs">{entry.zoneName}</span>
        {entry.controlChange && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-bold ${
              entry.controlChange === 'opener'
                ? 'bg-blue-900 text-blue-200'
                : 'bg-red-900 text-red-200'
            }`}
          >
            → {entry.controlChange === 'opener' ? 'OPENER' : 'BLOCKER'} control
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-blue-400 font-semibold">Opener rolls: </span>
          <span className="text-gray-300">[{entry.openerRolls.join(', ')}]</span>
          {entry.openerLosses > 0 && (
            <span className="text-red-400 ml-1">−{entry.openerLosses} HP</span>
          )}
        </div>
        <div>
          <span className="text-red-400 font-semibold">Blocker rolls: </span>
          <span className="text-gray-300">[{entry.blockerRolls.join(', ')}]</span>
          {entry.blockerLosses > 0 && (
            <span className="text-red-400 ml-1">−{entry.blockerLosses} HP</span>
          )}
        </div>
      </div>

      {entry.opennessChange !== 0 && (
        <div className="text-xs mt-1">
          <span className="text-gray-400">Openness: </span>
          <span
            className={entry.opennessChange > 0 ? 'text-green-400' : 'text-red-400'}
          >
            {entry.opennessChange > 0 ? '+' : ''}{entry.opennessChange}%
          </span>
        </div>
      )}
    </div>
  );
}
