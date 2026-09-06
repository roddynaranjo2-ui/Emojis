/**
 * Core types. The core is a pure, deterministic rules engine:
 *   input  = (BoardState, Move) → output = (BoardState', ResolveEvent[])
 * The renderer (Phaser) only replays the events. Zero coupling.
 */

export type SpecialKind = 'bomb' | 'rocket_h' | 'rocket_v' | 'wild';
export type BlockerKind = 'rock' | 'ice';
/** Cage: piece is locked in place (cannot swap or fall) until the cage is broken by a match containing it or a blast. */
export type CageKind = 'cage';

export interface Piece {
  /** unique per piece instance so the renderer can track sprites across moves */
  uid: number;
  /** emoji id from content catalog (e.g. 'water'); for specials it's a display id */
  emoji: string;
  special?: SpecialKind;
}

export interface Blocker { kind: BlockerKind; hp: number }

export interface Cell {
  piece: Piece | null;
  blocker: Blocker | null;
  /** "dust" layers under the piece (Candy Crush jelly): 0 = clean, 1..2 = layers to clear by matching on top */
  dust: number;
  /** piece is caged: can be matched in place but not moved; match/blast removes the cage first */
  caged: boolean;
  /** hole: cell does not exist (irregular board shapes) */
  hole: boolean;
}

export interface Pos { col: number; row: number }

export interface Move { from: Pos; to: Pos }

export type MatchShape = 'line3' | 'line4' | 'line5' | 'L' | 'T' | 'cross';

export interface MatchGroup {
  cells: Pos[];
  emoji: string;
  shape: MatchShape;
  /** cell where the resulting evolved/special piece is spawned */
  origin: Pos;
  horizontal: boolean;
}

// ─── Events emitted during a resolve cascade (renderer replays these) ───────
export type ResolveEvent =
  | { type: 'swap'; a: Pos; b: Pos; valid: boolean }
  | { type: 'match'; group: MatchGroup; cascade: number }
  | { type: 'evolve'; at: Pos; from: string; to: string; piece: Piece; cascade: number }
  | { type: 'apex_burst'; at: Pos; emoji: string; area: Pos[]; cascade: number }
  | { type: 'spawn_special'; at: Pos; piece: Piece; cascade: number }
  | { type: 'special_fire'; kind: SpecialKind | 'mega_cross' | 'wild_sweep' | 'double_bomb' | 'double_rocket'; at: Pos; area: Pos[]; cascade: number; magnitude: number }
  | { type: 'synergy'; kind: 'bomb_rocket' | 'bomb_bomb' | 'rocket_rocket' | 'wild_bomb' | 'wild_rocket' | 'wild_wild'; a: Pos; b: Pos; center: Pos; cascade: number }
  | { type: 'blocker_hit'; at: Pos; kind: BlockerKind; remaining: number; cascade: number }
  | { type: 'dust_clear'; at: Pos; remaining: number; cascade: number }
  | { type: 'cage_break'; at: Pos; cascade: number }
  | { type: 'booster'; kind: 'hammer' | 'shuffle' | 'rocket_h' | 'rocket_v' | 'bomb' | 'wild'; at?: Pos }
  | { type: 'clear'; cells: Array<{ pos: Pos; piece: Piece }>; cascade: number; source: 'match' | 'special' | 'apex' }
  | { type: 'gravity'; falls: Array<{ from: Pos; to: Pos; uid: number }>; cascade: number }
  | { type: 'refill'; spawns: Array<{ at: Pos; piece: Piece; fromRow: number }>; cascade: number }
  | { type: 'score'; delta: number; total: number; combo: number; cascade: number }
  | { type: 'collect'; emoji: string; count: number; cascade: number }
  | { type: 'shuffle'; reason: 'no_moves' }
  | { type: 'level_end'; won: boolean; stars: 0 | 1 | 2 | 3; score: number };

export interface ResolveResult {
  events: ResolveEvent[];
  scoreDelta: number;
  /** max cascade depth reached (used by SFX pentatonic ladder + shake) */
  cascades: number;
  /** emoji id → count collected during this move */
  collected: Record<string, number>;
  blockersCleared: number;
  dustCleared: number;
  cagesBroken: number;
}
