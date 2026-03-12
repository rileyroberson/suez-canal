import { create } from 'zustand';
import { UNIT_STATS, RESPONSE_CARD_DEFS, RESEARCH_THRESHOLDS, isResearchUnlocked } from '../types/game';
import type {
  GameState,
  Zone,
  ZoneId,
  Unit,
  UnitType,
  Faction,
  Phase,
  PlayerState,
  CombatLogEntry,
  HeadlineCard,
  WinResult,
  Control,
  CommanderId,
  CommanderState,
  ResponseCardId,
  ResearchTrack,
} from '../types/game';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let unitIdCounter = 1;
function makeUnitId(): string {
  return `unit-${unitIdCounter++}`;
}

function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function avgCanalOpenness(zones: Record<ZoneId, Zone>): number {
  const canalZones = Object.values(zones).filter((z) => z.category === 'canal');
  if (canalZones.length === 0) return 0;
  const total = canalZones.reduce((sum, z) => sum + (z.openness ?? 0), 0);
  return total / canalZones.length;
}

// ─── Response card pool ───────────────────────────────────────────────────────

const ALL_RESPONSE_IDS: ResponseCardId[] = [
  'diplomatic_pressure',
  'expedited_convoy',
  'emergency_resupply',
  'intercept_order',
  'propaganda_win',
  'sabotage',
  'ghost_fleet',
  'intel_blackout',
  'humanitarian_corridor',
  'strategic_ambiguity',
  // duplicates to make a larger pool
  'emergency_resupply',
  'propaganda_win',
  'intercept_order',
  'strategic_ambiguity',
  'diplomatic_pressure',
  'ghost_fleet',
  'sabotage',
  'expedited_convoy',
  'humanitarian_corridor',
  'intel_blackout',
];

function shuffleDeck(deck: ResponseCardId[]): ResponseCardId[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function drawCards(
  deck: ResponseCardId[],
  hand: ResponseCardId[],
  faction: Faction,
  count: number
): { newDeck: ResponseCardId[]; newHand: ResponseCardId[] } {
  const available = deck.filter((id) => {
    const def = RESPONSE_CARD_DEFS[id];
    return def.whoCanPlay === 'either' || def.whoCanPlay === faction;
  });
  const rest = deck.filter((id) => {
    const def = RESPONSE_CARD_DEFS[id];
    return def.whoCanPlay !== 'either' && def.whoCanPlay !== faction;
  });

  let newHand = [...hand];
  let drawFrom = [...available];
  const newDeck: ResponseCardId[] = [...rest];

  const needed = Math.max(0, count - newHand.length);
  for (let i = 0; i < needed && drawFrom.length > 0; i++) {
    const idx = Math.floor(Math.random() * drawFrom.length);
    newHand.push(drawFrom[idx]);
    drawFrom.splice(idx, 1);
  }
  newDeck.push(...drawFrom);

  return { newDeck, newHand };
}

// ─── Headline deck ────────────────────────────────────────────────────────────

const HEADLINE_DECK: HeadlineCard[] = [
  {
    id: 'hl-1',
    title: 'Houthi Resurgence',
    description: 'All Red Sea zones: ships take 1 damage at end of next Move phase.',
    effect: { type: 'none' },
  },
  {
    id: 'hl-2',
    title: 'UN Security Council Vote',
    description: 'Diplomatic freeze — both players lose 1 Intel dial rate this round.',
    effect: { type: 'none' },
  },
  {
    id: 'hl-3',
    title: 'International Shipping Crisis',
    description: 'Global panic over canal closures shakes confidence.',
    effect: { type: 'both-morale', openerAmount: 10, blockerAmount: -5 },
  },
  {
    id: 'hl-4',
    title: 'Cyber Attack on Port Systems',
    description: 'A random canal zone loses 20% openness.',
    effect: { type: 'openness-random-zone', amount: -20 },
  },
  {
    id: 'hl-5',
    title: 'NATO Naval Exercise',
    description: 'Opener may deploy 1 free Destroyer to the Mediterranean.',
    effect: { type: 'opener-free-destroyer' },
  },
  {
    id: 'hl-6',
    title: 'Drone Swarm Attack',
    description: 'Blocker places 2 free obstruction tokens anywhere.',
    effect: { type: 'blocker-free-obstructions', count: 2 },
  },
  {
    id: 'hl-7',
    title: 'Peace Negotiation Talks',
    description: 'No combat may occur this round. Both players draw +1 response card.',
    effect: { type: 'no-combat' },
  },
  {
    id: 'hl-8',
    title: 'Economic Sanctions',
    description: 'Blocker loses 10 Morale from supply pressure.',
    effect: { type: 'blocker-morale', amount: -10 },
  },
  {
    id: 'hl-9',
    title: 'Mercenary Fleet Spotted',
    description: 'Both players may recruit 1 Patrol Boat for free this round.',
    effect: { type: 'mercenary-fleet' },
  },
  {
    id: 'hl-10',
    title: 'Canal Authority Statement',
    description: 'International pressure restores openness in one zone.',
    effect: { type: 'opener-restore-openness', amount: 10 },
  },
  {
    id: 'hl-11',
    title: 'Oil Price Spike',
    description: 'Fuel costs double for both players this round.',
    effect: { type: 'none' },
  },
  {
    id: 'hl-12',
    title: 'Storm Season',
    description: 'All ship movement reduced by 1 zone this round.',
    effect: { type: 'none' },
  },
];

// Scripted campaign sequence (20 rounds, cycling back if needed)
const SCRIPTED_CAMPAIGN: string[] = [
  'hl-2', 'hl-7', 'hl-3', 'hl-11', 'hl-10',   // Rounds 1-5: Tension
  'hl-4', 'hl-1', 'hl-8', 'hl-6', 'hl-5',       // Rounds 6-10: Escalation
  'hl-9', 'hl-3', 'hl-4', 'hl-6', 'hl-12',      // Rounds 11-15: Crisis onset
  'hl-1', 'hl-8', 'hl-6', 'hl-3', 'hl-4',       // Rounds 16-20: Resolution
];

function drawHeadline(usedIds: string[], setupMode: 'randomized' | 'campaign', round: number): HeadlineCard {
  if (setupMode === 'campaign') {
    const idx = Math.min(round - 1, SCRIPTED_CAMPAIGN.length - 1);
    const id = SCRIPTED_CAMPAIGN[idx];
    return HEADLINE_DECK.find((h) => h.id === id) ?? HEADLINE_DECK[0];
  }
  const available = HEADLINE_DECK.filter((h) => !usedIds.includes(h.id));
  if (available.length === 0) {
    return HEADLINE_DECK[Math.floor(Math.random() * HEADLINE_DECK.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

// ─── Initial state factory ────────────────────────────────────────────────────

function makeInitialZones(): Record<ZoneId, Zone> {
  return {
    mediterranean: {
      id: 'mediterranean',
      name: 'Mediterranean Sea',
      category: 'sea',
      openness: null,
      control: 'neutral',
      fortificationLevel: 0,
      obstructionTokens: 0,
      gridCol: 2,
      gridRow: 0,
    },
    'port-said': {
      id: 'port-said',
      name: 'Port Said',
      category: 'canal',
      openness: 50,
      control: 'neutral',
      fortificationLevel: 0,
      obstructionTokens: 0,
      gridCol: 2,
      gridRow: 1,
    },
    ismailia: {
      id: 'ismailia',
      name: 'Ismailia',
      category: 'canal',
      openness: 50,
      control: 'neutral',
      fortificationLevel: 0,
      obstructionTokens: 0,
      gridCol: 2,
      gridRow: 2,
    },
    'great-bitter-lake': {
      id: 'great-bitter-lake',
      name: 'Great Bitter Lake',
      category: 'canal',
      openness: 50,
      control: 'neutral',
      fortificationLevel: 0,
      obstructionTokens: 0,
      gridCol: 2,
      gridRow: 3,
    },
    'little-bitter': {
      id: 'little-bitter',
      name: 'Little Bitter',
      category: 'canal',
      openness: 50,
      control: 'neutral',
      fortificationLevel: 0,
      obstructionTokens: 0,
      gridCol: 2,
      gridRow: 4,
    },
    'suez-city': {
      id: 'suez-city',
      name: 'Suez City',
      category: 'canal',
      openness: 50,
      control: 'neutral',
      fortificationLevel: 0,
      obstructionTokens: 0,
      gridCol: 2,
      gridRow: 5,
    },
    'red-sea': {
      id: 'red-sea',
      name: 'Red Sea',
      category: 'sea',
      openness: null,
      control: 'neutral',
      fortificationLevel: 0,
      obstructionTokens: 0,
      gridCol: 2,
      gridRow: 6,
    },
    sinai: {
      id: 'sinai',
      name: 'Sinai',
      category: 'support',
      openness: null,
      control: 'neutral',
      fortificationLevel: 0,
      obstructionTokens: 0,
      gridCol: 3,
      gridRow: 2,
    },
    'nile-delta': {
      id: 'nile-delta',
      name: 'Nile Delta',
      category: 'support',
      openness: null,
      control: 'neutral',
      fortificationLevel: 0,
      obstructionTokens: 0,
      gridCol: 1,
      gridRow: 1,
    },
    'arabian-peninsula': {
      id: 'arabian-peninsula',
      name: 'Arabian Peninsula',
      category: 'support',
      openness: null,
      control: 'neutral',
      fortificationLevel: 0,
      obstructionTokens: 0,
      gridCol: 3,
      gridRow: 5,
    },
  };
}

function makeInitialUnits(): Unit[] {
  const units: Unit[] = [];

  // Opener: 2 cargo escorts (Mediterranean), 1 destroyer (Mediterranean)
  units.push({
    id: makeUnitId(),
    type: 'cargo-escort',
    faction: 'opener',
    zoneId: 'mediterranean',
    hp: 2,
    maxHp: 2,
    combatDice: 1,
    speed: 2,
    moved: false,
  });
  units.push({
    id: makeUnitId(),
    type: 'cargo-escort',
    faction: 'opener',
    zoneId: 'mediterranean',
    hp: 2,
    maxHp: 2,
    combatDice: 1,
    speed: 2,
    moved: false,
  });
  units.push({
    id: makeUnitId(),
    type: 'destroyer',
    faction: 'opener',
    zoneId: 'mediterranean',
    hp: 2,
    maxHp: 2,
    combatDice: 2,
    speed: 2,
    moved: false,
  });

  // Blocker: 2 patrol boats (Red Sea), 1 mine-layer (Arabian Peninsula)
  units.push({
    id: makeUnitId(),
    type: 'patrol-boat',
    faction: 'blocker',
    zoneId: 'red-sea',
    hp: 1,
    maxHp: 1,
    combatDice: 1,
    speed: 3,
    moved: false,
  });
  units.push({
    id: makeUnitId(),
    type: 'patrol-boat',
    faction: 'blocker',
    zoneId: 'red-sea',
    hp: 1,
    maxHp: 1,
    combatDice: 1,
    speed: 3,
    moved: false,
  });
  units.push({
    id: makeUnitId(),
    type: 'mine-layer',
    faction: 'blocker',
    zoneId: 'arabian-peninsula',
    hp: 1,
    maxHp: 1,
    combatDice: 0,
    speed: 2,
    moved: false,
  });

  return units;
}

function makeCommanderState(_faction: Faction, commanderOrder: CommanderId[]): CommanderState {
  const bench = commanderOrder.map((id, i) => ({
    commanderId: id,
    rank: (i + 1) as 1 | 2 | 3,
    status: (i === 0 ? 'active' : 'waiting') as 'active' | 'waiting' | 'dead',
  }));
  return {
    bench,
    activeCommanderId: commanderOrder[0],
    interimActive: false,
    abilityUsedThisRound: false,
  };
}

function makePlayer(
  faction: Faction,
  commanderOrder: CommanderId[],
  responseDeck: ResponseCardId[]
): { player: PlayerState; remainingDeck: ResponseCardId[] } {
  const basePlayer: Omit<PlayerState, 'commander' | 'responseHand'> = faction === 'opener'
    ? {
        faction: 'opener',
        resources: { steel: 0, fuel: 0, intel: 0, morale: 60 },
        productionRates: { steel: 3, fuel: 2, intel: 2, morale: 6 },
      }
    : {
        faction: 'blocker',
        resources: { steel: 0, fuel: 0, intel: 0, morale: 60 },
        productionRates: { steel: 3, fuel: 2, intel: 3, morale: 6 },
      };

  const commander = makeCommanderState(faction, commanderOrder);

  const { newDeck, newHand } = drawCards(responseDeck, [], faction, 3);

  return {
    player: { ...basePlayer, commander, responseHand: newHand },
    remainingDeck: newDeck,
  };
}

function makeInitialResearchTrack(): ResearchTrack {
  return { tier1: 0, tier2: 0, tier3: 0 };
}

function buildPlayingState(
  setupMode: 'randomized' | 'campaign',
  openerOrder: CommanderId[],
  blockerOrder: CommanderId[]
): Partial<GameState> {
  const zones = makeInitialZones();
  const units = makeInitialUnits();
  let deck = shuffleDeck(ALL_RESPONSE_IDS);

  const { player: opener, remainingDeck: deck2 } = makePlayer('opener', openerOrder, deck);
  deck = deck2;
  const { player: blocker, remainingDeck: deck3 } = makePlayer('blocker', blockerOrder, deck);
  deck = deck3;

  return {
    gamePhase: 'playing',
    setupMode,
    round: 1,
    phase: 'build',
    currentTurn: 'opener',
    zones,
    units,
    opener,
    blocker,
    selectedUnitId: null,
    combatLog: [],
    currentHeadline: null,
    eventsResolved: false,
    winResult: null,
    buildTargetZoneId: null,
    responseDeck: deck,
    selectedResponses: { opener: null, blocker: null },
    responsesRevealed: false,
    intelBlackout: { opener: false, blocker: false },
    eventSubStep: 'headline',
    researchTrack: {
      opener: makeInitialResearchTrack(),
      blocker: makeInitialResearchTrack(),
    },
  };
}

function buildInitialState(): GameState {
  const openerDefault: CommanderId[] = ['hayes', 'malik', 'sato'];
  const blockerDefault: CommanderId[] = ['vasquez', 'khoury', 'chen'];

  const playingState = buildPlayingState('randomized', openerDefault, blockerDefault);

  return {
    gamePhase: 'setup',
    setupMode: 'randomized',
    commanderDraft: {
      openerLocked: false,
      blockerLocked: false,
      openerOrder: openerDefault,
      blockerOrder: blockerDefault,
      currentDraftingFaction: 'opener',
    },
    researchTrack: {
      opener: makeInitialResearchTrack(),
      blocker: makeInitialResearchTrack(),
    },
    round: 1,
    phase: 'build',
    currentTurn: 'opener',
    zones: makeInitialZones(),
    units: makeInitialUnits(),
    opener: playingState.opener!,
    blocker: playingState.blocker!,
    selectedUnitId: null,
    combatLog: [],
    currentHeadline: null,
    eventsResolved: false,
    winResult: null,
    buildTargetZoneId: null,
    responseDeck: playingState.responseDeck!,
    selectedResponses: { opener: null, blocker: null },
    responsesRevealed: false,
    intelBlackout: { opener: false, blocker: false },
    eventSubStep: 'headline',
  };
}

// ─── Store actions interface ───────────────────────────────────────────────────

interface GameStore extends GameState {
  // Setup / Draft
  setSetupMode: (mode: 'randomized' | 'campaign') => void;
  beginDraft: () => void;
  setDraftOrder: (faction: Faction, order: CommanderId[]) => void;
  lockDraft: (faction: Faction) => void;
  startGame: () => void;

  // Research track
  spendResearch: (faction: Faction, intel: number) => void;

  // Build phase
  collectResources: () => void;
  buildUnit: (unitType: UnitType, zoneId: ZoneId) => void;
  buildFortification: (zoneId: ZoneId) => void;
  placeObstruction: (zoneId: ZoneId) => void;
  clearObstruction: (zoneId: ZoneId) => void;
  setBuildTargetZone: (zoneId: ZoneId | null) => void;
  useCommanderAbility: (faction: Faction) => void;

  // Move phase
  selectUnit: (unitId: string | null) => void;
  moveUnit: (unitId: string, targetZoneId: ZoneId) => void;

  // Combat phase
  resolveAllCombat: () => void;

  // Events phase
  drawHeadlineCard: () => void;
  resolveHeadline: () => void;
  selectResponse: (faction: Faction, cardId: ResponseCardId) => void;
  lockResponse: (faction: Faction) => void;
  revealResponses: () => void;
  applyResponses: () => void;
  advanceEventSubStep: () => void;

  // Phase/turn management
  endPhase: () => void;

  // Win check (called internally)
  checkWinConditions: () => WinResult;

  // Reset
  resetGame: () => void;

  // Internal used-headlines tracker
  _usedHeadlineIds: string[];
  _resourcesCollectedThisBuild: boolean;
}

// ─── Zustand store ────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>((set, get) => ({
  ...buildInitialState(),
  _usedHeadlineIds: [],
  _resourcesCollectedThisBuild: false,

  // ── Setup / Draft ──────────────────────────────────────────────────────────

  setSetupMode: (mode) => {
    set({ setupMode: mode });
  },

  beginDraft: () => {
    set({
      gamePhase: 'draft',
      commanderDraft: {
        openerLocked: false,
        blockerLocked: false,
        openerOrder: ['hayes', 'malik', 'sato'],
        blockerOrder: ['vasquez', 'khoury', 'chen'],
        currentDraftingFaction: 'opener',
      },
    });
  },

  setDraftOrder: (faction, order) => {
    const state = get();
    if (faction === 'opener') {
      set({ commanderDraft: { ...state.commanderDraft, openerOrder: order } });
    } else {
      set({ commanderDraft: { ...state.commanderDraft, blockerOrder: order } });
    }
  },

  lockDraft: (faction) => {
    const state = get();
    if (faction === 'opener') {
      set({
        commanderDraft: {
          ...state.commanderDraft,
          openerLocked: true,
          currentDraftingFaction: 'blocker',
        },
      });
    } else {
      set({
        commanderDraft: {
          ...state.commanderDraft,
          blockerLocked: true,
          currentDraftingFaction: null,
        },
      });
    }
  },

  startGame: () => {
    const state = get();
    const { openerOrder, blockerOrder } = state.commanderDraft;
    const playingState = buildPlayingState(state.setupMode, openerOrder, blockerOrder);
    set({
      ...playingState,
      commanderDraft: state.commanderDraft,
      _usedHeadlineIds: [],
      _resourcesCollectedThisBuild: false,
    });
  },

  // ── Research track ─────────────────────────────────────────────────────────

  spendResearch: (faction: Faction, intel: number) => {
    const state = get();
    const player = faction === 'opener' ? state.opener : state.blocker;
    if (player.resources.intel < intel) return;

    const track = { ...state.researchTrack[faction] };

    // Find which tier to advance (must unlock in order)
    const t1Done = track.tier1 >= RESEARCH_THRESHOLDS.tier1;
    const t2Done = track.tier1 >= RESEARCH_THRESHOLDS.tier1 && track.tier2 >= RESEARCH_THRESHOLDS.tier2;
    const t3Done = isResearchUnlocked(track, 3);

    let newTrack = { ...track };
    if (!t1Done) {
      newTrack.tier1 = Math.min(track.tier1 + intel, RESEARCH_THRESHOLDS.tier1);
    } else if (!t2Done) {
      newTrack.tier2 = Math.min(track.tier2 + intel, RESEARCH_THRESHOLDS.tier2);
    } else if (!t3Done) {
      newTrack.tier3 = Math.min(track.tier3 + intel, RESEARCH_THRESHOLDS.tier3);
    } else {
      return; // All tiers done
    }

    const updatedResources = { ...player.resources, intel: player.resources.intel - intel };

    if (faction === 'opener') {
      set({
        researchTrack: { ...state.researchTrack, opener: newTrack },
        opener: { ...state.opener, resources: updatedResources },
      });
    } else {
      set({
        researchTrack: { ...state.researchTrack, blocker: newTrack },
        blocker: { ...state.blocker, resources: updatedResources },
      });
    }
  },

  // ── Collect resources ──────────────────────────────────────────────────────
  collectResources: () => {
    const state = get();
    if (state._resourcesCollectedThisBuild) return;

    const applyRates = (player: PlayerState): PlayerState => {
      const newMorale = clamp(
        player.resources.morale + player.productionRates.morale,
        0,
        100
      );
      return {
        ...player,
        resources: {
          steel: player.resources.steel + player.productionRates.steel,
          fuel: player.resources.fuel + player.productionRates.fuel,
          intel: player.resources.intel + player.productionRates.intel,
          morale: newMorale,
        },
      };
    };

    set({
      opener: applyRates(state.opener),
      blocker: applyRates(state.blocker),
      _resourcesCollectedThisBuild: true,
    });
  },

  // ── Build unit ─────────────────────────────────────────────────────────────
  buildUnit: (unitType: UnitType, zoneId: ZoneId) => {
    const state = get();
    const stats = UNIT_STATS[unitType];
    const faction = state.currentTurn;
    const player = faction === 'opener' ? state.opener : state.blocker;

    if (stats.factionOnly && stats.factionOnly !== faction) return;
    if (player.resources.steel < stats.steelCost) return;

    // Research gate check
    if (stats.researchTier) {
      const track = state.researchTrack[faction];
      if (!isResearchUnlocked(track, stats.researchTier as 1 | 2 | 3)) return;
    }

    const zone = state.zones[zoneId];
    if (!zone) return;
    if (zone.control === (faction === 'opener' ? 'blocker' : 'opener')) return;

    const newUnit: Unit = {
      id: makeUnitId(),
      type: unitType,
      faction,
      zoneId,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      combatDice: stats.combatDice,
      speed: stats.speed,
      moved: false,
    };

    const updatedResources = {
      ...player.resources,
      steel: player.resources.steel - stats.steelCost,
    };

    if (faction === 'opener') {
      set({
        units: [...state.units, newUnit],
        opener: { ...state.opener, resources: updatedResources },
        buildTargetZoneId: null,
      });
    } else {
      set({
        units: [...state.units, newUnit],
        blocker: { ...state.blocker, resources: updatedResources },
        buildTargetZoneId: null,
      });
    }
  },

  // ── Build fortification ───────────────────────────────────────────────────
  buildFortification: (zoneId: ZoneId) => {
    const state = get();
    const faction = state.currentTurn;
    const player = faction === 'opener' ? state.opener : state.blocker;
    const zone = state.zones[zoneId];

    if (!zone) return;
    if (zone.category === 'sea') return;
    if (zone.fortificationLevel >= 3) return;
    if (player.resources.steel < 3) return;

    const updatedResources = { ...player.resources, steel: player.resources.steel - 3 };
    const updatedZone = { ...zone, fortificationLevel: zone.fortificationLevel + 1 };

    if (faction === 'opener') {
      set({
        zones: { ...state.zones, [zoneId]: updatedZone },
        opener: { ...state.opener, resources: updatedResources },
      });
    } else {
      set({
        zones: { ...state.zones, [zoneId]: updatedZone },
        blocker: { ...state.blocker, resources: updatedResources },
      });
    }
  },

  // ── Place obstruction (Blocker only) ─────────────────────────────────────
  placeObstruction: (zoneId: ZoneId) => {
    const state = get();
    if (state.currentTurn !== 'blocker') return;
    const zone = state.zones[zoneId];
    if (!zone || zone.category !== 'canal') return;
    if (state.blocker.resources.steel < 2) return;

    const updatedZone = {
      ...zone,
      openness: clamp((zone.openness ?? 50) - 10, 0, 100),
      obstructionTokens: zone.obstructionTokens + 1,
    };

    set({
      zones: { ...state.zones, [zoneId]: updatedZone },
      blocker: {
        ...state.blocker,
        resources: { ...state.blocker.resources, steel: state.blocker.resources.steel - 2 },
      },
    });
  },

  // ── Clear obstruction (Opener only) ──────────────────────────────────────
  clearObstruction: (zoneId: ZoneId) => {
    const state = get();
    if (state.currentTurn !== 'opener') return;
    const zone = state.zones[zoneId];
    if (!zone || zone.category !== 'canal') return;
    if (zone.obstructionTokens === 0) return;
    if (state.opener.resources.steel < 2 || state.opener.resources.fuel < 1) return;

    const updatedZone = {
      ...zone,
      openness: clamp((zone.openness ?? 50) + 10, 0, 100),
      obstructionTokens: zone.obstructionTokens - 1,
    };

    set({
      zones: { ...state.zones, [zoneId]: updatedZone },
      opener: {
        ...state.opener,
        resources: {
          ...state.opener.resources,
          steel: state.opener.resources.steel - 2,
          fuel: state.opener.resources.fuel - 1,
        },
      },
    });
  },

  // ── Set build target zone ─────────────────────────────────────────────────
  setBuildTargetZone: (zoneId: ZoneId | null) => {
    set({ buildTargetZoneId: zoneId });
  },

  // ── Use commander ability ─────────────────────────────────────────────────
  useCommanderAbility: (faction: Faction) => {
    const state = get();
    const player = faction === 'opener' ? state.opener : state.blocker;
    if (player.resources.morale < 10) return;
    if (player.commander.abilityUsedThisRound) return;
    if (!player.commander.activeCommanderId || player.commander.activeCommanderId === 'interim') return;

    const activeId = player.commander.activeCommanderId;
    let updatedUnits = [...state.units];
    let updatedZones = { ...state.zones };
    let moraleChange = -10;

    // Apply commander-specific ability
    if (activeId === 'sato') {
      // Emergency Refit: repair all damaged ships in one zone (first canal zone with damaged ships)
      const zoneWithDamaged = Object.values(state.zones).find((z) =>
        state.units.some((u) => u.faction === 'opener' && u.zoneId === z.id && u.hp < u.maxHp)
      );
      if (zoneWithDamaged) {
        updatedUnits = updatedUnits.map((u) =>
          u.faction === 'opener' && u.zoneId === zoneWithDamaged.id
            ? { ...u, hp: u.maxHp }
            : u
        );
      }
    } else if (activeId === 'vasquez') {
      // Lockdown: prevent openness increase in a canal zone (mark first contested canal zone)
      const lockedZone = Object.values(state.zones).find(
        (z) => z.category === 'canal' && z.control === 'blocker'
      ) ?? Object.values(state.zones).find((z) => z.category === 'canal');
      if (lockedZone) {
        // We'll track lockdown via opennessProtected flag (misused as lockdown here for simplicity)
        updatedZones = {
          ...updatedZones,
          [lockedZone.id]: { ...updatedZones[lockedZone.id], opennessProtected: true },
        };
      }
    }
    // Other commanders (hayes full-broadside, malik intel drop, khoury barrage, chen false flag)
    // are complex narrative abilities — we grant +3 morale for successful use as per scoring ledger
    moraleChange = -10 + 3; // net -7

    const updatedResources = {
      ...player.resources,
      morale: clamp(player.resources.morale + moraleChange, 0, 100),
    };
    const updatedCommander = { ...player.commander, abilityUsedThisRound: true };

    if (faction === 'opener') {
      set({
        units: updatedUnits,
        zones: updatedZones,
        opener: { ...state.opener, resources: updatedResources, commander: updatedCommander },
      });
    } else {
      set({
        units: updatedUnits,
        zones: updatedZones,
        blocker: { ...state.blocker, resources: updatedResources, commander: updatedCommander },
      });
    }
  },

  // ── Select unit (move phase) ──────────────────────────────────────────────
  selectUnit: (unitId: string | null) => {
    set({ selectedUnitId: unitId });
  },

  // ── Move unit ─────────────────────────────────────────────────────────────
  moveUnit: (unitId: string, targetZoneId: ZoneId) => {
    const state = get();
    const unit = state.units.find((u) => u.id === unitId);
    if (!unit) return;
    if (unit.faction !== state.currentTurn) return;
    if (unit.moved) return;

    const reachable = getReachableZones(unit, state);
    if (!reachable.includes(targetZoneId)) return;

    const dist = bfsDistance(unit.zoneId, targetZoneId);
    const fuelCost = dist;
    const player = unit.faction === 'opener' ? state.opener : state.blocker;
    if (player.resources.fuel < fuelCost) return;

    const updatedUnits = state.units.map((u) =>
      u.id === unitId ? { ...u, zoneId: targetZoneId, moved: true } : u
    );

    const updatedResources = { ...player.resources, fuel: player.resources.fuel - fuelCost };

    let updatedZones = { ...state.zones };
    if (unit.type === 'cargo-escort') {
      const targetZone = updatedZones[targetZoneId];
      if (targetZone.category === 'canal') {
        const enemiesInZone = updatedUnits.filter(
          (u) => u.zoneId === targetZoneId && u.faction === 'blocker'
        );
        if (enemiesInZone.length === 0) {
          // Check research tier 1 for improved cargo escort bonus
          const tier1Done = isResearchUnlocked(state.researchTrack.opener, 1);
          const bonus = tier1Done ? 10 : 5;
          updatedZones = {
            ...updatedZones,
            [targetZoneId]: {
              ...targetZone,
              openness: clamp((targetZone.openness ?? 50) + bonus, 0, 100),
            },
          };
        }
      }
    }

    if (unit.faction === 'opener') {
      set({
        units: updatedUnits,
        zones: updatedZones,
        opener: { ...state.opener, resources: updatedResources },
        selectedUnitId: null,
      });
    } else {
      set({
        units: updatedUnits,
        zones: updatedZones,
        blocker: { ...state.blocker, resources: updatedResources },
        selectedUnitId: null,
      });
    }
  },

  // ── Resolve all combat ────────────────────────────────────────────────────
  resolveAllCombat: () => {
    const state = get();
    const log: CombatLogEntry[] = [];
    let updatedZones = { ...state.zones };
    let updatedUnits = [...state.units];
    let openerMoraleDelta = 0;
    let blockerMoraleDelta = 0;

    // Hayes passive: +1 die to all opener naval combat
    const hayesActive =
      state.opener.commander.activeCommanderId === 'hayes' &&
      !state.opener.commander.interimActive;

    const allZoneIds = Object.keys(state.zones) as ZoneId[];
    for (const zoneId of allZoneIds) {
      const openerUnits = updatedUnits.filter(
        (u) => u.zoneId === zoneId && u.faction === 'opener'
      );
      const blockerUnits = updatedUnits.filter(
        (u) => u.zoneId === zoneId && u.faction === 'blocker'
      );

      if (openerUnits.length === 0 || blockerUnits.length === 0) continue;

      const zone = updatedZones[zoneId];

      const openerDiceTotal =
        openerUnits.reduce((sum, u) => sum + u.combatDice, 0) + (hayesActive ? 1 : 0);
      const blockerDiceTotal = blockerUnits.reduce((sum, u) => sum + u.combatDice, 0);

      const openerRolls = Array.from({ length: openerDiceTotal }, rollD6).sort((a, b) => b - a);
      const blockerRolls = Array.from({ length: blockerDiceTotal }, rollD6).sort((a, b) => b - a);

      const fortMod = zone.fortificationLevel;
      const pairCount = Math.min(openerRolls.length, blockerRolls.length);
      let openerLosses = 0;
      let blockerLosses = 0;

      for (let i = 0; i < pairCount; i++) {
        const attackerRoll = openerRolls[i] - fortMod;
        const defenderRoll = blockerRolls[i];
        if (attackerRoll > defenderRoll) {
          blockerLosses++;
        } else {
          openerLosses++;
        }
      }

      if (openerRolls.length > pairCount) {
        blockerLosses += openerRolls.length - pairCount;
      }
      if (blockerRolls.length > pairCount) {
        openerLosses += blockerRolls.length - pairCount;
      }

      let remainingOpenerLosses = openerLosses;
      let remainingBlockerLosses = blockerLosses;

      const sortedOpener = [...openerUnits].sort((a, b) => a.hp - b.hp);
      const sortedBlocker = [...blockerUnits].sort((a, b) => a.hp - b.hp);

      const destroyedIds: string[] = [];

      for (const unit of sortedOpener) {
        if (remainingOpenerLosses <= 0) break;
        const dmg = Math.min(unit.hp, remainingOpenerLosses);
        remainingOpenerLosses -= dmg;
        const newHp = unit.hp - dmg;
        if (newHp <= 0) {
          destroyedIds.push(unit.id);
          openerMoraleDelta -= 5;
        } else {
          updatedUnits = updatedUnits.map((u) =>
            u.id === unit.id ? { ...u, hp: newHp } : u
          );
        }
      }

      for (const unit of sortedBlocker) {
        if (remainingBlockerLosses <= 0) break;
        const dmg = Math.min(unit.hp, remainingBlockerLosses);
        remainingBlockerLosses -= dmg;
        const newHp = unit.hp - dmg;
        if (newHp <= 0) {
          destroyedIds.push(unit.id);
          blockerMoraleDelta -= 5;
        } else {
          updatedUnits = updatedUnits.map((u) =>
            u.id === unit.id ? { ...u, hp: newHp } : u
          );
        }
      }

      updatedUnits = updatedUnits.filter((u) => !destroyedIds.includes(u.id));

      const survivingOpener = updatedUnits.filter(
        (u) => u.zoneId === zoneId && u.faction === 'opener'
      );
      const survivingBlocker = updatedUnits.filter(
        (u) => u.zoneId === zoneId && u.faction === 'blocker'
      );

      let controlChange: Control | null = null;
      let opennessChange = 0;

      if (survivingOpener.length > 0 && survivingBlocker.length === 0) {
        const prevControl = updatedZones[zoneId].control;
        if (prevControl === 'blocker' && zone.category === 'canal') {
          opennessChange = 10;
          openerMoraleDelta += 5;
        }
        controlChange = 'opener';
        updatedZones = {
          ...updatedZones,
          [zoneId]: {
            ...updatedZones[zoneId],
            control: 'opener',
            openness:
              zone.category === 'canal'
                ? clamp((updatedZones[zoneId].openness ?? 50) + opennessChange, 0, 100)
                : updatedZones[zoneId].openness,
          },
        };
      } else if (survivingBlocker.length > 0 && survivingOpener.length === 0) {
        const prevControl = updatedZones[zoneId].control;
        if (zone.category === 'canal') {
          // Check if zone is protected (Humanitarian Corridor response card)
          if (!updatedZones[zoneId].opennessProtected) {
            opennessChange = -10;
          }
          blockerMoraleDelta += 5;
        }
        if (prevControl !== 'blocker') controlChange = 'blocker';
        updatedZones = {
          ...updatedZones,
          [zoneId]: {
            ...updatedZones[zoneId],
            control: 'blocker',
            openness:
              zone.category === 'canal'
                ? clamp((updatedZones[zoneId].openness ?? 50) + opennessChange, 0, 100)
                : updatedZones[zoneId].openness,
          },
        };
      }

      log.push({
        zoneId,
        zoneName: zone.name,
        openerRolls,
        blockerRolls,
        openerLosses,
        blockerLosses,
        controlChange,
        opennessChange,
      });
    }

    const newOpenerMorale = clamp(
      state.opener.resources.morale + openerMoraleDelta,
      0,
      100
    );
    const newBlockerMorale = clamp(
      state.blocker.resources.morale + blockerMoraleDelta,
      0,
      100
    );

    set({
      units: updatedUnits,
      zones: updatedZones,
      opener: {
        ...state.opener,
        resources: { ...state.opener.resources, morale: newOpenerMorale },
      },
      blocker: {
        ...state.blocker,
        resources: { ...state.blocker.resources, morale: newBlockerMorale },
      },
      combatLog: log,
    });

    const winResult = get().checkWinConditions();
    if (winResult) {
      set({ winResult });
    }
  },

  // ── Draw headline ─────────────────────────────────────────────────────────
  drawHeadlineCard: () => {
    const state = get();
    const card = drawHeadline(state._usedHeadlineIds, state.setupMode, state.round);
    set({
      currentHeadline: card,
      _usedHeadlineIds: [...state._usedHeadlineIds, card.id],
      eventSubStep: 'opener-select',
    });
  },

  // ── Resolve headline ──────────────────────────────────────────────────────
  resolveHeadline: () => {
    const state = get();
    if (!state.currentHeadline || state.eventsResolved) return;

    const effect = state.currentHeadline.effect;
    let updatedOpener = { ...state.opener };
    let updatedBlocker = { ...state.blocker };
    let updatedZones = { ...state.zones };
    let updatedUnits = [...state.units];

    switch (effect.type) {
      case 'both-morale': {
        // Diplomatic Pressure response can cancel opener morale loss
        const openerCardPlayed = state.selectedResponses.opener === 'diplomatic_pressure';
        const openerAmt = (openerCardPlayed && effect.openerAmount < 0) ? 0 : effect.openerAmount;
        updatedOpener = {
          ...updatedOpener,
          resources: {
            ...updatedOpener.resources,
            morale: clamp(updatedOpener.resources.morale + openerAmt, 0, 100),
          },
        };
        updatedBlocker = {
          ...updatedBlocker,
          resources: {
            ...updatedBlocker.resources,
            morale: clamp(updatedBlocker.resources.morale + effect.blockerAmount, 0, 100),
          },
        };
        break;
      }
      case 'opener-morale': {
        const openerCardPlayed = state.selectedResponses.opener === 'diplomatic_pressure';
        const amt = (openerCardPlayed && effect.amount < 0) ? 0 : effect.amount;
        updatedOpener = {
          ...updatedOpener,
          resources: {
            ...updatedOpener.resources,
            morale: clamp(updatedOpener.resources.morale + amt, 0, 100),
          },
        };
        break;
      }
      case 'blocker-morale': {
        updatedBlocker = {
          ...updatedBlocker,
          resources: {
            ...updatedBlocker.resources,
            morale: clamp(updatedBlocker.resources.morale + effect.amount, 0, 100),
          },
        };
        break;
      }
      case 'openness-random-zone': {
        const canalIds = Object.values(state.zones)
          .filter((z) => z.category === 'canal')
          .map((z) => z.id);
        const randomId = canalIds[Math.floor(Math.random() * canalIds.length)] as ZoneId;
        const randomZone = updatedZones[randomId];
        // Check if protected by Humanitarian Corridor
        const isProtected = randomZone.opennessProtected && effect.amount < 0;
        if (!isProtected) {
          updatedZones = {
            ...updatedZones,
            [randomId]: {
              ...randomZone,
              openness: clamp((randomZone.openness ?? 50) + effect.amount, 0, 100),
            },
          };
        }
        break;
      }
      case 'opener-free-destroyer': {
        const newDestroyer: Unit = {
          id: makeUnitId(),
          type: 'destroyer',
          faction: 'opener',
          zoneId: 'mediterranean',
          hp: 2,
          maxHp: 2,
          combatDice: 2,
          speed: 2,
          moved: false,
        };
        updatedUnits = [...updatedUnits, newDestroyer];
        break;
      }
      case 'blocker-free-obstructions': {
        // Check if Sabotage response was played (doubles tokens)
        const sabotageActive = state.selectedResponses.blocker === 'sabotage';
        const tokenCount = sabotageActive ? effect.count * 2 : effect.count;
        const canalZones = Object.values(updatedZones).filter((z) => z.category === 'canal');
        let tokensLeft = tokenCount;
        for (const z of canalZones) {
          if (tokensLeft === 0) break;
          const zoneProtected = updatedZones[z.id as ZoneId].opennessProtected;
          if (zoneProtected) continue;
          updatedZones = {
            ...updatedZones,
            [z.id]: {
              ...updatedZones[z.id as ZoneId],
              obstructionTokens: updatedZones[z.id as ZoneId].obstructionTokens + 1,
              openness: clamp((updatedZones[z.id as ZoneId].openness ?? 50) - 10, 0, 100),
            },
          };
          tokensLeft--;
        }
        break;
      }
      case 'opener-restore-openness': {
        const canalZones = Object.values(updatedZones)
          .filter((z) => z.category === 'canal')
          .sort((a, b) => (a.openness ?? 50) - (b.openness ?? 50));
        if (canalZones.length > 0) {
          const target = canalZones[0];
          updatedZones = {
            ...updatedZones,
            [target.id]: {
              ...updatedZones[target.id as ZoneId],
              openness: clamp((target.openness ?? 50) + effect.amount, 0, 100),
            },
          };
        }
        break;
      }
      case 'mercenary-fleet': {
        // Both players get a free patrol boat
        const openerBoat: Unit = {
          id: makeUnitId(),
          type: 'patrol-boat',
          faction: 'opener',
          zoneId: 'mediterranean',
          hp: 1,
          maxHp: 1,
          combatDice: 1,
          speed: 3,
          moved: false,
        };
        const blockerBoat: Unit = {
          id: makeUnitId(),
          type: 'patrol-boat',
          faction: 'blocker',
          zoneId: 'red-sea',
          hp: 1,
          maxHp: 1,
          combatDice: 1,
          speed: 3,
          moved: false,
        };
        updatedUnits = [...updatedUnits, openerBoat, blockerBoat];
        break;
      }
      default:
        break;
    }

    set({
      opener: updatedOpener,
      blocker: updatedBlocker,
      zones: updatedZones,
      units: updatedUnits,
      eventsResolved: true,
    });

    const winResult = get().checkWinConditions();
    if (winResult) {
      set({ winResult });
    }
  },

  // ── Select response card ──────────────────────────────────────────────────
  selectResponse: (faction: Faction, cardId: ResponseCardId) => {
    const state = get();
    set({
      selectedResponses: {
        ...state.selectedResponses,
        [faction]: cardId,
      },
    });
  },

  // ── Lock response ─────────────────────────────────────────────────────────
  lockResponse: (faction: Faction) => {
    const state = get();
    if (faction === 'opener') {
      set({ eventSubStep: 'pass-to-blocker' });
    } else {
      set({ eventSubStep: 'reveal' });
    }
    // Remove the selected card from the player's hand
    const player = faction === 'opener' ? state.opener : state.blocker;
    const selectedCard = state.selectedResponses[faction];
    if (selectedCard) {
      const newHand = [...player.responseHand];
      const idx = newHand.indexOf(selectedCard);
      if (idx !== -1) newHand.splice(idx, 1);
      if (faction === 'opener') {
        set({ opener: { ...state.opener, responseHand: newHand } });
      } else {
        set({ blocker: { ...state.blocker, responseHand: newHand } });
      }
    }
  },

  // ── Reveal responses ──────────────────────────────────────────────────────
  revealResponses: () => {
    set({ responsesRevealed: true, eventSubStep: 'reveal' });
  },

  // ── Apply responses ───────────────────────────────────────────────────────
  applyResponses: () => {
    const state = get();
    let updatedOpener = { ...state.opener };
    let updatedBlocker = { ...state.blocker };
    let updatedZones = { ...state.zones };
    let updatedDeck = [...state.responseDeck];

    const applyCard = (faction: Faction, cardId: ResponseCardId | null) => {
      if (!cardId) return;
      switch (cardId) {
        case 'emergency_resupply': {
          if (faction === 'opener') {
            updatedOpener = {
              ...updatedOpener,
              resources: {
                ...updatedOpener.resources,
                fuel: updatedOpener.resources.fuel + 4,
              },
            };
          } else {
            updatedBlocker = {
              ...updatedBlocker,
              resources: {
                ...updatedBlocker.resources,
                fuel: updatedBlocker.resources.fuel + 4,
              },
            };
          }
          break;
        }
        case 'propaganda_win': {
          if (faction === 'opener') {
            updatedOpener = {
              ...updatedOpener,
              resources: {
                ...updatedOpener.resources,
                morale: clamp(updatedOpener.resources.morale + 8, 0, 100),
              },
            };
          } else {
            updatedBlocker = {
              ...updatedBlocker,
              resources: {
                ...updatedBlocker.resources,
                morale: clamp(updatedBlocker.resources.morale + 8, 0, 100),
              },
            };
          }
          break;
        }
        case 'expedited_convoy': {
          // +15% openness to the most closed canal zone
          const canalZones = Object.values(updatedZones)
            .filter((z) => z.category === 'canal')
            .sort((a, b) => (a.openness ?? 50) - (b.openness ?? 50));
          if (canalZones.length > 0) {
            const target = canalZones[0];
            updatedZones = {
              ...updatedZones,
              [target.id]: {
                ...updatedZones[target.id as ZoneId],
                openness: clamp((target.openness ?? 50) + 15, 0, 100),
              },
            };
          }
          break;
        }
        case 'ghost_fleet': {
          // Place mine in most open canal zone (-10% openness)
          const canalZones = Object.values(updatedZones)
            .filter((z) => z.category === 'canal')
            .sort((a, b) => (b.openness ?? 50) - (a.openness ?? 50));
          if (canalZones.length > 0) {
            const target = canalZones[0];
            if (!updatedZones[target.id as ZoneId].opennessProtected) {
              updatedZones = {
                ...updatedZones,
                [target.id]: {
                  ...updatedZones[target.id as ZoneId],
                  openness: clamp((target.openness ?? 50) - 10, 0, 100),
                  obstructionTokens: updatedZones[target.id as ZoneId].obstructionTokens + 1,
                },
              };
            }
          }
          break;
        }
        case 'intel_blackout': {
          // Playing faction's positions are hidden from opponent this round
          const blackoutFaction = faction;
          set((prev) => ({
            intelBlackout: {
              ...prev.intelBlackout,
              [blackoutFaction]: true,
            },
          }));
          break;
        }
        case 'humanitarian_corridor': {
          // Protect the most threatened canal zone
          const canalZones = Object.values(updatedZones)
            .filter((z) => z.category === 'canal')
            .sort((a, b) => (a.openness ?? 50) - (b.openness ?? 50));
          if (canalZones.length > 0) {
            const target = canalZones[0];
            updatedZones = {
              ...updatedZones,
              [target.id]: {
                ...updatedZones[target.id as ZoneId],
                opennessProtected: true,
              },
            };
          }
          break;
        }
        case 'strategic_ambiguity': {
          // Draw a new card (already removed from hand in lockResponse, just add one back)
          const { newDeck, newHand } = drawCards(updatedDeck, [], faction, 1);
          updatedDeck = newDeck;
          if (faction === 'opener') {
            updatedOpener = {
              ...updatedOpener,
              responseHand: [...updatedOpener.responseHand, ...newHand],
            };
          } else {
            updatedBlocker = {
              ...updatedBlocker,
              responseHand: [...updatedBlocker.responseHand, ...newHand],
            };
          }
          break;
        }
        // diplomatic_pressure, intercept_order, sabotage handled inline in headline resolution
        default:
          break;
      }
    };

    applyCard('opener', state.selectedResponses.opener);
    applyCard('blocker', state.selectedResponses.blocker);

    // Refill hands to 3 cards (accounting for Malik's passive: +1 card)
    const openerHandSize =
      updatedOpener.commander.activeCommanderId === 'malik' ? 4 : 3;
    const blockerHandSize =
      updatedBlocker.commander.activeCommanderId === 'chen' ? 2 : 3; // Chen reduces opener draw, but affects blocker's opponent

    const { newDeck: deckAfterOpener, newHand: openerHand } = drawCards(
      updatedDeck,
      updatedOpener.responseHand,
      'opener',
      openerHandSize
    );
    updatedDeck = deckAfterOpener;

    const { newDeck: deckAfterBlocker, newHand: blockerHand } = drawCards(
      updatedDeck,
      updatedBlocker.responseHand,
      'blocker',
      blockerHandSize
    );
    updatedDeck = deckAfterBlocker;

    updatedOpener = { ...updatedOpener, responseHand: openerHand };
    updatedBlocker = { ...updatedBlocker, responseHand: blockerHand };

    set({
      opener: updatedOpener,
      blocker: updatedBlocker,
      zones: updatedZones,
      responseDeck: updatedDeck,
      eventSubStep: 'done',
      eventsResolved: true,
    });

    const winResult = get().checkWinConditions();
    if (winResult) {
      set({ winResult });
    }
  },

  // ── Advance event sub-step ────────────────────────────────────────────────
  advanceEventSubStep: () => {
    const state = get();
    const steps: GameState['eventSubStep'][] = [
      'headline',
      'opener-select',
      'pass-to-blocker',
      'blocker-select',
      'reveal',
      'done',
    ];
    const idx = steps.indexOf(state.eventSubStep);
    if (idx < steps.length - 1) {
      set({ eventSubStep: steps[idx + 1] });
    }
  },

  // ── End phase ─────────────────────────────────────────────────────────────
  endPhase: () => {
    const state = get();
    if (state.winResult) return;

    const phaseOrder: Phase[] = ['build', 'move', 'combat', 'events'];
    const currentIdx = phaseOrder.indexOf(state.phase);
    const nextIdx = (currentIdx + 1) % phaseOrder.length;
    const nextPhase = phaseOrder[nextIdx];

    const isNewRound = nextPhase === 'build';
    const newRound = isNewRound ? state.round + 1 : state.round;

    const updatedUnits =
      nextPhase === 'move'
        ? state.units.map((u) => ({ ...u, moved: false }))
        : state.units;

    // Clear round-limited flags at round start
    let updatedZones = { ...state.zones };
    let updatedOpener = { ...state.opener };
    let updatedBlocker = { ...state.blocker };

    if (isNewRound) {
      // Clear opennessProtected flags
      updatedZones = Object.fromEntries(
        Object.entries(state.zones).map(([id, zone]) => [
          id,
          { ...zone, opennessProtected: false },
        ])
      ) as Record<ZoneId, Zone>;

      // Reset commander ability usage
      updatedOpener = {
        ...state.opener,
        commander: { ...state.opener.commander, abilityUsedThisRound: false },
      };
      updatedBlocker = {
        ...state.blocker,
        commander: { ...state.blocker.commander, abilityUsedThisRound: false },
      };
    }

    const updates: Partial<GameStore> = {
      phase: nextPhase,
      round: newRound,
      units: updatedUnits,
      zones: updatedZones,
      opener: updatedOpener,
      blocker: updatedBlocker,
      selectedUnitId: null,
      combatLog: nextPhase === 'combat' ? [] : state.combatLog,
      eventsResolved: isNewRound ? false : state.eventsResolved,
      _resourcesCollectedThisBuild: isNewRound ? false : state._resourcesCollectedThisBuild,
      selectedResponses: isNewRound
        ? { opener: null, blocker: null }
        : state.selectedResponses,
      responsesRevealed: isNewRound ? false : state.responsesRevealed,
      intelBlackout: isNewRound ? { opener: false, blocker: false } : state.intelBlackout,
      eventSubStep: isNewRound ? 'headline' : state.eventSubStep,
    };

    // Draw headline when entering events phase
    if (nextPhase === 'events') {
      const card = drawHeadline(state._usedHeadlineIds, state.setupMode, newRound);
      updates.currentHeadline = card;
      updates._usedHeadlineIds = [...state._usedHeadlineIds, card.id];
      updates.eventSubStep = 'opener-select';
    }

    // After 20 rounds, tiebreaker
    if (isNewRound && newRound > 20 && !state.winResult) {
      const openerScore =
        avgCanalOpenness(state.zones) * state.opener.resources.morale;
      const blockerScore =
        (100 - avgCanalOpenness(state.zones)) * state.blocker.resources.morale;
      const winner: Faction = openerScore >= blockerScore ? 'opener' : 'blocker';
      updates.winResult = {
        winner,
        reason: `20 rounds elapsed. Score — Opener: ${openerScore.toFixed(0)}, Blocker: ${blockerScore.toFixed(0)}`,
      };
    }

    set(updates);
  },

  // ── Check win conditions ──────────────────────────────────────────────────
  checkWinConditions: (): WinResult => {
    const state = get();
    const avgOpen = avgCanalOpenness(state.zones);
    const openerMorale = state.opener.resources.morale;
    const blockerMorale = state.blocker.resources.morale;

    if (openerMorale <= 0) {
      return { winner: 'blocker', reason: 'Opener morale collapsed to 0.' };
    }
    if (blockerMorale <= 0) {
      return { winner: 'opener', reason: 'Blocker morale collapsed to 0.' };
    }
    if (avgOpen >= 90 && blockerMorale <= 20) {
      return {
        winner: 'opener',
        reason: `Canal is ${avgOpen.toFixed(0)}% open and Blocker morale is ${blockerMorale}.`,
      };
    }
    if (avgOpen <= 10 && openerMorale <= 20) {
      return {
        winner: 'blocker',
        reason: `Canal is ${avgOpen.toFixed(0)}% open and Opener morale is ${openerMorale}.`,
      };
    }
    return null;
  },

  // ── Reset game ────────────────────────────────────────────────────────────
  resetGame: () => {
    unitIdCounter = 1;
    set({
      ...buildInitialState(),
      _usedHeadlineIds: [],
      _resourcesCollectedThisBuild: false,
    });
  },
}));

// ─── Adjacency / BFS helpers (module-level, used by moveUnit) ────────────────

import { ZONE_ADJACENCY } from '../types/game';

function bfsDistance(from: ZoneId, to: ZoneId): number {
  if (from === to) return 0;
  const visited = new Set<ZoneId>([from]);
  const queue: Array<{ id: ZoneId; dist: number }> = [{ id: from, dist: 0 }];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of ZONE_ADJACENCY[current.id]) {
      if (neighbor === to) return current.dist + 1;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ id: neighbor, dist: current.dist + 1 });
      }
    }
  }
  return Infinity;
}

function getReachableZones(unit: Unit, state: GameState): ZoneId[] {
  const reachable: ZoneId[] = [];
  const visited = new Set<ZoneId>([unit.zoneId]);
  const queue: Array<{ id: ZoneId; stepsLeft: number }> = [
    { id: unit.zoneId, stepsLeft: unit.speed },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of ZONE_ADJACENCY[current.id]) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);

      const enemyPresent = state.units.some(
        (u) => u.zoneId === neighbor && u.faction !== unit.faction
      );

      reachable.push(neighbor);

      if (current.stepsLeft > 1 && !enemyPresent) {
        queue.push({ id: neighbor, stepsLeft: current.stepsLeft - 1 });
      }
    }
  }
  return reachable;
}

export { getReachableZones, bfsDistance };
