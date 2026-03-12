import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { UNIT_STATS, isResearchUnlocked } from '../types/game';
import type { UnitType, ZoneId } from '../types/game';
import ResearchTrack from './ResearchTrack';

const ALL_UNIT_TYPES: UnitType[] = [
  'patrol-boat',
  'destroyer',
  'frigate',
  'carrier',
  'cargo-escort',
  'mine-layer',
];

export default function BuildPhase(): React.ReactElement {
  const phase = useGameStore((s) => s.phase);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const opener = useGameStore((s) => s.opener);
  const blocker = useGameStore((s) => s.blocker);
  const zones = useGameStore((s) => s.zones);
  const buildTargetZoneId = useGameStore((s) => s.buildTargetZoneId);
  const winResult = useGameStore((s) => s.winResult);
  const _resourcesCollected = useGameStore((s) => s._resourcesCollectedThisBuild);
  const researchTrack = useGameStore((s) => s.researchTrack);

  const collectResources = useGameStore((s) => s.collectResources);
  const buildUnit = useGameStore((s) => s.buildUnit);
  const buildFortification = useGameStore((s) => s.buildFortification);
  const placeObstruction = useGameStore((s) => s.placeObstruction);
  const clearObstruction = useGameStore((s) => s.clearObstruction);
  const setBuildTargetZone = useGameStore((s) => s.setBuildTargetZone);
  const endPhase = useGameStore((s) => s.endPhase);

  const [selectedBuildType, setSelectedBuildType] = useState<UnitType | null>(null);

  if (phase !== 'build') return <></>;

  const player = currentTurn === 'opener' ? opener : blocker;
  const { steel, fuel, intel, morale } = player.resources;
  const rates = player.productionRates;

  const isOpener = currentTurn === 'opener';
  const myTrack = researchTrack[currentTurn];

  // Zone options for placing units: exclude enemy-controlled zones
  const validBuildZones = Object.values(zones).filter((z) => {
    if (z.control === (isOpener ? 'blocker' : 'opener')) return false;
    return true;
  });

  function isUnitResearchLocked(ut: UnitType): boolean {
    const stats = UNIT_STATS[ut];
    if (!stats.researchTier) return false;
    return !isResearchUnlocked(myTrack, stats.researchTier as 1 | 2 | 3);
  }

  function handleBuild() {
    if (!selectedBuildType || !buildTargetZoneId) return;
    buildUnit(selectedBuildType, buildTargetZoneId);
    setSelectedBuildType(null);
  }

  return (
    <div className="flex flex-col gap-3 p-3 bg-gray-900 border-t border-gray-700 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className={`font-bold text-base ${isOpener ? 'text-blue-400' : 'text-red-400'}`}>
          {isOpener ? 'OPENER' : 'BLOCKER'} — Build Phase
        </h2>
        <button
          onClick={endPhase}
          disabled={!!winResult}
          className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-xs rounded transition-colors"
        >
          End Build Phase →
        </button>
      </div>

      {/* Resources */}
      <div className="grid grid-cols-4 gap-2">
        {(
          [
            { key: 'steel', label: 'Steel', color: 'text-gray-300', val: steel, rate: rates.steel },
            { key: 'fuel', label: 'Fuel', color: 'text-orange-300', val: fuel, rate: rates.fuel },
            { key: 'intel', label: 'Intel', color: 'text-cyan-300', val: intel, rate: rates.intel },
            { key: 'morale', label: 'Morale', color: 'text-pink-300', val: morale, rate: rates.morale },
          ] as const
        ).map(({ key, label, color, val, rate }) => (
          <div key={key} className="bg-gray-800 rounded p-2 text-center">
            <div className={`${color} font-semibold text-xs`}>{label}</div>
            <div className="text-white font-bold text-lg">{val}</div>
            <div className="text-gray-500 text-xs">+{rate}/t</div>
          </div>
        ))}
      </div>

      {/* Collect resources */}
      <button
        onClick={collectResources}
        disabled={_resourcesCollected || !!winResult}
        className={`w-full py-1.5 rounded font-semibold text-sm transition-colors ${
          _resourcesCollected
            ? 'bg-gray-700 text-gray-500 cursor-default'
            : 'bg-green-700 hover:bg-green-600 text-white'
        }`}
      >
        {_resourcesCollected ? 'Resources Collected' : 'Collect Resources'}
      </button>

      <div className="grid grid-cols-2 gap-2">
        {/* Build unit section */}
        <div className="bg-gray-800 rounded p-2">
          <div className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wider">
            Build Unit
          </div>

          <div className="flex flex-col gap-1 mb-2">
            {ALL_UNIT_TYPES.map((ut) => {
              const stats = UNIT_STATS[ut];
              const restricted = stats.factionOnly && stats.factionOnly !== currentTurn;
              if (restricted) return null;
              const affordable = steel >= stats.steelCost;
              const researchLocked = isUnitResearchLocked(ut);
              const available = affordable && !researchLocked;
              return (
                <button
                  key={ut}
                  onClick={() => setSelectedBuildType(selectedBuildType === ut ? null : ut)}
                  disabled={!available || !!winResult}
                  className={`text-left px-2 py-1 rounded text-xs transition-colors ${
                    selectedBuildType === ut
                      ? 'bg-yellow-700 text-white'
                      : available
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                      : 'bg-gray-900 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <span className="font-semibold">{stats.label}</span>
                  <span className="ml-1 text-gray-400">
                    {stats.steelCost} Steel | {stats.combatDice}d6 | HP{stats.maxHp}
                  </span>
                  {researchLocked && (
                    <span className="ml-1 text-yellow-700 text-xs">
                      [T{stats.researchTier} req]
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Zone picker */}
          <div className="text-gray-500 text-xs mb-1">
            Deploy to:{' '}
            <span className="text-yellow-400">
              {buildTargetZoneId
                ? zones[buildTargetZoneId]?.name ?? buildTargetZoneId
                : 'click a zone on the board'}
            </span>
          </div>

          <select
            className="w-full bg-gray-700 text-gray-200 text-xs rounded px-1 py-1 mb-2"
            value={buildTargetZoneId ?? ''}
            onChange={(e) =>
              setBuildTargetZone(e.target.value ? (e.target.value as ZoneId) : null)
            }
          >
            <option value="">— select zone —</option>
            {validBuildZones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleBuild}
            disabled={!selectedBuildType || !buildTargetZoneId || !!winResult}
            className="w-full py-1 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-bold rounded transition-colors"
          >
            Build{selectedBuildType ? ` ${UNIT_STATS[selectedBuildType].label}` : ''}
          </button>
        </div>

        {/* Special actions */}
        <div className="bg-gray-800 rounded p-2 flex flex-col gap-2">
          <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
            Zone Actions
          </div>

          {/* Fortification */}
          <div>
            <div className="text-gray-500 text-xs mb-1">Fortify zone (3 Steel):</div>
            <select
              className="w-full bg-gray-700 text-gray-200 text-xs rounded px-1 py-1 mb-1"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  buildFortification(e.target.value as ZoneId);
                  e.target.value = '';
                }
              }}
              disabled={steel < 3 || !!winResult}
            >
              <option value="">— fortify zone —</option>
              {validBuildZones
                .filter((z) => z.category !== 'sea' && z.fortificationLevel < 3)
                .map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} (Lvl {z.fortificationLevel})
                  </option>
                ))}
            </select>
          </div>

          {/* Obstruction (Blocker) */}
          {!isOpener && (
            <div>
              <div className="text-gray-500 text-xs mb-1">Place obstruction (2 Steel):</div>
              <select
                className="w-full bg-gray-700 text-gray-200 text-xs rounded px-1 py-1"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    placeObstruction(e.target.value as ZoneId);
                    e.target.value = '';
                  }
                }}
                disabled={steel < 2 || !!winResult}
              >
                <option value="">— obstruct canal zone —</option>
                {Object.values(zones)
                  .filter((z) => z.category === 'canal')
                  .map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.openness}%)
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Clear obstruction (Opener) */}
          {isOpener && (
            <div>
              <div className="text-gray-500 text-xs mb-1">Clear obstruction (2 Steel + 1 Fuel):</div>
              <select
                className="w-full bg-gray-700 text-gray-200 text-xs rounded px-1 py-1"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    clearObstruction(e.target.value as ZoneId);
                    e.target.value = '';
                  }
                }}
                disabled={steel < 2 || fuel < 1 || !!winResult}
              >
                <option value="">— clear obstruction —</option>
                {Object.values(zones)
                  .filter((z) => z.category === 'canal' && z.obstructionTokens > 0)
                  .map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.obstructionTokens} tokens)
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Research Track */}
      <ResearchTrack />

      <div className="text-gray-600 text-xs text-center">
        Click a zone on the board to select it as your build/action target.
      </div>
    </div>
  );
}
