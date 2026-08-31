import { HandRank } from '../types/poker';
import type { Card } from '../types/poker';
import { calculateLiveEquity } from './pokerEngine';
import { availableCombos } from './handRanking';
import type { HoleCombo } from './handRanking';
import { readTexture, narrowToContinuing, minDefenseFrequency } from './rangeModel';
import type { AssignedRange } from './rangeModel';

export type HeroHandClass = 'value' | 'semi_bluff' | 'pure_bluff' | 'showdown_value';

export interface BlockerNote {
  card: Card;
  blockedCombos: number;
  examples: string[];
}

export interface BluffAnalysis {
  handClass: HeroHandClass;
  handClassLabel: string;
  handClassDetail: string;

  betSize: number;
  betToPot: number;

  foldEquity: number; // percent of the time every opponent folds
  perOpponentFoldEquity: Array<{ name: string; foldEquity: number; continuing: number; total: number }>;
  // The model's defense frequency against the theoretical minimum. A large gap
  // means the model has villain folding more than game theory would allow, so
  // the bluff numbers below are optimistic -- shown rather than hidden.
  modelDefenseFrequency: number;
  minDefenseFrequency: number;

  equityWhenCalled: number; // hero equity against the range that continues
  breakEvenFoldEquity: number; // fold equity the bet needs to break even
  bluffEV: number; // chips
  checkEV: number; // chips
  isProfitable: boolean;

  blockers: BlockerNote[];
  blockerSummary: string;
  summary: string;
}

// A rough label for the strongest hands a card takes away from villain, so the
// blocker line can say what is being blocked rather than just how much.
function describeCombos(combos: HoleCombo[], board: Card[]): string[] {
  const scored = combos
    .map(c => ({ label: c.label, texture: readTexture([c.a, c.b], board) }))
    .sort((a, b) => b.texture.madeRank - a.texture.madeRank);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of scored) {
    if (seen.has(s.label)) continue;
    seen.add(s.label);
    out.push(s.label);
    if (out.length === 3) break;
  }
  return out;
}

function classifyHero(
  heroCards: Card[],
  board: Card[],
  equityWhenCalled: number,
  opponentCount: number
): { handClass: HeroHandClass; label: string; detail: string } {
  const t = readTexture(heroCards, board);
  const strongDraw = t.hasFlushDraw || t.straightOuts >= 2;
  const anyDraw = strongDraw || t.straightOuts >= 1;

  // A value bet is one that wants to be called, so the hand has to actually be
  // ahead of the range that calls -- not merely look strong in the abstract. The
  // bar is an even share of the pot plus a margin, which rises with the number
  // of players who have to be beaten.
  const valueBar = 100 / (opponentCount + 1) + 10;
  const madeStrong = t.madeRank >= HandRank.TWO_PAIR;
  const madeDecent = t.pairKind === 'over' || t.pairKind === 'top';

  if (madeStrong || (madeDecent && equityWhenCalled >= valueBar)) {
    return {
      handClass: 'value',
      label: '밸류 핸드',
      detail: '이미 완성된 강한 핸드입니다. 상대의 콜을 받아내는 것이 목적이므로 폴드를 유도하는 사이즈가 아니라 콜 가능한 사이즈로 베팅합니다.',
    };
  }
  if (madeDecent) {
    return {
      handClass: 'showdown_value',
      label: '마지널 메이드 핸드',
      detail: `페어는 만들었지만 콜하는 레인지 상대로는 승률 ${equityWhenCalled}%에 그칩니다(밸류 기준 ${Math.round(
        valueBar
      )}%). 베팅하면 이기는 핸드는 폴드하고 지는 핸드만 콜하기 쉬우므로, 팟을 키우기보다 관리하는 편이 낫습니다.`,
    };
  }
  if (anyDraw) {
    return {
      handClass: 'semi_bluff',
      label: strongDraw ? '세미 블러프 (강한 드로우)' : '세미 블러프 (약한 드로우)',
      detail:
        '지금은 이겼다고 보기 어렵지만 완성 가능성이 있는 핸드입니다. 상대가 폴드하면 즉시 팟을 얻고, 콜해도 아웃츠가 남아 있어 두 갈래로 이깁니다.',
    };
  }
  if (t.pairKind !== 'none' || equityWhenCalled >= 45) {
    return {
      handClass: 'showdown_value',
      label: '쇼다운 밸류',
      detail:
        '약하지만 그냥 보여줘도 이길 때가 있는 핸드입니다. 블러프로 돌리면 이길 수 있었던 지분을 버리는 셈이라 체크로 팟을 관리하는 편이 낫습니다.',
    };
  }
  return {
    handClass: 'pure_bluff',
    label: '순수 블러프',
    detail:
      '완성 가능성도 쇼다운 가치도 거의 없는 핸드입니다. 상대를 폴드시키는 것만이 유일한 이기는 방법이므로, 폴드 에쿼티가 충분할 때만 베팅해야 합니다.',
  };
}

export function analyzeBluff(params: {
  heroCards: Card[];
  board: Card[];
  potSize: number;
  betSize: number;
  opponents: AssignedRange[];
  trials?: number;
  // Hero's showdown equity against the full range. Independent of bet size, so a
  // size search computes it once and hands it back in.
  showdownEquityPct?: number;
}): BluffAnalysis | null {
  const { heroCards, board, potSize, betSize, opponents, trials = 900 } = params;
  if (heroCards.length !== 2 || board.length < 3 || opponents.length === 0 || potSize <= 0) {
    return null;
  }

  const betToPot = betSize / potSize;
  const dead = new Set<string>([...heroCards, ...board].map(c => c.id));

  const perOpponent: BluffAnalysis['perOpponentFoldEquity'] = [];
  const continuingPerOpponent: HoleCombo[][] = [];
  let everyoneFolds = 1;

  for (const opp of opponents) {
    const live = availableCombos(opp.combos, dead);
    if (live.length === 0) continue;
    const continuing = narrowToContinuing(live, board, betToPot);
    const fe = 1 - continuing.length / live.length;
    perOpponent.push({
      name: opp.name,
      foldEquity: Math.round(fe * 100),
      continuing: continuing.length,
      total: live.length,
    });
    continuingPerOpponent.push(continuing.length > 0 ? continuing : live);
    everyoneFolds *= fe;
  }

  if (perOpponent.length === 0) return null;
  const foldEquity = Math.round(everyoneFolds * 100);
  const totalLive = perOpponent.reduce((sum, o) => sum + o.total, 0);
  const totalContinuing = perOpponent.reduce((sum, o) => sum + o.continuing, 0);
  const modelDefense = totalLive > 0 ? totalContinuing / totalLive : 0;

  // Equity against the hands that would actually call, not against the whole
  // range. This is the number that decides whether a semi-bluff still wins often
  // enough when the fold does not come.
  const equityWhenCalled = calculateLiveEquity(
    heroCards,
    board,
    continuingPerOpponent.length,
    potSize,
    0,
    trials,
    continuingPerOpponent
  ).winRate;

  // EV of betting: villain folds and we take the pot, or calls and we play a
  // bigger pot with our equity against the calling range.
  const e = equityWhenCalled / 100;
  const potAfterCall = potSize + 2 * betSize;
  const evCalled = e * potAfterCall - betSize;
  const bluffEV = everyoneFolds * potSize + (1 - everyoneFolds) * evCalled;

  // Checking realizes roughly our current share of the pot as it stands. This is
  // a one-street approximation: it ignores what either player does on later
  // streets, so treat the two EVs as a comparison, not a forecast.
  const showdownEquity =
    (params.showdownEquityPct ??
      calculateLiveEquity(heroCards, board, opponents.length, potSize, 0, trials).winRate) / 100;
  const checkEV = showdownEquity * potSize;

  // Fold equity at which betting breaks even against checking.
  const denominator = potSize - evCalled;
  const breakEven = denominator > 0 ? (checkEV - evCalled) / denominator : 0;
  const breakEvenFoldEquity = Math.round(Math.max(0, Math.min(1, breakEven)) * 100);

  // Blockers: how many continuing combos each hero card removes from villain.
  // Measured one card at a time, holding the other one dead, so the two cards
  // are not credited with the same removal twice.
  const blockers: BlockerNote[] = [];
  const primary = opponents[0];
  for (let i = 0; i < heroCards.length; i++) {
    const card = heroCards[i];
    const other = heroCards[1 - i];
    const deadWithoutCard = new Set<string>([...board.map(c => c.id), other.id]);
    const deadWithCard = new Set<string>([...deadWithoutCard, card.id]);

    const withoutCard = narrowToContinuing(availableCombos(primary.combos, deadWithoutCard), board, betToPot);
    const withCard = narrowToContinuing(availableCombos(primary.combos, deadWithCard), board, betToPot);
    const removed = withoutCard.filter(c => c.a.id === card.id || c.b.id === card.id);

    if (removed.length > 0) {
      blockers.push({
        card,
        blockedCombos: withoutCard.length - withCard.length,
        examples: describeCombos(removed, board),
      });
    }
  }
  blockers.sort((a, b) => b.blockedCombos - a.blockedCombos);

  const totalBlocked = blockers.reduce((s, b) => s + b.blockedCombos, 0);
  const primaryTotal = perOpponent[0].continuing + totalBlocked;
  const blockerSummary =
    totalBlocked > 0 && primaryTotal > 0
      ? `내 카드가 ${primary.name}의 컨티뉴 레인지에서 ${totalBlocked}콤보(약 ${Math.round(
          (totalBlocked / primaryTotal) * 100
        )}%)를 제거합니다${blockers[0].examples.length ? ` — 예: ${blockers[0].examples.join(', ')}` : ''}.`
      : '내 카드가 상대의 컨티뉴 레인지를 의미 있게 막지 못합니다.';

  const cls = classifyHero(heroCards, board, equityWhenCalled, perOpponent.length);
  const isProfitable = bluffEV > checkEV;

  const summary = isProfitable
    ? `폴드 에쿼티 ${foldEquity}%로 손익분기 ${breakEvenFoldEquity}%를 넘어, 베팅 기대값($${Math.round(
        bluffEV
      ).toLocaleString()})이 체크($${Math.round(checkEV).toLocaleString()})보다 높습니다.`
    : `폴드 에쿼티 ${foldEquity}%로 손익분기 ${breakEvenFoldEquity}%에 못 미쳐, 베팅($${Math.round(
        bluffEV
      ).toLocaleString()})보다 체크($${Math.round(checkEV).toLocaleString()})의 기대값이 높습니다.`;

  return {
    handClass: cls.handClass,
    handClassLabel: cls.label,
    handClassDetail: cls.detail,
    betSize,
    betToPot: Math.round(betToPot * 100) / 100,
    foldEquity,
    perOpponentFoldEquity: perOpponent,
    modelDefenseFrequency: Math.round(modelDefense * 100),
    minDefenseFrequency: Math.round(minDefenseFrequency(betToPot) * 100),
    equityWhenCalled,
    breakEvenFoldEquity,
    bluffEV: Math.round(bluffEV),
    checkEV: Math.round(checkEV),
    isProfitable,
    blockers,
    blockerSummary,
    summary,
  };
}

// Tries the sizes the coach would actually offer and returns the one with the
// best expected value, so a bluff is sized by what it needs to fold out rather
// than by a fixed fraction.
export function bestBluffSizing(params: {
  heroCards: Card[];
  board: Card[];
  potSize: number;
  opponents: AssignedRange[];
  candidateFractions?: number[];
  trials?: number;
}): BluffAnalysis | null {
  const fractions = params.candidateFractions || [0.33, 0.5, 0.67, 1];
  const trials = params.trials ?? 900;
  // Computed once and shared across the candidate sizes.
  const showdownEquityPct = calculateLiveEquity(
    params.heroCards,
    params.board,
    params.opponents.length,
    params.potSize,
    0,
    trials
  ).winRate;

  let best: BluffAnalysis | null = null;
  for (const f of fractions) {
    const a = analyzeBluff({
      ...params,
      trials,
      showdownEquityPct,
      betSize: Math.round(params.potSize * f),
    });
    if (a && (!best || a.bluffEV > best.bluffEV)) best = a;
  }
  return best;
}
