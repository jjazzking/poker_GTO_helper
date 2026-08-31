import type { Card, Rank } from '../types/poker';
import { createDeck } from './pokerEngine';

// Heads-up equity of every starting hand class against a uniformly random hand,
// as a percentage. Generated offline with this repo's own evaluator at 40k
// trials per class, then sorted strongest first. It is embedded rather than
// computed at load time because computing all 169 classes takes ~40 seconds.
// Spot check against published figures: AA 85.0, KK 82.3, AKs 67.1, 32o 32.3.
export const COMBO_EQUITY: Array<[string, number]> = [
  ['AA', 85], ['KK', 82.3], ['QQ', 79.9], ['JJ', 77.6], ['TT', 75.3], ['99', 72.3],
  ['88', 69.1], ['AKs', 67.1], ['AQs', 66.6], ['77', 66.1], ['AKo', 65.3], ['AJs', 65.3],
  ['AQo', 64.5], ['ATs', 64.3], ['AJo', 63.9], ['KQs', 63.6], ['ATo', 63.2], ['66', 63.1],
  ['KJs', 62.6], ['A9s', 62.3], ['A8s', 62.2], ['KTs', 61.6], ['KQo', 61.4], ['KJo', 60.7],
  ['A7s', 60.6], ['A9o', 60.5], ['K9s', 60.1], ['55', 60.1], ['QJs', 60], ['A5s', 59.9],
  ['KTo', 59.9], ['A6s', 59.8], ['QTs', 59.6], ['A8o', 59.5], ['A7o', 59.2], ['A4s', 58.8],
  ['K8s', 58.3], ['QJo', 58.1], ['A6o', 58], ['A3s', 57.9], ['K9o', 57.9], ['A5o', 57.6],
  ['K7s', 57.5], ['QTo', 57.4], ['Q9s', 57.4], ['JTs', 57.1], ['A2s', 57], ['44', 57],
  ['A4o', 56.8], ['K6s', 56.8], ['Q8s', 56.5], ['K8o', 56.3], ['K5s', 56], ['A3o', 55.7],
  ['J9s', 55.7], ['JTo', 55.6], ['Q9o', 55.3], ['A2o', 55.1], ['K7o', 55.1], ['K4s', 55],
  ['J8s', 54.2], ['K3s', 54.1], ['Q7s', 54], ['T9s', 54], ['K6o', 53.8], ['Q8o', 53.6],
  ['33', 53.6], ['Q6s', 53.5], ['K5o', 53.3], ['K2s', 53.1], ['J9o', 53.1], ['Q5s', 53],
  ['T8s', 52.4], ['K4o', 52.3], ['J7s', 52.3], ['Q4s', 51.7], ['T9o', 51.7], ['J8o', 51.6],
  ['Q7o', 51.5], ['K3o', 51.2], ['Q3s', 51.1], ['Q6o', 51], ['K2o', 50.7], ['T7s', 50.7],
  ['98s', 50.6], ['J6s', 50.5], ['Q5o', 50.3], ['22', 50.1], ['Q2s', 49.8], ['J5s', 49.8],
  ['T8o', 49.6], ['J7o', 49.5], ['Q4o', 49.4], ['97s', 49.2], ['T6s', 48.8], ['J4s', 48.7],
  ['Q3o', 48.2], ['T7o', 47.9], ['98o', 47.9], ['J3s', 47.8], ['87s', 47.8], ['J6o', 47.6],
  ['J2s', 47.5], ['T5s', 47.4], ['96s', 47.3], ['Q2o', 47.1], ['J5o', 47], ['T4s', 46.5],
  ['97o', 46.5], ['T6o', 46.2], ['J4o', 46.1], ['95s', 46.1], ['86s', 46], ['T3s', 45.8],
  ['J3o', 45.4], ['87o', 45], ['76s', 45], ['T2s', 44.8], ['85s', 44.8], ['T5o', 44.6],
  ['96o', 44.3], ['J2o', 44.2], ['T4o', 43.8], ['94s', 43.8], ['86o', 43.8], ['75s', 43.6],
  ['93s', 43.2], ['95o', 43], ['84s', 42.9], ['65s', 42.9], ['92s', 42.4], ['T3o', 42.3],
  ['76o', 42.3], ['74s', 41.9], ['T2o', 41.7], ['64s', 41.4], ['85o', 41.2], ['54s', 41.2],
  ['82s', 40.7], ['94o', 40.6], ['83s', 40.6], ['73s', 40.5], ['75o', 40.4], ['93o', 40],
  ['53s', 40], ['65o', 39.9], ['63s', 39.5], ['84o', 39.1], ['92o', 38.9], ['74o', 38.6],
  ['43s', 38.6], ['54o', 38.5], ['64o', 38.4], ['52s', 38.2], ['72s', 38.1], ['83o', 37.5],
  ['62s', 37.4], ['73o', 37], ['42s', 36.9], ['82o', 36.8], ['53o', 36.2], ['32s', 36.1],
  ['63o', 35.9], ['43o', 35.3], ['72o', 34.8], ['52o', 34.3], ['62o', 33.7], ['42o', 32.9],
  ['32o', 32.3],
];

const EQUITY_BY_COMBO = new Map<string, number>(COMBO_EQUITY);

// A pair has 6 card combinations, a suited hand 4, an offsuit hand 12.
export function comboCount(combo: string): number {
  if (combo.length === 2) return 6;
  return combo.endsWith('s') ? 4 : 12;
}

export const TOTAL_HOLE_COMBOS = 1326;

export function equityOfCombo(combo: string): number {
  return EQUITY_BY_COMBO.get(combo) ?? 0;
}

// The strongest hand classes making up roughly `percent` of all dealt hands.
// Weighted by actual card combinations, so a "top 20 percent" range covers a
// fifth of the 1326 possible holdings, not a fifth of the 169 labels.
const topRangeCache = new Map<number, Set<string>>();
export function topRangeCombos(percent: number): Set<string> {
  const key = Math.round(Math.max(0, Math.min(100, percent)));
  const cached = topRangeCache.get(key);
  if (cached) return cached;

  const budget = (key / 100) * TOTAL_HOLE_COMBOS;
  const out = new Set<string>();
  let used = 0;
  for (const [combo] of COMBO_EQUITY) {
    const n = comboCount(combo);
    if (used + n > budget && out.size > 0) break;
    out.add(combo);
    used += n;
    if (used >= budget) break;
  }
  topRangeCache.set(key, out);
  return out;
}

// What share of all dealt hands a set of hand classes covers.
export function rangePercent(combos: Set<string>): number {
  let n = 0;
  for (const c of combos) n += comboCount(c);
  return Math.round((n / TOTAL_HOLE_COMBOS) * 1000) / 10;
}

export interface HoleCombo {
  a: Card;
  b: Card;
  label: string;
}

const RANK_ORDER: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

export function comboLabel(a: Card, b: Card): string {
  const ia = RANK_ORDER.indexOf(a.rank);
  const ib = RANK_ORDER.indexOf(b.rank);
  const hi = ia <= ib ? a : b;
  const lo = ia <= ib ? b : a;
  if (a.rank === b.rank) return `${a.rank}${b.rank}`;
  return `${hi.rank}${lo.rank}${a.suit === b.suit ? 's' : 'o'}`;
}

// Every one of the 1326 possible two-card holdings, built once and reused. Range
// filtering and card removal both work by scanning this list.
let allCombosCache: HoleCombo[] | null = null;
export function allHoleCombos(): HoleCombo[] {
  if (allCombosCache) return allCombosCache;
  const deck = createDeck();
  const out: HoleCombo[] = [];
  for (let i = 0; i < deck.length; i++) {
    for (let j = i + 1; j < deck.length; j++) {
      out.push({ a: deck[i], b: deck[j], label: comboLabel(deck[i], deck[j]) });
    }
  }
  allCombosCache = out;
  return out;
}

// The holdings in `range` still possible once the `dead` cards are visible.
// Card removal is what makes blockers real: holding the ace of spades deletes
// every one of villain's nut-flush combos that needed it.
export function availableCombos(range: Set<string>, dead: Set<string>): HoleCombo[] {
  const out: HoleCombo[] = [];
  for (const combo of allHoleCombos()) {
    if (!range.has(combo.label)) continue;
    if (dead.has(combo.a.id) || dead.has(combo.b.id)) continue;
    out.push(combo);
  }
  return out;
}
