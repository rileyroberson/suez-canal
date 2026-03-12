import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { COMMANDER_DEFS } from '../types/game';
import type { CommanderId, Faction } from '../types/game';

const OPENER_COMMANDERS: CommanderId[] = ['hayes', 'malik', 'sato'];
const BLOCKER_COMMANDERS: CommanderId[] = ['vasquez', 'khoury', 'chen'];

// ─── Commander card ───────────────────────────────────────────────────────────

interface CommanderCardProps {
  commanderId: CommanderId;
  rank: number | null;
  isSelected: boolean;
  onClick: () => void;
  faction: Faction;
  readOnly?: boolean;
}

function CommanderCard({
  commanderId,
  rank,
  isSelected,
  onClick,
  faction,
  readOnly,
}: CommanderCardProps): React.ReactElement {
  const def = COMMANDER_DEFS[commanderId];
  const accent = faction === 'opener' ? 'blue' : 'red';

  return (
    <button
      onClick={onClick}
      disabled={readOnly}
      className={`w-full text-left rounded-xl border-2 p-3 transition-all ${
        isSelected
          ? `border-${accent}-400 bg-${accent}-950`
          : rank !== null
          ? `border-${accent}-700 bg-gray-900`
          : 'border-gray-700 bg-gray-900 hover:border-gray-500'
      } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
      style={{
        borderColor: isSelected
          ? faction === 'opener'
            ? '#60a5fa'
            : '#f87171'
          : rank !== null
          ? faction === 'opener'
            ? '#1d4ed8'
            : '#b91c1c'
          : undefined,
      }}
    >
      <div className="flex items-start gap-2">
        {/* Rank badge */}
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5 ${
            rank === 1
              ? 'bg-yellow-500 text-black'
              : rank === 2
              ? 'bg-gray-500 text-white'
              : rank === 3
              ? 'bg-orange-800 text-white'
              : 'bg-gray-800 text-gray-500'
          }`}
        >
          {rank ?? '—'}
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="font-bold text-sm"
            style={{ color: faction === 'opener' ? '#93c5fd' : '#fca5a5' }}
          >
            {def.name}
          </div>
          <div className="text-gray-500 text-xs mb-1">{def.flagshipType}</div>
          <div className="text-gray-300 text-xs mb-0.5">
            <span className="text-gray-500">Passive: </span>
            {def.passive}
          </div>
          <div className="text-gray-300 text-xs">
            <span className="text-gray-500">Active (10 Morale): </span>
            {def.active}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Rank ordering panel ──────────────────────────────────────────────────────

interface RankingPanelProps {
  faction: Faction;
  commanders: CommanderId[];
  order: CommanderId[];
  onMoveUp: (id: CommanderId) => void;
  onMoveDown: (id: CommanderId) => void;
  locked: boolean;
  onLock: () => void;
}

function RankingPanel({
  faction,
  commanders,
  order,
  onMoveUp,
  onMoveDown,
  locked,
  onLock,
}: RankingPanelProps): React.ReactElement {
  const [selectedId, setSelectedId] = useState<CommanderId | null>(null);

  // Ensure all commanders are in order
  const fullOrder = [...order];
  for (const c of commanders) {
    if (!fullOrder.includes(c)) fullOrder.push(c);
  }

  function handleCardClick(id: CommanderId) {
    if (locked) return;
    if (selectedId === id) {
      setSelectedId(null);
    } else if (selectedId) {
      // Swap selected and clicked
      const newOrder = [...fullOrder];
      const idxA = newOrder.indexOf(selectedId);
      const idxB = newOrder.indexOf(id);
      if (idxA !== -1 && idxB !== -1) {
        [newOrder[idxA], newOrder[idxB]] = [newOrder[idxB], newOrder[idxA]];
        // Propagate swap by calling onMoveUp/Down enough times (simplified: use onMoveUp approach)
        // Instead, we'll call the store directly through a prop
        for (let i = 0; i < Math.abs(idxA - idxB); i++) {
          if (idxA < idxB) onMoveDown(selectedId);
          else onMoveUp(selectedId);
        }
      }
      setSelectedId(null);
    } else {
      setSelectedId(id);
    }
  }

  const isOpener = faction === 'opener';

  return (
    <div className={`flex flex-col gap-3 ${isOpener ? '' : ''}`}>
      <div
        className={`text-sm font-bold uppercase tracking-wider text-center py-2 rounded ${
          isOpener
            ? 'text-blue-300 bg-blue-950 border border-blue-800'
            : 'text-red-300 bg-red-950 border border-red-800'
        }`}
      >
        {isOpener ? 'OPENER' : 'BLOCKER'} — Rank Your Commanders
      </div>

      {locked ? (
        <div className="text-center text-green-400 text-sm font-semibold py-2">
          Bench locked in.
        </div>
      ) : (
        <p className="text-gray-500 text-xs text-center">
          {selectedId
            ? 'Click another commander to swap ranks.'
            : 'Click a commander to select, then click another to swap.'}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {fullOrder.map((id, i) => (
          <div key={id} className="flex items-center gap-2">
            <CommanderCard
              commanderId={id}
              rank={(i + 1) as 1 | 2 | 3}
              isSelected={selectedId === id}
              onClick={() => handleCardClick(id)}
              faction={faction}
              readOnly={locked}
            />
            {!locked && (
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => onMoveUp(id)}
                  disabled={i === 0}
                  className="w-6 h-6 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded text-xs text-white"
                >
                  ▲
                </button>
                <button
                  onClick={() => onMoveDown(id)}
                  disabled={i === fullOrder.length - 1}
                  className="w-6 h-6 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded text-xs text-white"
                >
                  ▼
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-gray-600 text-xs text-center">
        Rank 1 = Active Commander &nbsp;|&nbsp; Rank 2 = First Successor &nbsp;|&nbsp; Rank 3 = Last Resort
      </div>

      {!locked && (
        <button
          onClick={onLock}
          className={`w-full py-3 font-black text-base uppercase tracking-widest rounded-lg transition-all ${
            isOpener
              ? 'bg-blue-700 hover:bg-blue-600 text-white'
              : 'bg-red-700 hover:bg-red-600 text-white'
          }`}
        >
          Lock In Bench
        </button>
      )}
    </div>
  );
}

// ─── Main draft screen ────────────────────────────────────────────────────────

export default function CommanderDraft(): React.ReactElement {
  const commanderDraft = useGameStore((s) => s.commanderDraft);
  const setDraftOrder = useGameStore((s) => s.setDraftOrder);
  const lockDraft = useGameStore((s) => s.lockDraft);
  const startGame = useGameStore((s) => s.startGame);

  const {
    openerLocked,
    blockerLocked,
    openerOrder,
    blockerOrder,
    currentDraftingFaction,
  } = commanderDraft;

  const bothLocked = openerLocked && blockerLocked;

  function moveUp(faction: Faction, id: CommanderId) {
    const order = faction === 'opener' ? [...openerOrder] : [...blockerOrder];
    const idx = order.indexOf(id);
    if (idx > 0) {
      [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
      setDraftOrder(faction, order);
    }
  }

  function moveDown(faction: Faction, id: CommanderId) {
    const order = faction === 'opener' ? [...openerOrder] : [...blockerOrder];
    const idx = order.indexOf(id);
    if (idx < order.length - 1) {
      [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
      setDraftOrder(faction, order);
    }
  }

  // Determine what to show based on hotseat draft state
  const showPassToBlocker = openerLocked && !blockerLocked && currentDraftingFaction === 'blocker';
  const showReveal = bothLocked;

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col z-50 overflow-y-auto">
      <div className="text-center py-6 px-4">
        <h1 className="text-4xl font-black tracking-widest text-yellow-400 uppercase">
          Commander Draft
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Secretly rank your commanders, then reveal simultaneously.
        </p>
      </div>

      <div className="flex-1 px-4 pb-6">
        {/* State: Opener drafting (or before any lock) */}
        {!openerLocked && currentDraftingFaction === 'opener' && (
          <div className="max-w-lg mx-auto">
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-4 text-center">
              <span className="text-yellow-400 font-semibold text-sm">
                OPENER — rank your commanders. Blocker, look away.
              </span>
            </div>
            <RankingPanel
              faction="opener"
              commanders={OPENER_COMMANDERS}
              order={openerOrder}
              onMoveUp={(id) => moveUp('opener', id)}
              onMoveDown={(id) => moveDown('opener', id)}
              locked={openerLocked}
              onLock={() => lockDraft('opener')}
            />
          </div>
        )}

        {/* Pass device interstitial */}
        {openerLocked && !blockerLocked && !showPassToBlocker && currentDraftingFaction === 'blocker' && (
          <div className="max-w-md mx-auto text-center py-20">
            <div className="text-6xl mb-6">📱</div>
            <h2 className="text-2xl font-bold text-gray-200 mb-3">Pass device to Blocker</h2>
            <p className="text-gray-500 mb-8">
              Opener has locked their bench. Now it&apos;s Blocker&apos;s turn to rank their commanders.
              Opener, look away.
            </p>
          </div>
        )}

        {/* Blocker drafting */}
        {openerLocked && !blockerLocked && currentDraftingFaction === 'blocker' && (
          <div className="max-w-lg mx-auto">
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-4 text-center">
              <span className="text-yellow-400 font-semibold text-sm">
                BLOCKER — rank your commanders. Opener, look away.
              </span>
            </div>
            <RankingPanel
              faction="blocker"
              commanders={BLOCKER_COMMANDERS}
              order={blockerOrder}
              onMoveUp={(id) => moveUp('blocker', id)}
              onMoveDown={(id) => moveDown('blocker', id)}
              locked={blockerLocked}
              onLock={() => lockDraft('blocker')}
            />
          </div>
        )}

        {/* Both locked — reveal */}
        {showReveal && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 mb-6 text-center">
              <span className="text-green-400 font-semibold text-sm">
                Both benches locked. REVEAL — show both players.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Opener bench */}
              <div>
                <div className="text-blue-300 font-bold text-sm uppercase tracking-wider text-center mb-3">
                  Opener Bench
                </div>
                <div className="flex flex-col gap-2">
                  {openerOrder.map((id, i) => (
                    <CommanderCard
                      key={id}
                      commanderId={id}
                      rank={(i + 1) as 1 | 2 | 3}
                      isSelected={false}
                      onClick={() => {}}
                      faction="opener"
                      readOnly
                    />
                  ))}
                </div>
              </div>

              {/* Blocker bench */}
              <div>
                <div className="text-red-300 font-bold text-sm uppercase tracking-wider text-center mb-3">
                  Blocker Bench
                </div>
                <div className="flex flex-col gap-2">
                  {blockerOrder.map((id, i) => (
                    <CommanderCard
                      key={id}
                      commanderId={id}
                      rank={(i + 1) as 1 | 2 | 3}
                      isSelected={false}
                      onClick={() => {}}
                      faction="blocker"
                      readOnly
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-gray-500 text-sm mb-4">
                Study your opponent&apos;s bench. They can plan assassinations — and so can you.
              </p>
              <button
                onClick={startGame}
                className="px-16 py-4 bg-yellow-600 hover:bg-yellow-500 text-white font-black text-xl uppercase tracking-widest rounded-xl transition-all shadow-lg"
              >
                Start Game
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
