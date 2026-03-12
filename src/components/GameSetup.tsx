import React from 'react';
import { useGameStore } from '../store/gameStore';

export default function GameSetup(): React.ReactElement {
  const setupMode = useGameStore((s) => s.setupMode);
  const setSetupMode = useGameStore((s) => s.setSetupMode);
  const beginDraft = useGameStore((s) => s.beginDraft);

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center z-50 p-6">
      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="text-6xl font-black tracking-widest text-yellow-400 mb-2 uppercase">
          The Suez Canal
        </h1>
        <p className="text-gray-400 text-lg tracking-wide">
          A two-player asymmetric geopolitical crisis game
        </p>
      </div>

      {/* Mode selection */}
      <div className="w-full max-w-2xl mb-10">
        <h2 className="text-gray-300 text-sm font-semibold uppercase tracking-widest text-center mb-5">
          Select Headline Deck Mode
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {/* Randomized */}
          <button
            onClick={() => setSetupMode('randomized')}
            className={`rounded-xl p-5 border-2 text-left transition-all ${
              setupMode === 'randomized'
                ? 'border-yellow-500 bg-yellow-950'
                : 'border-gray-700 bg-gray-900 hover:border-gray-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                  setupMode === 'randomized'
                    ? 'border-yellow-400 bg-yellow-400'
                    : 'border-gray-500'
                }`}
              />
              <span className="text-white font-bold text-base">Randomized</span>
              <span className="text-yellow-500 text-xs font-semibold ml-auto">COMPETITIVE</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Headlines are drawn randomly each round. Maximum replayability — no two games
              play the same. Ideal for competitive hotseat sessions.
            </p>
          </button>

          {/* Scripted Campaign */}
          <button
            onClick={() => setSetupMode('campaign')}
            className={`rounded-xl p-5 border-2 text-left transition-all ${
              setupMode === 'campaign'
                ? 'border-blue-500 bg-blue-950'
                : 'border-gray-700 bg-gray-900 hover:border-gray-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                  setupMode === 'campaign'
                    ? 'border-blue-400 bg-blue-400'
                    : 'border-gray-500'
                }`}
              />
              <span className="text-white font-bold text-base">Scripted Campaign</span>
              <span className="text-blue-400 text-xs font-semibold ml-auto">NARRATIVE</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              A fixed 20-round story arc: Tension → Escalation → Crisis → Resolution.
              Neither side has a systematic advantage — the story ends on your choices.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-1 text-xs">
              {[
                { label: 'Rounds 1–5', desc: 'Tension', color: 'text-blue-400' },
                { label: 'Rounds 6–12', desc: 'Escalation', color: 'text-yellow-400' },
                { label: 'Rounds 13–17', desc: 'Crisis', color: 'text-orange-400' },
                { label: 'Rounds 18–20', desc: 'Resolution', color: 'text-red-400' },
              ].map(({ label, desc, color }) => (
                <div key={label} className="flex gap-1">
                  <span className="text-gray-500">{label}:</span>
                  <span className={color}>{desc}</span>
                </div>
              ))}
            </div>
          </button>
        </div>
      </div>

      {/* Faction overview */}
      <div className="w-full max-w-2xl mb-10 grid grid-cols-2 gap-4">
        <div className="bg-blue-950 border border-blue-800 rounded-lg p-4">
          <div className="text-blue-300 font-bold text-sm uppercase tracking-wider mb-1">
            The Opener
          </div>
          <p className="text-gray-400 text-xs mb-2">
            Maritime coalition. Keep commerce flowing. Starts with 2 cargo escorts + 1 destroyer.
          </p>
          <div className="text-blue-400 text-xs">
            Special: Convoy Shield (once/round, half damage)
          </div>
        </div>
        <div className="bg-red-950 border border-red-800 rounded-lg p-4">
          <div className="text-red-300 font-bold text-sm uppercase tracking-wider mb-1">
            The Blocker
          </div>
          <p className="text-gray-400 text-xs mb-2">
            Sabotage &amp; force. Shut down the canal. Starts with 2 patrol boats + 1 missile silo.
          </p>
          <div className="text-red-400 text-xs">
            Special: Covert Op (once/round, free obstruction token)
          </div>
        </div>
      </div>

      {/* Begin draft button */}
      <button
        onClick={beginDraft}
        className="px-12 py-4 bg-yellow-600 hover:bg-yellow-500 text-white font-black text-xl uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-yellow-900/40 hover:shadow-yellow-700/40"
      >
        Begin Draft
      </button>
      <p className="text-gray-600 text-xs mt-3">
        Next: commanders are drafted in secret, then revealed simultaneously.
      </p>
    </div>
  );
}
