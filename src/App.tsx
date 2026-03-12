import React from 'react';
import GameHeader from './components/GameHeader';
import HexGrid from './components/HexGrid';
import BuildPhase from './components/BuildPhase';
import MovePhase from './components/MovePhase';
import CombatPhase from './components/CombatPhase';
import EventPhase from './components/EventPhase';
import ProductionDials from './components/ProductionDials';
import GameSetup from './components/GameSetup';
import CommanderDraft from './components/CommanderDraft';
import CommanderBench from './components/CommanderBench';
import { useGameStore } from './store/gameStore';

export default function App(): React.ReactElement {
  const winResult = useGameStore((s) => s.winResult);
  const resetGame = useGameStore((s) => s.resetGame);
  const phase = useGameStore((s) => s.phase);
  const gamePhase = useGameStore((s) => s.gamePhase);

  // Pre-game screens
  if (gamePhase === 'setup') {
    return <GameSetup />;
  }

  if (gamePhase === 'draft') {
    return <CommanderDraft />;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Top header bar */}
      <GameHeader />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Hex grid — center stage */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <HexGrid />
        </div>

        {/* Right side panel — phase actions */}
        <aside className="w-96 flex flex-col overflow-y-auto bg-gray-900 border-l border-gray-700">
          {phase === 'build' && <BuildPhase />}
          {phase === 'move' && <MovePhase />}
          {phase === 'combat' && <CombatPhase />}
          {phase === 'events' && <EventPhase />}
        </aside>
      </div>

      {/* Commander bench */}
      <CommanderBench />

      {/* Bottom bar — production dials */}
      <ProductionDials />

      {/* Game-over overlay */}
      {winResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div
            className={`rounded-2xl p-8 text-center shadow-2xl border-2 max-w-md w-full mx-4 ${
              winResult.winner === 'opener'
                ? 'bg-blue-950 border-blue-500'
                : 'bg-red-950 border-red-500'
            }`}
          >
            <div className="text-5xl mb-4">
              {winResult.winner === 'opener' ? 'Opener wins' : 'Blocker wins'}
            </div>
            <h1
              className={`text-3xl font-bold mb-2 ${
                winResult.winner === 'opener' ? 'text-blue-300' : 'text-red-300'
              }`}
            >
              {winResult.winner === 'opener' ? 'OPENER WINS' : 'BLOCKER WINS'}
            </h1>
            <p className="text-gray-300 mb-6 text-sm">{winResult.reason}</p>
            <button
              onClick={resetGame}
              className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-lg rounded-lg transition-colors"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
