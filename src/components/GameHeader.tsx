import React from 'react';
import { useGameStore } from '../store/gameStore';
import { COMMANDER_DEFS } from '../types/game';

const PHASE_LABELS: Record<string, string> = {
  build: 'BUILD',
  move: 'MOVE',
  combat: 'COMBAT',
  events: 'CURRENT EVENTS',
};

export default function GameHeader(): React.ReactElement {
  const round = useGameStore((s) => s.round);
  const phase = useGameStore((s) => s.phase);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const opener = useGameStore((s) => s.opener);
  const blocker = useGameStore((s) => s.blocker);
  const winResult = useGameStore((s) => s.winResult);
  const setupMode = useGameStore((s) => s.setupMode);

  const openerCmdId = opener.commander.activeCommanderId;
  const blockerCmdId = blocker.commander.activeCommanderId;
  const openerCmdName =
    openerCmdId && openerCmdId !== 'interim'
      ? COMMANDER_DEFS[openerCmdId].name.split(' ').pop() ?? ''
      : openerCmdId === 'interim'
      ? 'Interim'
      : '—';
  const blockerCmdName =
    blockerCmdId && blockerCmdId !== 'interim'
      ? COMMANDER_DEFS[blockerCmdId].name.split(' ').pop() ?? ''
      : blockerCmdId === 'interim'
      ? 'Interim'
      : '—';

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-4 py-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Opener info */}
        <div
          className={`flex items-center gap-3 px-3 py-1 rounded border ${
            currentTurn === 'opener' && !winResult
              ? 'border-blue-500 bg-blue-950'
              : 'border-gray-700 bg-gray-900'
          }`}
        >
          <span className="text-blue-400 font-bold text-sm uppercase tracking-wider">
            Opener
          </span>
          <span className="text-gray-300 text-sm">
            Morale:{' '}
            <span
              className={
                opener.resources.morale <= 20 ? 'text-red-400 font-bold' : 'text-blue-300'
              }
            >
              {opener.resources.morale}
            </span>
          </span>
          <span className="text-gray-500 text-xs">
            Cmdr: {openerCmdName}
          </span>
          <span className="text-gray-600 text-xs">
            {opener.resources.steel}S {opener.resources.fuel}F {opener.resources.intel}I
          </span>
        </div>

        {/* Round / Phase */}
        <div className="text-center">
          <div className="text-yellow-400 font-bold text-lg tracking-widest">
            THE SUEZ CANAL
          </div>
          <div className="text-gray-400 text-xs">
            Round {round}/20 &nbsp;|&nbsp;
            <span className="text-yellow-300 font-semibold">{PHASE_LABELS[phase]}</span>
            &nbsp;|&nbsp;
            <span className="text-gray-500 text-xs">
              {setupMode === 'campaign' ? 'Campaign' : 'Random'}
            </span>
          </div>
          {currentTurn && !winResult && (
            <div
              className={`text-xs font-semibold mt-0.5 ${
                currentTurn === 'opener' ? 'text-blue-400' : 'text-red-400'
              }`}
            >
              {currentTurn === 'opener' ? 'OPENER' : 'BLOCKER'} acting
            </div>
          )}
        </div>

        {/* Blocker info */}
        <div
          className={`flex items-center gap-3 px-3 py-1 rounded border ${
            currentTurn === 'blocker' && !winResult
              ? 'border-red-500 bg-red-950'
              : 'border-gray-700 bg-gray-900'
          }`}
        >
          <span className="text-red-400 font-bold text-sm uppercase tracking-wider">
            Blocker
          </span>
          <span className="text-gray-300 text-sm">
            Morale:{' '}
            <span
              className={
                blocker.resources.morale <= 20 ? 'text-red-400 font-bold' : 'text-red-300'
              }
            >
              {blocker.resources.morale}
            </span>
          </span>
          <span className="text-gray-500 text-xs">
            Cmdr: {blockerCmdName}
          </span>
          <span className="text-gray-600 text-xs">
            {blocker.resources.steel}S {blocker.resources.fuel}F {blocker.resources.intel}I
          </span>
        </div>
      </div>

      {/* Win banner */}
      {winResult && (
        <div
          className={`mt-2 text-center py-2 px-4 rounded font-bold text-lg ${
            winResult.winner === 'opener'
              ? 'bg-blue-900 text-blue-200 border border-blue-500'
              : 'bg-red-900 text-red-200 border border-red-500'
          }`}
        >
          {winResult.winner === 'opener' ? 'OPENER WINS' : 'BLOCKER WINS'} —{' '}
          {winResult.reason}
        </div>
      )}
    </header>
  );
}
