import React from 'react';
import { useGameStore } from '../store/gameStore';

export default function MovePhase(): React.ReactElement {
  const phase = useGameStore((s) => s.phase);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const units = useGameStore((s) => s.units);
  const selectedUnitId = useGameStore((s) => s.selectedUnitId);
  const zones = useGameStore((s) => s.zones);
  const winResult = useGameStore((s) => s.winResult);

  const openerFuel = useGameStore((s) => s.opener.resources.fuel);
  const blockerFuel = useGameStore((s) => s.blocker.resources.fuel);
  const selectUnit = useGameStore((s) => s.selectUnit);
  const endPhase = useGameStore((s) => s.endPhase);

  if (phase !== 'move') return <></>;

  const isOpener = currentTurn === 'opener';
  const myUnits = units.filter((u) => u.faction === currentTurn);
  const fuel = isOpener ? openerFuel : blockerFuel;

  return (
    <div className="flex flex-col gap-3 p-3 bg-gray-900 border-t border-gray-700 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className={`font-bold text-base ${isOpener ? 'text-blue-400' : 'text-red-400'}`}>
          {isOpener ? 'OPENER' : 'BLOCKER'} — Move Phase
        </h2>
        <button
          onClick={endPhase}
          disabled={!!winResult}
          className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-xs rounded transition-colors"
        >
          End Move Phase →
        </button>
      </div>

      <div className="text-gray-400 text-xs">
        ⛽ Fuel available: <span className="text-orange-300 font-semibold">{fuel}</span>
        &nbsp;— Movement costs 1 Fuel per zone.
      </div>

      <div className="text-gray-500 text-xs bg-gray-800 rounded p-2">
        <strong className="text-gray-300">How to move:</strong> Click a unit below (or on the
        board) to select it. Green-highlighted zones on the board show valid destinations.
        Click a destination zone to move.
      </div>

      {/* Unit list */}
      <div className="flex flex-col gap-1">
        {myUnits.length === 0 && (
          <div className="text-gray-600 text-xs italic text-center py-2">
            No units to move.
          </div>
        )}
        {myUnits.map((unit) => {
          const isSelected = unit.id === selectedUnitId;
          const zone = zones[unit.zoneId];
          return (
            <button
              key={unit.id}
              onClick={() => selectUnit(isSelected ? null : unit.id)}
              disabled={unit.moved || !!winResult}
              className={`flex items-center justify-between px-3 py-1.5 rounded text-xs transition-colors ${
                isSelected
                  ? 'bg-yellow-800 border border-yellow-500 text-white'
                  : unit.moved
                  ? 'bg-gray-800 text-gray-600 cursor-default'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
              }`}
            >
              <span>
                <span className={`font-semibold ${isOpener ? 'text-blue-300' : 'text-red-300'}`}>
                  {unit.type
                    .replace('-', ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
                {' '}
                <span className="text-gray-400">HP {unit.hp}/{unit.maxHp}</span>
              </span>
              <span className="text-gray-400">
                @ {zone?.name ?? unit.zoneId}
                {unit.moved && <span className="ml-2 text-gray-600 italic">moved</span>}
              </span>
            </button>
          );
        })}
      </div>

      {selectedUnitId && (
        <div className="text-yellow-400 text-xs text-center font-semibold animate-pulse">
          Unit selected — click a highlighted zone on the board to move
        </div>
      )}
    </div>
  );
}
