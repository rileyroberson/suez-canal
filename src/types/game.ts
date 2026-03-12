// ─── Zone types ───────────────────────────────────────────────────────────────

export type ZoneCategory = 'sea' | 'canal' | 'support';

export type ZoneId =
  | 'mediterranean'
  | 'port-said'
  | 'ismailia'
  | 'great-bitter-lake'
  | 'little-bitter'
  | 'suez-city'
  | 'red-sea'
  | 'sinai'
  | 'nile-delta'
  | 'arabian-peninsula';

export type Control = 'neutral' | 'opener' | 'blocker';

export interface Zone {
  id: ZoneId;
  name: string;
  category: ZoneCategory;
  /** Canal zones only: 0–100 */
  openness: number | null;
  control: Control;
  /** Canal/support zones: 0–3 */
  fortificationLevel: number;
  /** Canal zones only */
  obstructionTokens: number;
  /** Grid position for SVG layout { col, row } */
  gridCol: number;
  gridRow: number;
  /** Flag: openness cannot be reduced this round (from Humanitarian Corridor response card) */
  opennessProtected?: boolean;
}

// ─── Unit types ───────────────────────────────────────────────────────────────

export type UnitType =
  | 'patrol-boat'
  | 'destroyer'
  | 'frigate'
  | 'carrier'
  | 'cargo-escort'
  | 'mine-layer';

export type Faction = 'opener' | 'blocker';

export interface UnitStats {
  type: UnitType;
  label: string;
  steelCost: number;
  combatDice: number;
  maxHp: number;
  speed: number;
  /** Which faction may build this unit (undefined = either) */
  factionOnly?: Faction;
  /** Minimum research tier required (0 = always available) */
  researchTier?: number;
}

export interface Unit {
  id: string;
  type: UnitType;
  faction: Faction;
  zoneId: ZoneId;
  hp: number;
  maxHp: number;
  combatDice: number;
  speed: number;
  /** Has this unit already moved this Move phase? */
  moved: boolean;
}

// ─── Player / Resource types ──────────────────────────────────────────────────

export interface ProductionRates {
  steel: number;
  fuel: number;
  intel: number;
  morale: number;
}

export interface Resources {
  steel: number;
  fuel: number;
  intel: number;
  morale: number;
}

export interface PlayerState {
  faction: Faction;
  resources: Resources;
  productionRates: ProductionRates;
  commander: CommanderState;
  responseHand: ResponseCardId[];
}

// ─── Commander types ──────────────────────────────────────────────────────────

export type CommanderId =
  | 'hayes' | 'malik' | 'sato'         // Opener
  | 'vasquez' | 'khoury' | 'chen';     // Blocker

export interface CommanderDef {
  id: CommanderId;
  name: string;
  title: string;
  faction: Faction;
  flagshipType: string;
  passive: string;
  active: string;
  activeCost: 10;
}

export interface CommanderSlot {
  commanderId: CommanderId;
  rank: 1 | 2 | 3;
  status: 'active' | 'waiting' | 'dead';
}

export interface CommanderState {
  bench: CommanderSlot[];
  activeCommanderId: CommanderId | 'interim' | null;
  interimActive: boolean;
  abilityUsedThisRound: boolean;
}

// ─── Response card types ──────────────────────────────────────────────────────

export type ResponseCardId =
  | 'diplomatic_pressure'
  | 'expedited_convoy'
  | 'emergency_resupply'
  | 'intercept_order'
  | 'propaganda_win'
  | 'sabotage'
  | 'ghost_fleet'
  | 'intel_blackout'
  | 'humanitarian_corridor'
  | 'strategic_ambiguity';

export interface ResponseCardDef {
  id: ResponseCardId;
  name: string;
  whoCanPlay: 'opener' | 'blocker' | 'either';
  effect: string;
}

// ─── Game phase ───────────────────────────────────────────────────────────────

export type Phase = 'build' | 'move' | 'combat' | 'events';

export type GamePhase = 'setup' | 'draft' | 'playing' | 'over';

// ─── Combat log entry ─────────────────────────────────────────────────────────

export interface CombatLogEntry {
  zoneId: ZoneId;
  zoneName: string;
  openerRolls: number[];
  blockerRolls: number[];
  openerLosses: number;
  blockerLosses: number;
  controlChange: Control | null;
  opennessChange: number;
}

// ─── Headline card ────────────────────────────────────────────────────────────

export interface HeadlineCard {
  id: string;
  title: string;
  description: string;
  /** Applied when the card is resolved */
  effect: HeadlineEffect;
}

export type HeadlineEffect =
  | { type: 'opener-morale'; amount: number }
  | { type: 'blocker-morale'; amount: number }
  | { type: 'both-morale'; openerAmount: number; blockerAmount: number }
  | { type: 'openness-random-zone'; amount: number }
  | { type: 'opener-free-destroyer' }
  | { type: 'blocker-free-obstructions'; count: number }
  | { type: 'no-combat' }
  | { type: 'opener-restore-openness'; amount: number }
  | { type: 'blocker-free-obstruction-tokens'; count: number }
  | { type: 'mercenary-fleet' }
  | { type: 'none' };

// ─── Win result ───────────────────────────────────────────────────────────────

export type WinResult =
  | { winner: Faction; reason: string }
  | null;

// ─── Research track ───────────────────────────────────────────────────────────

export interface ResearchTrack {
  tier1: number;  // Intel spent toward tier 1
  tier2: number;  // Intel spent toward tier 2
  tier3: number;  // Intel spent toward tier 3
}

// ─── Commander draft state ────────────────────────────────────────────────────

export interface CommanderDraftState {
  openerLocked: boolean;
  blockerLocked: boolean;
  openerOrder: CommanderId[];
  blockerOrder: CommanderId[];
  currentDraftingFaction: Faction | null;
}

// ─── Full game state ──────────────────────────────────────────────────────────

export interface GameState {
  /** Top-level game lifecycle phase */
  gamePhase: GamePhase;
  /** Setup screen choice */
  setupMode: 'randomized' | 'campaign';
  /** Commander draft state */
  commanderDraft: CommanderDraftState;
  /** Research tracks */
  researchTrack: {
    opener: ResearchTrack;
    blocker: ResearchTrack;
  };

  round: number;
  phase: Phase;
  currentTurn: Faction;
  zones: Record<ZoneId, Zone>;
  units: Unit[];
  opener: PlayerState;
  blocker: PlayerState;

  /** Move phase: currently selected unit id */
  selectedUnitId: string | null;

  /** Combat log from the most recent combat phase */
  combatLog: CombatLogEntry[];

  /** Current headline card (drawn each events phase) */
  currentHeadline: HeadlineCard | null;

  /** Whether current events have been resolved this round */
  eventsResolved: boolean;

  /** Win result — null while game is ongoing */
  winResult: WinResult;

  /** Pending build: zone targeted for placing a new unit */
  buildTargetZoneId: ZoneId | null;

  /** Response card pool (shuffled deck) */
  responseDeck: ResponseCardId[];

  /** Currently selected responses (during events phase) */
  selectedResponses: { opener: ResponseCardId | null; blocker: ResponseCardId | null };

  /** Whether responses have been revealed this round */
  responsesRevealed: boolean;

  /** Intel blackout flags (unit positions hidden from opponent for this round) */
  intelBlackout: { opener: boolean; blocker: boolean };

  /** Event phase sub-step for hotseat flow */
  eventSubStep: 'headline' | 'opener-select' | 'pass-to-blocker' | 'blocker-select' | 'reveal' | 'done';
}

// ─── Unit stat catalogue ──────────────────────────────────────────────────────

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  'patrol-boat': {
    type: 'patrol-boat',
    label: 'Patrol Boat',
    steelCost: 2,
    combatDice: 1,
    maxHp: 1,
    speed: 3,
    factionOnly: 'blocker',
  },
  destroyer: {
    type: 'destroyer',
    label: 'Destroyer',
    steelCost: 4,
    combatDice: 2,
    maxHp: 2,
    speed: 2,
  },
  frigate: {
    type: 'frigate',
    label: 'Frigate',
    steelCost: 5,
    combatDice: 2,
    maxHp: 3,
    speed: 2,
    factionOnly: 'opener',
    researchTier: 1,
  },
  carrier: {
    type: 'carrier',
    label: 'Carrier',
    steelCost: 8,
    combatDice: 1,
    maxHp: 4,
    speed: 1,
    factionOnly: 'opener',
    researchTier: 2,
  },
  'cargo-escort': {
    type: 'cargo-escort',
    label: 'Cargo Escort',
    steelCost: 3,
    combatDice: 1,
    maxHp: 2,
    speed: 2,
    factionOnly: 'opener',
  },
  'mine-layer': {
    type: 'mine-layer',
    label: 'Mine Layer',
    steelCost: 3,
    combatDice: 0,
    maxHp: 1,
    speed: 2,
    factionOnly: 'blocker',
    researchTier: 1,
  },
} as const;

// ─── Zone adjacency graph ────────────────────────────────────────────────────

export const ZONE_ADJACENCY: Record<ZoneId, ZoneId[]> = {
  mediterranean: ['port-said', 'nile-delta'],
  'port-said': ['mediterranean', 'ismailia', 'nile-delta', 'sinai'],
  ismailia: ['port-said', 'great-bitter-lake', 'sinai', 'nile-delta'],
  'great-bitter-lake': ['ismailia', 'little-bitter', 'sinai'],
  'little-bitter': ['great-bitter-lake', 'suez-city', 'sinai', 'arabian-peninsula'],
  'suez-city': ['little-bitter', 'red-sea', 'arabian-peninsula'],
  'red-sea': ['suez-city', 'arabian-peninsula'],
  sinai: ['port-said', 'ismailia', 'great-bitter-lake', 'little-bitter'],
  'nile-delta': ['mediterranean', 'port-said', 'ismailia'],
  'arabian-peninsula': ['little-bitter', 'suez-city', 'red-sea'],
};

// ─── Commander definitions ────────────────────────────────────────────────────

export const COMMANDER_DEFS: Record<CommanderId, CommanderDef> = {
  hayes: {
    id: 'hayes',
    name: 'Admiral Hayes',
    title: 'Admiral',
    faction: 'opener',
    flagshipType: 'Carrier',
    passive: '+1 die to all naval combat',
    active: 'Full Broadside: all ships in one zone fire twice this combat phase',
    activeCost: 10,
  },
  malik: {
    id: 'malik',
    name: 'Director Malik',
    title: 'Director',
    faction: 'opener',
    flagshipType: 'Intel support zone HQ',
    passive: 'Draw +1 response card each Current Events phase',
    active: 'Intelligence Drop: look at opponent\'s full hand of response cards',
    activeCost: 10,
  },
  sato: {
    id: 'sato',
    name: 'Engineer Sato',
    title: 'Engineer',
    faction: 'opener',
    flagshipType: 'Shipyard support zone HQ',
    passive: 'Dial upgrades cost 1 less Intel',
    active: 'Emergency Refit: instantly repair all damaged ships in one zone to full HP',
    activeCost: 10,
  },
  vasquez: {
    id: 'vasquez',
    name: 'General Vasquez',
    title: 'General',
    faction: 'blocker',
    flagshipType: 'Fortified canal zone HQ',
    passive: '+1 fortification in every controlled zone',
    active: 'Lockdown: one canal zone cannot have its openness increased this round',
    activeCost: 10,
  },
  khoury: {
    id: 'khoury',
    name: 'Admiral Khoury',
    title: 'Admiral',
    faction: 'blocker',
    flagshipType: 'Missile silo support zone',
    passive: 'Missiles cost 1 less Fuel',
    active: 'Barrage: fire 3 missiles at no Steel cost this turn',
    activeCost: 10,
  },
  chen: {
    id: 'chen',
    name: 'Spymaster Chen',
    title: 'Spymaster',
    faction: 'blocker',
    flagshipType: 'Intel support zone HQ',
    passive: '+1 Intel/turn; opponent draws 1 fewer response card',
    active: 'False Flag: swap the effects of the current Headline card',
    activeCost: 10,
  },
};

// ─── Response card definitions ────────────────────────────────────────────────

export const RESPONSE_CARD_DEFS: Record<ResponseCardId, ResponseCardDef> = {
  diplomatic_pressure: {
    id: 'diplomatic_pressure',
    name: 'Diplomatic Pressure',
    whoCanPlay: 'opener',
    effect: 'Cancel morale loss from headline this round.',
  },
  expedited_convoy: {
    id: 'expedited_convoy',
    name: 'Expedited Convoy',
    whoCanPlay: 'opener',
    effect: '+15% openness in the most closed canal zone.',
  },
  emergency_resupply: {
    id: 'emergency_resupply',
    name: 'Emergency Resupply',
    whoCanPlay: 'either',
    effect: 'Gain 4 Fuel immediately.',
  },
  intercept_order: {
    id: 'intercept_order',
    name: 'Intercept Order',
    whoCanPlay: 'either',
    effect: 'One of your Destroyers intercepts 1 extra missile this round.',
  },
  propaganda_win: {
    id: 'propaganda_win',
    name: 'Propaganda Win',
    whoCanPlay: 'either',
    effect: 'Gain 8 Morale.',
  },
  sabotage: {
    id: 'sabotage',
    name: 'Sabotage',
    whoCanPlay: 'blocker',
    effect: 'Double the obstruction token effect of this Headline.',
  },
  ghost_fleet: {
    id: 'ghost_fleet',
    name: 'Ghost Fleet',
    whoCanPlay: 'blocker',
    effect: 'Place 1 mine token in the most open canal zone (-10% openness).',
  },
  intel_blackout: {
    id: 'intel_blackout',
    name: 'Intel Blackout',
    whoCanPlay: 'either',
    effect: 'Opponent cannot see your unit positions this round.',
  },
  humanitarian_corridor: {
    id: 'humanitarian_corridor',
    name: 'Humanitarian Corridor',
    whoCanPlay: 'opener',
    effect: 'One canal zone cannot have openness reduced this round.',
  },
  strategic_ambiguity: {
    id: 'strategic_ambiguity',
    name: 'Strategic Ambiguity',
    whoCanPlay: 'either',
    effect: 'Discard this card and draw a new response card.',
  },
};

// ─── Research tier thresholds ─────────────────────────────────────────────────

export const RESEARCH_THRESHOLDS = { tier1: 4, tier2: 7, tier3: 11 };

export function isResearchUnlocked(track: ResearchTrack, tier: 1 | 2 | 3): boolean {
  if (tier === 1) return track.tier1 >= RESEARCH_THRESHOLDS.tier1;
  if (tier === 2) return track.tier1 >= RESEARCH_THRESHOLDS.tier1 && track.tier2 >= RESEARCH_THRESHOLDS.tier2;
  return (
    track.tier1 >= RESEARCH_THRESHOLDS.tier1 &&
    track.tier2 >= RESEARCH_THRESHOLDS.tier2 &&
    track.tier3 >= RESEARCH_THRESHOLDS.tier3
  );
}
