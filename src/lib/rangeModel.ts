import { HandRank } from '../types/poker';
import type { ActionType, BettingRound, Card, Position } from '../types/poker';
import { RANK_VALUES, bestScore } from './pokerEngine';
import { POSITION_RANGES } from './preflopRanges';
import { topRangeCombos, rangePercent, availableCombos } from './handRanking';
import type { HoleCombo } from './handRanking';

// ---------------------------------------------------------------------------
// How a holding connects with a board
// ---------------------------------------------------------------------------

export type PairKind = 'none' | 'weak' | 'second' | 'top' | 'over';

export interface HandTexture {
  madeRank: HandRank;
  pairKind: PairKind;
  hasFlushDraw: boolean;
  hasBackdoorFlush: boolean; // three to a flush, one more card and it is a draw
  straightOuts: number; // distinct ranks that complete a straight using a hole card
  hasOvercards: boolean; // both hole cards above the highest board card
  highCardValue: number; // the higher of the two hole cards
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Ranks that would complete a straight, counting only straights that actually
// use one of the hole cards. Two such ranks is an open-ender, one is a gutshot.
function straightCompletingRanks(holeVals: number[], boardVals: number[]): number {
  const present = new Set<number>([...holeVals, ...boardVals]);
  if (present.has(14)) present.add(1); // the wheel

  let count = 0;
  for (let v = 2; v <= 14; v++) {
    if (present.has(v)) continue;
    const withCard = new Set(present);
    withCard.add(v);
    if (v === 14) withCard.add(1);

    for (let low = 1; low <= 10; low++) {
      let run = true;
      for (let k = 0; k < 5; k++) {
        if (!withCard.has(low + k)) {
          run = false;
          break;
        }
      }
      if (!run) continue;
      // Only counts if a hole card is part of this straight.
      const usesHole = holeVals.some(h => {
        const alt = h === 14 ? 1 : h;
        return (h >= low && h <= low + 4) || (alt >= low && alt <= low + 4);
      });
      if (usesHole) {
        count++;
        break;
      }
    }
  }
  return count;
}

export function readTexture(hole: Card[], board: Card[]): HandTexture {
  const holeVals = hole.map(c => RANK_VALUES[c.rank]);
  const boardVals = board.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
  // The hand rank is the leading term of the score, so it comes out of the cheap
  // scorer without building a descriptive object -- this runs over every combo
  // in a range, hundreds of times per analysis.
  const madeRank: HandRank =
    board.length >= 3 ? Math.floor(bestScore([...hole, ...board]) / 100000000) : HandRank.HIGH_CARD;

  let pairKind: PairKind = 'none';
  if (holeVals[0] === holeVals[1]) {
    const v = holeVals[0];
    if (boardVals.length === 0 || v > boardVals[0]) pairKind = 'over';
    else if (boardVals.length > 1 && v > boardVals[1]) pairKind = 'second';
    else pairKind = 'weak';
  } else {
    const matched = holeVals.filter(v => boardVals.includes(v));
    if (matched.length > 0) {
      const best = Math.max(...matched);
      if (best === boardVals[0]) pairKind = 'top';
      else if (boardVals.length > 1 && best === boardVals[1]) pairKind = 'second';
      else pairKind = 'weak';
    }
  }

  // Four to a flush counts as a draw only when a hole card is one of the four;
  // three to a flush is a backdoor, worth something but not a draw yet.
  let hasFlushDraw = false;
  let hasBackdoorFlush = false;
  const suitCounts: Record<string, number> = {};
  for (const c of [...hole, ...board]) suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
  for (const suit of Object.keys(suitCounts)) {
    if (!hole.some(c => c.suit === suit)) continue;
    if (suitCounts[suit] === 4) hasFlushDraw = true;
    else if (suitCounts[suit] === 3) hasBackdoorFlush = true;
  }

  return {
    madeRank,
    pairKind,
    hasFlushDraw,
    hasBackdoorFlush,
    straightOuts: board.length >= 3 ? straightCompletingRanks(holeVals, boardVals) : 0,
    hasOvercards:
      boardVals.length > 0 && holeVals[0] > boardVals[0] && holeVals[1] > boardVals[0],
    highCardValue: Math.max(holeVals[0], holeVals[1]),
  };
}

// ---------------------------------------------------------------------------
// Continue or fold
// ---------------------------------------------------------------------------

// How willing a holding is to keep playing, on a single continuous scale. Made
// hands dominate, and draws are worth roughly what their equity is worth, so
// ranking a range by this puts the hands a player actually defends with on top.
export function continueScore(texture: HandTexture): number {
  if (texture.madeRank >= HandRank.TWO_PAIR) return 1000 + texture.madeRank * 100;

  let made = 0;
  if (texture.pairKind === 'over') made = 360;
  else if (texture.pairKind === 'top') made = 300;
  else if (texture.pairKind === 'second') made = 200;
  else if (texture.pairKind === 'weak') made = 140;

  let draw = 0;
  if (texture.hasFlushDraw) draw = 250;
  if (texture.straightOuts >= 2) draw = Math.max(draw, 260);
  else if (texture.straightOuts === 1) draw = Math.max(draw, 120);

  // A hand that is both made and drawing is worth more than either half alone,
  // but not the sum: the two ways to win overlap.
  let score = Math.max(made, draw);
  if (made > 0 && draw > 0) score += Math.min(made, draw) * 0.3;
  if (texture.hasFlushDraw && texture.straightOuts >= 1) score += 60;

  if (score === 0) {
    // Nothing made and nothing drawing. These hands are not all equal: ace-high
    // with a backdoor flush is a different proposition from seven-high, and on a
    // low board this category is most of the range, so grading it is what keeps
    // fold equity from jumping between one bet size and the next.
    let air = texture.hasOvercards ? 100 : 25;
    if (texture.hasBackdoorFlush) air += 35;
    air += (texture.highCardValue - 2) * 3;
    return air;
  }
  if (texture.hasOvercards) score += 20;
  if (texture.hasBackdoorFlush) score += 10;
  return score;
}

// The bar a hand has to clear to be worth continuing at a given price. It rises
// smoothly with the bet so there is no cliff between one size and the next.
// Calibrated so a third-pot bet keeps overcards and gutshots, a two-thirds bet
// keeps any pair, and an overbet keeps only strong draws and better than a pair.
export function continueThreshold(betToPot: number): number {
  return 60 + 120 * Math.max(0, betToPot);
}

export function continuesVsBet(texture: HandTexture, betToPot: number): boolean {
  return continueScore(texture) >= continueThreshold(betToPot);
}

// Minimum defense frequency: the share of a range that has to keep playing for a
// bet of this size to not be automatically profitable as a bluff.
export function minDefenseFrequency(betToPot: number): number {
  return 1 / (1 + Math.max(0, betToPot));
}

// The part of a range that continues facing a bet. Two forces set the size of
// it: a player never defends more than MDF (defending past it just donates), and
// never defends hands with nothing regardless of price. On a board the range
// connects with, the first limit binds and defense lands near MDF. On a board it
// misses, the second binds and the range genuinely has to over-fold -- which is
// exactly where a bluff earns its money.
export function narrowToContinuing(combos: HoleCombo[], board: Card[], betToPot: number): HoleCombo[] {
  if (combos.length === 0) return [];
  const threshold = continueThreshold(betToPot);
  const scored = combos
    .map(c => ({ combo: c, score: continueScore(readTexture([c.a, c.b], board)) }))
    .sort((a, b) => b.score - a.score);

  const viable = scored.filter(s => s.score >= threshold).length;
  const cap = Math.round(combos.length * minDefenseFrequency(betToPot));
  return scored.slice(0, Math.min(viable, cap)).map(s => s.combo);
}

// ---------------------------------------------------------------------------
// Assigning a preflop range to an opponent
// ---------------------------------------------------------------------------

export interface HandAction {
  street: BettingRound;
  playerId: string;
  action: ActionType;
  amount: number;
}

export interface OpponentProfile {
  id: string;
  name: string;
  position: Position;
  vpip: number; // percent of hands the player voluntarily enters
  pfr: number; // percent of hands the player raises first in
}

export interface AssignedRange {
  playerId: string;
  name: string;
  combos: Set<string>;
  percent: number;
  reason: string;
}

const AGGRESSIVE_ACTIONS: ActionType[] = ['bet', 'raise', 'all-in'];

// A solver-like player's open frequency averaged over the six seats. Used as the
// yardstick a player's own PFR is measured against.
const AVERAGE_OPEN_FREQUENCY =
  Object.values(POSITION_RANGES).reduce((sum, r) => sum + r.openFrequency, 0) /
  Object.keys(POSITION_RANGES).length;

function without(base: Set<string>, remove: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const c of base) if (!remove.has(c)) out.add(c);
  return out;
}

// What an opponent's preflop action says about their holdings. The seat's chart
// range is the starting point; the player's own VPIP/PFR pulls it wider or
// tighter when their style clearly differs from a solver's.
export function assignPreflopRange(profile: OpponentProfile, actions: HandAction[]): AssignedRange {
  const vpip = clamp(profile.vpip || 25, 8, 80);
  const pfr = clamp(profile.pfr || 18, 5, 60);

  const preflop = actions.filter(a => a.street === 'preflop');
  const raiseOrder = preflop.filter(a => AGGRESSIVE_ACTIONS.includes(a.action));
  const myFirstRaiseIdx = raiseOrder.findIndex(a => a.playerId === profile.id);
  const didCall = preflop.some(a => a.playerId === profile.id && a.action === 'call');
  const raisedBeforeAnyCall = raiseOrder.length > 0;

  let combos: Set<string>;
  let reason: string;

  if (myFirstRaiseIdx === 0) {
    // First raise of the hand: an open from this seat. A player's PFR is a
    // figure across all seats, while the chart's frequency is for this seat
    // alone, so the two are compared as a ratio rather than head to head -- a
    // 19% PFR player still opens far wider than 19% from the button.
    const chart = POSITION_RANGES[profile.position];
    const chartPct = chart ? chart.openFrequency : 25;
    const styleFactor = pfr / AVERAGE_OPEN_FREQUENCY;
    const targetPct = clamp(Math.round(chartPct * styleFactor), 5, 90);

    if (chart && Math.abs(targetPct - chartPct) <= 5) {
      // Close enough to a solver: use the chart, whose hand selection is better
      // than a raw top-N% cut.
      combos = new Set(Object.keys(chart.recommendedActionMap));
      reason = `${profile.position} 오픈 레인지 (차트 기준)`;
    } else {
      combos = topRangeCombos(targetPct);
      reason = `${profile.position} 오픈 (PFR ${pfr}% 성향 반영, 차트 ${chartPct}% → ${targetPct}%)`;
    }
  } else if (myFirstRaiseIdx === 1) {
    combos = topRangeCombos(Math.max(4, Math.round(pfr * 0.35)));
    reason = '프리플랍 3-Bet 레인지';
  } else if (myFirstRaiseIdx >= 2) {
    combos = topRangeCombos(3);
    reason = '프리플랍 4-Bet 이상 레인지';
  } else if (didCall && raisedBeforeAnyCall) {
    // Cold-calling a raise: strong enough to continue, but the very best hands
    // would usually have re-raised instead.
    combos = without(topRangeCombos(vpip), topRangeCombos(3));
    reason = `레이즈에 콜 (VPIP ${vpip}% 기준 콜 레인지)`;
  } else if (didCall) {
    // Limping: wide and passive, with the premiums raised out of it.
    combos = without(topRangeCombos(Math.min(90, Math.round(vpip * 1.2))), topRangeCombos(8));
    reason = `림프 (VPIP ${vpip}% 루즈 패시브 레인지)`;
  } else if (profile.position === 'BB') {
    combos = topRangeCombos(Math.min(95, Math.round(vpip * 2.2)));
    reason = 'BB 체크 (넓은 디펜스 레인지)';
  } else {
    combos = topRangeCombos(vpip);
    reason = `기본 VPIP ${vpip}% 레인지`;
  }

  return { playerId: profile.id, name: profile.name, combos, percent: rangePercent(combos), reason };
}

// The concrete holdings an opponent can still have: their preflop range, minus
// anything blocked by hero's cards and the board, then narrowed by the size of
// the bet they have already called on this street.
export function liveCombosFor(
  range: AssignedRange,
  dead: Set<string>,
  board: Card[],
  calledBetToPot: number
): HoleCombo[] {
  const combos = availableCombos(range.combos, dead);
  if (board.length < 3 || calledBetToPot <= 0) return combos;
  const narrowed = narrowToContinuing(combos, board, calledBetToPot);
  return narrowed.length > 0 ? narrowed : combos;
}
