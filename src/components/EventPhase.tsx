import React from 'react';
import { useGameStore } from '../store/gameStore';
import { RESPONSE_CARD_DEFS } from '../types/game';
import type { ResponseCardId, Faction } from '../types/game';

// ─── Response card display ────────────────────────────────────────────────────

interface ResponseCardProps {
  cardId: ResponseCardId;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
  faction: Faction;
}

function ResponseCard({ cardId, selected, onClick, disabled, faction }: ResponseCardProps): React.ReactElement {
  const def = RESPONSE_CARD_DEFS[cardId];
  const isOpener = faction === 'opener';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-left rounded-lg border-2 p-2 transition-all flex-1 min-w-0 ${
        selected
          ? isOpener
            ? 'border-blue-400 bg-blue-950'
            : 'border-red-400 bg-red-950'
          : disabled
          ? 'border-gray-700 bg-gray-900 opacity-50 cursor-not-allowed'
          : 'border-gray-700 bg-gray-800 hover:border-gray-500 cursor-pointer'
      }`}
    >
      <div className="text-gray-100 text-xs font-bold mb-0.5">{def.name}</div>
      <div className="text-gray-400 text-xs">{def.effect}</div>
      <div className="text-gray-600 text-xs mt-1">
        {def.whoCanPlay === 'either' ? 'Either player' : def.whoCanPlay === 'opener' ? 'Opener only' : 'Blocker only'}
      </div>
    </button>
  );
}

// ─── Selection screen for one faction ────────────────────────────────────────

interface SelectionScreenProps {
  faction: Faction;
}

function SelectionScreen({ faction }: SelectionScreenProps): React.ReactElement {
  const opener = useGameStore((s) => s.opener);
  const blocker = useGameStore((s) => s.blocker);
  const selectedResponses = useGameStore((s) => s.selectedResponses);
  const currentHeadline = useGameStore((s) => s.currentHeadline);
  const selectResponse = useGameStore((s) => s.selectResponse);
  const lockResponse = useGameStore((s) => s.lockResponse);

  const player = faction === 'opener' ? opener : blocker;
  const hand = player.responseHand;
  const selectedCard = selectedResponses[faction];
  const isOpener = faction === 'opener';

  return (
    <div>
      {/* Headline reminder */}
      {currentHeadline && (
        <div className="bg-gray-800 border border-purple-800 rounded-lg p-2 mb-3">
          <div className="text-purple-400 text-xs font-semibold mb-0.5">Active Headline</div>
          <div className="text-white text-sm font-bold">{currentHeadline.title}</div>
          <div className="text-gray-400 text-xs">{currentHeadline.description}</div>
        </div>
      )}

      <div
        className={`text-sm font-bold mb-2 ${
          isOpener ? 'text-blue-400' : 'text-red-400'
        }`}
      >
        {isOpener ? 'OPENER' : 'BLOCKER'} — Select a Response Card
      </div>

      {hand.length === 0 ? (
        <div className="text-gray-500 text-xs italic text-center py-4">
          No response cards in hand. Click Lock In to pass.
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-3">
          {hand.map((cardId) => {
            const def = RESPONSE_CARD_DEFS[cardId];
            const playable =
              def.whoCanPlay === 'either' || def.whoCanPlay === faction;
            return (
              <ResponseCard
                key={cardId}
                cardId={cardId}
                selected={selectedCard === cardId}
                onClick={() =>
                  selectResponse(faction, selectedCard === cardId ? ('' as ResponseCardId) : cardId)
                }
                disabled={!playable}
                faction={faction}
              />
            );
          })}
        </div>
      )}

      <button
        onClick={() => lockResponse(faction)}
        className={`w-full py-2 font-bold text-sm rounded-lg transition-colors ${
          isOpener
            ? 'bg-blue-700 hover:bg-blue-600 text-white'
            : 'bg-red-700 hover:bg-red-600 text-white'
        }`}
      >
        {selectedCard ? 'Lock In Selection' : 'Skip (no card)'}
      </button>

      <div className="text-gray-600 text-xs text-center mt-2">
        Cards are secret until both players reveal simultaneously.
      </div>
    </div>
  );
}

// ─── Reveal screen ────────────────────────────────────────────────────────────

function RevealScreen(): React.ReactElement {
  const selectedResponses = useGameStore((s) => s.selectedResponses);
  const currentHeadline = useGameStore((s) => s.currentHeadline);
  const eventsResolved = useGameStore((s) => s.eventsResolved);
  const resolveHeadline = useGameStore((s) => s.resolveHeadline);
  const applyResponses = useGameStore((s) => s.applyResponses);
  const endPhase = useGameStore((s) => s.endPhase);
  const round = useGameStore((s) => s.round);
  const winResult = useGameStore((s) => s.winResult);

  const openerCard = selectedResponses.opener;
  const blockerCard = selectedResponses.blocker;

  return (
    <div>
      <div className="text-purple-400 font-bold text-sm mb-3 text-center uppercase tracking-wider">
        Both Cards Revealed
      </div>

      {currentHeadline && (
        <div className="bg-gray-800 border border-purple-800 rounded-lg p-3 mb-3">
          <div className="text-purple-300 text-xs font-semibold mb-0.5">Headline</div>
          <div className="text-white text-sm font-bold">{currentHeadline.title}</div>
          <div className="text-gray-400 text-xs">{currentHeadline.description}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-blue-950 border border-blue-800 rounded-lg p-2">
          <div className="text-blue-400 text-xs font-bold mb-1">OPENER plays</div>
          {openerCard ? (
            <>
              <div className="text-white text-xs font-semibold">
                {RESPONSE_CARD_DEFS[openerCard].name}
              </div>
              <div className="text-gray-400 text-xs">
                {RESPONSE_CARD_DEFS[openerCard].effect}
              </div>
            </>
          ) : (
            <div className="text-gray-500 text-xs italic">No card played</div>
          )}
        </div>

        <div className="bg-red-950 border border-red-800 rounded-lg p-2">
          <div className="text-red-400 text-xs font-bold mb-1">BLOCKER plays</div>
          {blockerCard ? (
            <>
              <div className="text-white text-xs font-semibold">
                {RESPONSE_CARD_DEFS[blockerCard].name}
              </div>
              <div className="text-gray-400 text-xs">
                {RESPONSE_CARD_DEFS[blockerCard].effect}
              </div>
            </>
          ) : (
            <div className="text-gray-500 text-xs italic">No card played</div>
          )}
        </div>
      </div>

      {!eventsResolved ? (
        <button
          onClick={() => {
            resolveHeadline();
            applyResponses();
          }}
          disabled={!!winResult}
          className="w-full py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold text-sm rounded-lg transition-colors mb-2"
        >
          Apply All Effects
        </button>
      ) : (
        <>
          <div className="text-green-400 text-xs font-semibold text-center mb-2">
            All effects resolved.
          </div>
          <button
            onClick={endPhase}
            disabled={!!winResult}
            className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-sm rounded-lg transition-colors"
          >
            End Round {round} →
          </button>
        </>
      )}
    </div>
  );
}

// ─── Pass device interstitial ─────────────────────────────────────────────────

interface PassDeviceProps {
  from: Faction;
  to: Faction;
  onContinue: () => void;
}

function PassDevice({ to, onContinue }: PassDeviceProps): React.ReactElement {
  return (
    <div className="text-center py-4">
      <div className="text-4xl mb-3">📱</div>
      <h3 className="text-lg font-bold text-gray-200 mb-2">
        Pass device to {to === 'opener' ? 'Opener' : 'Blocker'}
      </h3>
      <p className="text-gray-500 text-xs mb-4">
        {to === 'blocker'
          ? "Opener has locked their response. Now it's Blocker's turn. Opener, look away."
          : "Blocker has locked their response. Ready to reveal."}
      </p>
      <button
        onClick={onContinue}
        className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm rounded-lg transition-colors"
      >
        I&apos;m {to === 'opener' ? 'the Opener' : 'the Blocker'} — Continue
      </button>
    </div>
  );
}

// ─── Main EventPhase ──────────────────────────────────────────────────────────

export default function EventPhase(): React.ReactElement {
  const phase = useGameStore((s) => s.phase);
  const currentHeadline = useGameStore((s) => s.currentHeadline);
  const eventsResolved = useGameStore((s) => s.eventsResolved);
  const winResult = useGameStore((s) => s.winResult);
  const round = useGameStore((s) => s.round);
  const eventSubStep = useGameStore((s) => s.eventSubStep);
  const endPhase = useGameStore((s) => s.endPhase);
  const advanceEventSubStep = useGameStore((s) => s.advanceEventSubStep);

  if (phase !== 'events') return <></>;

  return (
    <div className="flex flex-col gap-3 p-3 bg-gray-900 border-t border-gray-700 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base text-purple-400">CURRENT EVENTS</h2>
        {eventsResolved && (
          <button
            onClick={endPhase}
            disabled={!!winResult}
            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-xs rounded transition-colors"
          >
            End Round {round} →
          </button>
        )}
      </div>

      {/* Headline card shown initially */}
      {eventSubStep === 'headline' && currentHeadline && (
        <div className="flex flex-col gap-2">
          <div className="bg-gray-800 border border-purple-800 rounded-lg p-3">
            <div className="text-purple-300 text-xs font-semibold uppercase tracking-widest mb-1">
              Headline
            </div>
            <div className="text-white font-bold text-base mb-2">
              {currentHeadline.title}
            </div>
            <div className="text-gray-300 text-xs leading-relaxed">
              {currentHeadline.description}
            </div>
          </div>
          <button
            onClick={advanceEventSubStep}
            className="w-full py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold text-sm rounded-lg transition-colors"
          >
            Proceed to Response Cards
          </button>
        </div>
      )}

      {eventSubStep === 'headline' && !currentHeadline && (
        <div className="text-gray-600 text-xs italic text-center py-4">Drawing headline…</div>
      )}

      {/* Opener selects */}
      {eventSubStep === 'opener-select' && (
        <SelectionScreen faction="opener" />
      )}

      {/* Pass to blocker */}
      {eventSubStep === 'pass-to-blocker' && (
        <PassDevice
          from="opener"
          to="blocker"
          onContinue={advanceEventSubStep}
        />
      )}

      {/* Blocker selects */}
      {eventSubStep === 'blocker-select' && (
        <SelectionScreen faction="blocker" />
      )}

      {/* Reveal */}
      {(eventSubStep === 'reveal' || eventSubStep === 'done') && (
        <RevealScreen />
      )}

      {/* If eventsResolved and done, show end round button prominently */}
      {eventsResolved && eventSubStep === 'done' && (
        <div className="text-gray-600 text-xs text-center">
          Win conditions are checked at the end of each round.
        </div>
      )}
    </div>
  );
}
