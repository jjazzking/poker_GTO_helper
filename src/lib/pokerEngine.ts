import { Card, EvaluatedHand, HandRank, Rank, Suit, Player, Pot, LiveEquityData, Position, ActionType, AIPersonalityId, OutsGroup } from '../types/poker';

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

export const VALUE_TO_RANK: Record<number, Rank> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

export const RANK_NAMES_KOREAN: Record<HandRank, string> = {
  [HandRank.HIGH_CARD]: '하이 카드 (No Pair)',
  [HandRank.ONE_PAIR]: '원 페어 (One Pair)',
  [HandRank.TWO_PAIR]: '투 페어 (Two Pair)',
  [HandRank.THREE_OF_A_KIND]: '트립스 / 셋 (Three of a Kind)',
  [HandRank.STRAIGHT]: '스트레이트 (Straight)',
  [HandRank.FLUSH]: '플러시 (Flush)',
  [HandRank.FULL_HOUSE]: '풀하우스 (Full House)',
  [HandRank.FOUR_OF_A_KIND]: '포카드 (Four of a Kind)',
  [HandRank.STRAIGHT_FLUSH]: '스트레이트 플러시 (Straight Flush)',
  [HandRank.ROYAL_FLUSH]: '로열 스트레이트 플러시 (Royal Flush)',
};

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        rank,
        suit,
        id: `${rank}_${suit}`,
      });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generate all combinations of k items from array
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const head = arr[0];
  const tail = arr.slice(1);
  const withHead = combinations(tail, k - 1).map(c => [head, ...c]);
  const withoutHead = combinations(tail, k);
  return [...withHead, ...withoutHead];
}

// Precomputed 5-card index combinations. The equity simulation evaluates
// millions of hands, so the combination lists are built once instead of being
// reallocated on every call.
const COMBO_INDICES: Record<number, number[][]> = {
  6: combinations([0, 1, 2, 3, 4, 5], 5),
  7: combinations([0, 1, 2, 3, 4, 5, 6], 5),
};

const POW15 = [1, 15, 225, 3375, 50625];

// Scratch buffers reused by score5. Safe because score5 never yields or recurses.
const sv = [0, 0, 0, 0, 0];
const gv = [0, 0, 0, 0, 0];
const gc = [0, 0, 0, 0, 0];

// Single source of truth for hand scoring: HandRank * 100000000 + tie-breakers.
// Returns only the comparable number, allocating nothing, so it is cheap enough
// to call inside the Monte Carlo loop. evaluate5Cards builds the human-readable
// fields on top of this score.
export function score5(c0: Card, c1: Card, c2: Card, c3: Card, c4: Card): number {
  sv[0] = RANK_VALUES[c0.rank];
  sv[1] = RANK_VALUES[c1.rank];
  sv[2] = RANK_VALUES[c2.rank];
  sv[3] = RANK_VALUES[c3.rank];
  sv[4] = RANK_VALUES[c4.rank];

  // Insertion sort, descending
  for (let i = 1; i < 5; i++) {
    const v = sv[i];
    let j = i - 1;
    while (j >= 0 && sv[j] < v) {
      sv[j + 1] = sv[j];
      j--;
    }
    sv[j + 1] = v;
  }

  const suit = c0.suit;
  const isFlush = c1.suit === suit && c2.suit === suit && c3.suit === suit && c4.suit === suit;

  let isStraight = false;
  let straightHigh = 0;
  if (sv[0] - sv[1] === 1 && sv[1] - sv[2] === 1 && sv[2] - sv[3] === 1 && sv[3] - sv[4] === 1) {
    isStraight = true;
    straightHigh = sv[0];
  } else if (sv[0] === 14 && sv[1] === 5 && sv[2] === 4 && sv[3] === 3 && sv[4] === 2) {
    // Ace-low straight A-2-3-4-5 plays as a 5-high straight
    isStraight = true;
    straightHigh = 5;
  }

  if (isFlush && isStraight) {
    const rank = straightHigh === 14 ? HandRank.ROYAL_FLUSH : HandRank.STRAIGHT_FLUSH;
    return rank * 100000000 + straightHigh;
  }

  // Group equal values. sv is already descending, so equal values are adjacent
  // and the groups come out value-descending before the count sort below.
  let g = -1;
  for (let i = 0; i < 5; i++) {
    if (g >= 0 && gv[g] === sv[i]) {
      gc[g]++;
    } else {
      g++;
      gv[g] = sv[i];
      gc[g] = 1;
    }
  }
  const groupCount = g + 1;

  // Reorder groups by count desc, then value desc
  for (let i = 1; i < groupCount; i++) {
    const v = gv[i];
    const c = gc[i];
    let j = i - 1;
    while (j >= 0 && (gc[j] < c || (gc[j] === c && gv[j] < v))) {
      gv[j + 1] = gv[j];
      gc[j + 1] = gc[j];
      j--;
    }
    gv[j + 1] = v;
    gc[j + 1] = c;
  }

  if (gc[0] === 4) {
    return HandRank.FOUR_OF_A_KIND * 100000000 + gv[0] * 100 + gv[1];
  }
  if (gc[0] === 3 && gc[1] === 2) {
    return HandRank.FULL_HOUSE * 100000000 + gv[0] * 100 + gv[1];
  }
  if (isFlush) {
    let score = HandRank.FLUSH * 100000000;
    for (let i = 0; i < 5; i++) score += sv[i] * POW15[4 - i];
    return score;
  }
  if (isStraight) {
    return HandRank.STRAIGHT * 100000000 + straightHigh;
  }
  if (gc[0] === 3) {
    return HandRank.THREE_OF_A_KIND * 100000000 + gv[0] * 10000 + gv[1] * 100 + gv[2];
  }
  if (gc[0] === 2 && gc[1] === 2) {
    return HandRank.TWO_PAIR * 100000000 + gv[0] * 10000 + gv[1] * 100 + gv[2];
  }
  if (gc[0] === 2) {
    return HandRank.ONE_PAIR * 100000000 + gv[0] * 1000000 + gv[1] * 10000 + gv[2] * 100 + gv[3];
  }

  let score = HandRank.HIGH_CARD * 100000000;
  for (let i = 0; i < 5; i++) score += sv[i] * POW15[4 - i];
  return score;
}

// Best achievable score from 5, 6, or 7 cards, without building the descriptive
// EvaluatedHand object. Used by the equity simulation, which only compares scores.
export function bestScore(cards: Card[]): number {
  if (cards.length === 5) {
    return score5(cards[0], cards[1], cards[2], cards[3], cards[4]);
  }
  const combos = COMBO_INDICES[cards.length];
  if (!combos) return evaluateHand(cards).score;

  let best = -1;
  for (let i = 0; i < combos.length; i++) {
    const c = combos[i];
    const s = score5(cards[c[0]], cards[c[1]], cards[c[2]], cards[c[3]], cards[c[4]]);
    if (s > best) best = s;
  }
  return best;
}

// Evaluate exactly 5 cards
export function evaluate5Cards(cards: Card[]): EvaluatedHand {
  if (cards.length !== 5) {
    throw new Error('evaluate5Cards requires exactly 5 cards');
  }

  // Sort descending by value
  const sorted = [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
  const values = sorted.map(c => RANK_VALUES[c.rank]);
  const suits = sorted.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);
  const score = score5(sorted[0], sorted[1], sorted[2], sorted[3], sorted[4]);

  // Check straight
  let isStraight = false;
  let straightHigh = 0;

  // Standard straight
  if (
    values[0] - values[1] === 1 &&
    values[1] - values[2] === 1 &&
    values[2] - values[3] === 1 &&
    values[3] - values[4] === 1
  ) {
    isStraight = true;
    straightHigh = values[0];
  } else if (
    values[0] === 14 && // Ace-low straight A-2-3-4-5
    values[1] === 5 &&
    values[2] === 4 &&
    values[3] === 3 &&
    values[4] === 2
  ) {
    isStraight = true;
    straightHigh = 5; // 5-high straight
  }

  // Value counts for pair/trips/quads
  const countMap: Record<number, number> = {};
  for (const v of values) {
    countMap[v] = (countMap[v] || 0) + 1;
  }

  const counts = Object.entries(countMap)
    .map(([val, count]) => ({ val: Number(val), count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.val - a.val;
    });

  // 1. Royal Flush & Straight Flush
  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      return {
        rank: HandRank.ROYAL_FLUSH,
        rankName: 'Royal Flush',
        rankNameKorean: RANK_NAMES_KOREAN[HandRank.ROYAL_FLUSH],
        score,
        cards: sorted,
        description: '로열 스트레이트 플러시 (A-K-Q-J-10 동문양)',
      };
    }
    return {
      rank: HandRank.STRAIGHT_FLUSH,
      rankName: 'Straight Flush',
      rankNameKorean: RANK_NAMES_KOREAN[HandRank.STRAIGHT_FLUSH],
      score,
      cards: sorted,
      description: `${VALUE_TO_RANK[straightHigh]} 하이 스트레이트 플러시`,
    };
  }

  // 2. Four of a kind
  if (counts[0].count === 4) {
    const quadVal = counts[0].val;
    const kicker = counts[1].val;
    return {
      rank: HandRank.FOUR_OF_A_KIND,
      rankName: 'Four of a Kind',
      rankNameKorean: RANK_NAMES_KOREAN[HandRank.FOUR_OF_A_KIND],
      score,
      cards: sorted,
      description: `${VALUE_TO_RANK[quadVal]} 포카드 (Kicker ${VALUE_TO_RANK[kicker]})`,
    };
  }

  // 3. Full house
  if (counts[0].count === 3 && counts[1].count === 2) {
    const tripVal = counts[0].val;
    const pairVal = counts[1].val;
    return {
      rank: HandRank.FULL_HOUSE,
      rankName: 'Full House',
      rankNameKorean: RANK_NAMES_KOREAN[HandRank.FULL_HOUSE],
      score,
      cards: sorted,
      description: `풀하우스 (${VALUE_TO_RANK[tripVal]} 셋 & ${VALUE_TO_RANK[pairVal]} 페어)`,
    };
  }

  // 4. Flush
  if (isFlush) {
    return {
      rank: HandRank.FLUSH,
      rankName: 'Flush',
      rankNameKorean: RANK_NAMES_KOREAN[HandRank.FLUSH],
      score,
      cards: sorted,
      description: `${VALUE_TO_RANK[values[0]]} 하이 플러시`,
    };
  }

  // 5. Straight
  if (isStraight) {
    return {
      rank: HandRank.STRAIGHT,
      rankName: 'Straight',
      rankNameKorean: RANK_NAMES_KOREAN[HandRank.STRAIGHT],
      score,
      cards: sorted,
      description: `${VALUE_TO_RANK[straightHigh]} 하이 스트레이트`,
    };
  }

  // 6. Three of a kind
  if (counts[0].count === 3) {
    const tripVal = counts[0].val;
    const kickers = [counts[1].val, counts[2].val].sort((a, b) => b - a);
    return {
      rank: HandRank.THREE_OF_A_KIND,
      rankName: 'Three of a Kind',
      rankNameKorean: RANK_NAMES_KOREAN[HandRank.THREE_OF_A_KIND],
      score,
      cards: sorted,
      description: `${VALUE_TO_RANK[tripVal]} 트리플 (키커 ${VALUE_TO_RANK[kickers[0]]}, ${VALUE_TO_RANK[kickers[1]]})`,
    };
  }

  // 7. Two pair
  if (counts[0].count === 2 && counts[1].count === 2) {
    const highPair = Math.max(counts[0].val, counts[1].val);
    const lowPair = Math.min(counts[0].val, counts[1].val);
    const kicker = counts[2].val;
    return {
      rank: HandRank.TWO_PAIR,
      rankName: 'Two Pair',
      rankNameKorean: RANK_NAMES_KOREAN[HandRank.TWO_PAIR],
      score,
      cards: sorted,
      description: `투 페어 (${VALUE_TO_RANK[highPair]} & ${VALUE_TO_RANK[lowPair]}, 키커 ${VALUE_TO_RANK[kicker]})`,
    };
  }

  // 8. One pair
  if (counts[0].count === 2) {
    const pairVal = counts[0].val;
    const kickers = [counts[1].val, counts[2].val, counts[3].val].sort((a, b) => b - a);
    return {
      rank: HandRank.ONE_PAIR,
      rankName: 'One Pair',
      rankNameKorean: RANK_NAMES_KOREAN[HandRank.ONE_PAIR],
      score,
      cards: sorted,
      description: `원 페어 (${VALUE_TO_RANK[pairVal]} 페어, 키커 ${VALUE_TO_RANK[kickers[0]]})`,
    };
  }

  // 9. High card
  return {
    rank: HandRank.HIGH_CARD,
    rankName: 'High Card',
    rankNameKorean: RANK_NAMES_KOREAN[HandRank.HIGH_CARD],
    score,
    cards: sorted,
    description: `${VALUE_TO_RANK[values[0]]} 하이 카드`,
  };
}

// Evaluate best 5 cards out of 5, 6, or 7 cards
export function evaluateHand(cards: Card[]): EvaluatedHand {
  if (cards.length < 5) {
    // If less than 5 cards, evaluate what we have for preview
    if (cards.length === 2) {
      if (cards[0].rank === cards[1].rank) {
        return {
          rank: HandRank.ONE_PAIR,
          rankName: 'Pocket Pair',
          rankNameKorean: `포켓 페어 (${cards[0].rank}${cards[0].rank})`,
          score: HandRank.ONE_PAIR * 100000000 + RANK_VALUES[cards[0].rank] * 1000000,
          cards,
          description: `포켓 ${cards[0].rank} 페어`,
        };
      }
      const highRank = RANK_VALUES[cards[0].rank] >= RANK_VALUES[cards[1].rank] ? cards[0].rank : cards[1].rank;
      const suited = cards[0].suit === cards[1].suit ? 's (수딧)' : 'o (옵수딧)';
      return {
        rank: HandRank.HIGH_CARD,
        rankName: 'High Card',
        rankNameKorean: `${cards[0].rank}${cards[1].rank}${suited}`,
        score: HandRank.HIGH_CARD * 100000000 + RANK_VALUES[highRank],
        cards,
        description: `${cards[0].rank}${cards[1].rank} ${suited}`,
      };
    }
    return {
      rank: HandRank.HIGH_CARD,
      rankName: 'High Card',
      rankNameKorean: '하이 카드',
      score: 0,
      cards,
      description: '카드 조합 진행 중',
    };
  }

  if (cards.length === 5) {
    return evaluate5Cards(cards);
  }

  // 6 or 7 cards: score every 5-card combo with the cheap scorer, then build the
  // descriptive object once, for the winner only.
  const indices = Array.from({ length: cards.length }, (_, i) => i);
  const combos = COMBO_INDICES[cards.length] || combinations(indices, 5);

  let bestCombo = combos[0];
  let bestValue = -1;
  for (let i = 0; i < combos.length; i++) {
    const c = combos[i];
    const value = score5(cards[c[0]], cards[c[1]], cards[c[2]], cards[c[3]], cards[c[4]]);
    if (value > bestValue) {
      bestValue = value;
      bestCombo = c;
    }
  }

  return evaluate5Cards([
    cards[bestCombo[0]],
    cards[bestCombo[1]],
    cards[bestCombo[2]],
    cards[bestCombo[3]],
    cards[bestCombo[4]],
  ]);
}

// Calculate Outs & Draws
// Calculate Detailed Outs, Target Hands, and Probabilities
export function calculateOuts(heroHole: Card[], community: Card[]): {
  count: number;
  drawTypes: string[];
  outsGroups: OutsGroup[];
  winningCards: Card[];
  aimingSummary: string;
} {
  if (community.length < 3) {
    // Preflop targets
    if (heroHole.length === 2) {
      const isPair = heroHole[0].rank === heroHole[1].rank;
      const isSuited = heroHole[0].suit === heroHole[1].suit;
      let aiming = '플랍에서 셋/탑페어 및 드로우 형성을 노립니다.';
      if (isPair) {
        aiming = `포켓 ${heroHole[0].rank} 페어로 플랍에서 셋(트리플, 11.8%) 및 오버페어를 노립니다.`;
      } else if (isSuited) {
        aiming = `수딧 핸드로 플랍에서 탑페어 및 플러시 드로우(11%) 형성을 노립니다.`;
      } else {
        aiming = `브로드웨이/하이 카드로 플랍 탑페어(32%) 및 스트레이트 드로우를 노립니다.`;
      }
      return { count: 0, drawTypes: ['프리플랍 진행 중'], outsGroups: [], winningCards: [], aimingSummary: aiming };
    }
    return { count: 0, drawTypes: [], outsGroups: [], winningCards: [], aimingSummary: '핸드 시작 대기' };
  }

  if (community.length >= 5) {
    const made = evaluateHand([...heroHole, ...community]);
    return {
      count: 0,
      drawTypes: ['쇼다운 (메이드 완료)'],
      outsGroups: [],
      winningCards: [],
      aimingSummary: `최종 메이드: ${made.description}`,
    };
  }

  const allAvailable = createDeck().filter(
    c => !heroHole.some(h => h.id === c.id) && !community.some(b => b.id === c.id)
  );
  const remainingCount = allAvailable.length; // 47 on flop, 46 on turn

  const currentEval = evaluateHand([...heroHole, ...community]);
  const currentRank = currentEval.rank;

  const flushCards: Card[] = [];
  const straightCards: Card[] = [];
  const tripsCards: Card[] = [];
  const twoPairCards: Card[] = [];
  const fullHouseCards: Card[] = [];
  const quadsCards: Card[] = [];
  const topPairCards: Card[] = [];

  const uniqueWinningCards = new Map<string, Card>();

  // Check suit counts for flush
  const suitCounts: Record<Suit, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };
  [...heroHole, ...community].forEach(c => suitCounts[c.suit]++);

  let flushSuit: Suit | null = null;
  for (const s of SUITS) {
    if (suitCounts[s] === 4) {
      flushSuit = s;
      break;
    }
  }

  const boardMaxRankVal = Math.max(...community.map(c => RANK_VALUES[c.rank]));

  for (const card of allAvailable) {
    const nextHand = evaluateHand([...heroHole, ...community, card]);

    // Did this single card improve hand rank over current?
    if (nextHand.rank > currentRank) {
      uniqueWinningCards.set(card.id, card);

      if (nextHand.rank === HandRank.ROYAL_FLUSH || nextHand.rank === HandRank.STRAIGHT_FLUSH || nextHand.rank === HandRank.FLUSH) {
        if (flushSuit && card.suit === flushSuit) {
          flushCards.push(card);
        }
      } else if (nextHand.rank === HandRank.FOUR_OF_A_KIND) {
        quadsCards.push(card);
      } else if (nextHand.rank === HandRank.FULL_HOUSE) {
        fullHouseCards.push(card);
      } else if (nextHand.rank === HandRank.STRAIGHT) {
        straightCards.push(card);
      } else if (nextHand.rank === HandRank.THREE_OF_A_KIND) {
        tripsCards.push(card);
      } else if (nextHand.rank === HandRank.TWO_PAIR) {
        twoPairCards.push(card);
      } else if (nextHand.rank === HandRank.ONE_PAIR) {
        if (heroHole.some(h => h.rank === card.rank && RANK_VALUES[h.rank] >= boardMaxRankVal)) {
          topPairCards.push(card);
        }
      }
    }
  }

  const outsGroups: OutsGroup[] = [];
  const drawTypes: string[] = [];

  const calcProb = (outs: number) => {
    if (outs <= 0) return { next: 0, river: 0 };
    const nextProb = Number(((outs / remainingCount) * 100).toFixed(1));
    let riverProb = nextProb;
    if (community.length === 3) {
      // 2 cards to come (Flop -> River)
      const missNext = (remainingCount - outs) / remainingCount;
      const missRiver = (remainingCount - 1 - outs) / (remainingCount - 1);
      riverProb = Number(((1 - missNext * missRiver) * 100).toFixed(1));
    }
    return { next: nextProb, river: riverProb };
  };

  if (flushCards.length > 0) {
    const prob = calcProb(flushCards.length);
    outsGroups.push({
      targetHand: '플러시 (Flush)',
      targetKorean: '플러시 완성',
      outsCount: flushCards.length,
      cards: flushCards,
      nextStreetProb: prob.next,
      riverProb: prob.river,
    });
    drawTypes.push(`플러시 드로우 (${flushCards.length} Outs - ${prob.next}%)`);
  }

  if (straightCards.length > 0) {
    const prob = calcProb(straightCards.length);
    const label = straightCards.length >= 8 ? '양방 스트레이트 드로우' : '것샷 스트레이트 드로우';
    outsGroups.push({
      targetHand: '스트레이트 (Straight)',
      targetKorean: '스트레이트 넛/완성',
      outsCount: straightCards.length,
      cards: straightCards,
      nextStreetProb: prob.next,
      riverProb: prob.river,
    });
    drawTypes.push(`${label} (${straightCards.length} Outs - ${prob.next}%)`);
  }

  if (fullHouseCards.length > 0 || quadsCards.length > 0) {
    const monsterCards = [...fullHouseCards, ...quadsCards];
    const prob = calcProb(monsterCards.length);
    outsGroups.push({
      targetHand: '풀하우스 / 포카드',
      targetKorean: '풀하우스/포카드 몬스터',
      outsCount: monsterCards.length,
      cards: monsterCards,
      nextStreetProb: prob.next,
      riverProb: prob.river,
    });
    drawTypes.push(`풀하우스/포카드 드로우 (${monsterCards.length} Outs)`);
  }

  if (tripsCards.length > 0) {
    const prob = calcProb(tripsCards.length);
    outsGroups.push({
      targetHand: '트리플 / 셋 (Trips/Set)',
      targetKorean: '트리플/셋 강화',
      outsCount: tripsCards.length,
      cards: tripsCards,
      nextStreetProb: prob.next,
      riverProb: prob.river,
    });
    drawTypes.push(`트리플/셋 아웃츠 (${tripsCards.length} Outs)`);
  }

  if (twoPairCards.length > 0) {
    const prob = calcProb(twoPairCards.length);
    outsGroups.push({
      targetHand: '투 페어 (Two Pair)',
      targetKorean: '투 페어 발전',
      outsCount: twoPairCards.length,
      cards: twoPairCards,
      nextStreetProb: prob.next,
      riverProb: prob.river,
    });
    drawTypes.push(`투 페어 아웃츠 (${twoPairCards.length} Outs)`);
  }

  if (topPairCards.length > 0 && currentRank === HandRank.HIGH_CARD) {
    const prob = calcProb(topPairCards.length);
    outsGroups.push({
      targetHand: '탑 페어 (Top Pair)',
      targetKorean: '탑 페어로 발전',
      outsCount: topPairCards.length,
      cards: topPairCards,
      nextStreetProb: prob.next,
      riverProb: prob.river,
    });
    drawTypes.push(`탑 페어 아웃츠 (${topPairCards.length} Outs)`);
  }

  // Aiming summary synthesis
  let aimingSummary = '';
  if (outsGroups.length > 0) {
    const topTargets = outsGroups.map(g => `${g.targetKorean} (${g.outsCount}장)`).join(' + ');
    aimingSummary = `🎯 목표: ${topTargets} (총 ${uniqueWinningCards.size} Outs)`;
  } else {
    aimingSummary = `현재 ${currentEval.description} 메이드 상태 유지`;
  }

  return {
    count: uniqueWinningCards.size,
    drawTypes: drawTypes.length > 0 ? drawTypes : ['메이드 완료'],
    outsGroups,
    winningCards: Array.from(uniqueWinningCards.values()),
    aimingSummary,
  };
}

// Fast Monte Carlo Equity Calculation with Instant Reasoning
export function calculateLiveEquity(
  heroHole: Card[],
  community: Card[],
  activeOpponentCount: number,
  potSize: number,
  callAmount: number,
  trials = 2000
): LiveEquityData {
  if (heroHole.length !== 2) {
    return {
      winRate: 0,
      tieRate: 0,
      potOdds: 0,
      requiredEquity: 0,
      isPositiveEV: false,
      outsCount: 0,
      drawTypes: [],
      handStrengthDesc: '카드 없음',
      outsGroups: [],
      winningCards: [],
      equityExplanation: '핸드 카드가 주어지면 승률 분석이 시작됩니다.',
      aimingHandSummary: '대기 중',
    };
  }

  const currentEval = evaluateHand([...heroHole, ...community]);
  const outsInfo = calculateOuts(heroHole, community);

  // Remaining deck
  const usedCards = new Set([...heroHole, ...community].map(c => c.id));
  const remainingDeck = createDeck().filter(c => !usedCards.has(c.id));

  let wins = 0;
  let ties = 0;
  const numOpponents = Math.max(1, activeOpponentCount);
  const neededBoardCards = 5 - community.length;

  // Buffers reused across every trial. The simulation only ever compares scores,
  // so it uses bestScore() and never builds the descriptive EvaluatedHand object.
  const draw = remainingDeck.slice();
  const cardsToDraw = Math.min(draw.length, neededBoardCards + numOpponents * 2);
  const heroSeven: Card[] = new Array(7);
  const oppSeven: Card[] = new Array(7);

  heroSeven[0] = heroHole[0];
  heroSeven[1] = heroHole[1];
  for (let b = 0; b < community.length; b++) {
    heroSeven[b + 2] = community[b];
    oppSeven[b + 2] = community[b];
  }

  for (let t = 0; t < trials; t++) {
    // Partial Fisher-Yates: shuffle only the cards this trial actually consumes
    // instead of copying and shuffling the whole remaining deck.
    for (let i = 0; i < cardsToDraw; i++) {
      const j = i + Math.floor(Math.random() * (draw.length - i));
      const tmp = draw[i];
      draw[i] = draw[j];
      draw[j] = tmp;
    }

    let deckIdx = 0;
    for (let b = 0; b < neededBoardCards; b++) {
      const card = draw[deckIdx++];
      heroSeven[community.length + b + 2] = card;
      oppSeven[community.length + b + 2] = card;
    }

    const heroScore = bestScore(heroSeven);
    let heroWon = true;
    let isTie = false;

    for (let o = 0; o < numOpponents; o++) {
      oppSeven[0] = draw[deckIdx++];
      oppSeven[1] = draw[deckIdx++];
      const oppScore = bestScore(oppSeven);

      if (oppScore > heroScore) {
        heroWon = false;
        isTie = false;
        break;
      } else if (oppScore === heroScore) {
        isTie = true;
      }
    }

    if (heroWon) {
      if (isTie) {
        ties++;
      } else {
        wins++;
      }
    }
  }

  const rawWinRate = Math.round((wins / trials) * 100);
  const tieRate = Math.round((ties / trials) * 100);
  const totalEquity = Math.round(((wins + ties * 0.5) / trials) * 100);

  // Pot odds calculation: toCall / (currentPot + toCall)
  let potOdds = 0;
  let requiredEquity = 0;
  let isPositiveEV = true;

  if (callAmount > 0) {
    const finalPot = potSize + callAmount;
    potOdds = Math.round((callAmount / finalPot) * 100);
    requiredEquity = potOdds;
    isPositiveEV = totalEquity >= requiredEquity;
  }

  // Synthesize crystal-clear Korean explanation of why win rate is what it is
  let equityExplanation = '';
  if (community.length === 0) {
    equityExplanation = `프리플랍 ${heroHole[0].rank}${heroHole[1].rank} 핸드로 상대 ${numOpponents}명 대상 기본 에쿼티 ${totalEquity}%입니다.`;
  } else if (community.length === 5) {
    equityExplanation = `리버 완성 핸드 [${currentEval.description}]입니다. 쇼다운 승률 ${totalEquity}%로 판정됩니다.`;
  } else {
    const outsMsg = outsInfo.count > 0 
      ? `총 ${outsInfo.count}장의 역전/발전 아웃츠가 있어` 
      : '현재 메이드 핸드가 강력하여';
    const evMsg = callAmount > 0 
      ? (isPositiveEV ? `(필요 오즈 ${potOdds}% 대비 +EV 수익적 콜)` : `(필요 오즈 ${potOdds}% 대비 -EV 위험 구간)`)
      : '';
    equityExplanation = `현재 [${currentEval.description}] 상태이며, ${outsMsg} 상대 ${numOpponents}명의 추정 레인지 대비 ${totalEquity}%의 에쿼티를 보유합니다. ${evMsg}`;
  }

  return {
    winRate: totalEquity,
    tieRate,
    potOdds,
    requiredEquity,
    isPositiveEV,
    outsCount: outsInfo.count,
    drawTypes: outsInfo.drawTypes,
    handStrengthDesc: currentEval.description,
    outsGroups: outsInfo.outsGroups,
    winningCards: outsInfo.winningCards,
    equityExplanation,
    aimingHandSummary: outsInfo.aimingSummary,
  };
}

// Calculate Pots & Side Pots for All-in situations
export function calculatePots(players: Player[]): Pot[] {
  const pots: Pot[] = [];
  const activePlayers = players.filter(p => !p.folded && p.totalInvestedThisHand > 0);

  if (activePlayers.length === 0) {
    return [{ amount: 0, eligiblePlayerIds: [] }];
  }

  // Get distinct investment levels from all-in players
  const investmentLevels = Array.from(
    new Set(players.filter(p => p.totalInvestedThisHand > 0).map(p => p.totalInvestedThisHand))
  ).sort((a, b) => a - b);

  let previousLevel = 0;

  for (const level of investmentLevels) {
    const contributionPerPlayer = level - previousLevel;
    if (contributionPerPlayer <= 0) continue;

    let potAmount = 0;
    const eligiblePlayerIds: string[] = [];

    for (const p of players) {
      if (p.totalInvestedThisHand >= level) {
        potAmount += contributionPerPlayer;
        if (!p.folded) {
          eligiblePlayerIds.push(p.id);
        }
      } else if (p.totalInvestedThisHand > previousLevel) {
        potAmount += p.totalInvestedThisHand - previousLevel;
        if (!p.folded) {
          eligiblePlayerIds.push(p.id);
        }
      }
    }

    if (potAmount > 0 && eligiblePlayerIds.length > 0) {
      pots.push({
        amount: potAmount,
        eligiblePlayerIds,
      });
    }

    previousLevel = level;
  }

  return pots.length > 0 ? pots : [{ amount: 0, eligiblePlayerIds: activePlayers.map(p => p.id) }];
}

// Bot Decision Engine for instant fast gameplay
export function calculateBotAction(
  bot: Player,
  communityCards: Card[],
  currentHighestBet: number,
  potSize: number,
  bigBlind: number,
  activePlayersCount: number,
  isPreflop: boolean
): { action: ActionType; amount: number; thought: string } {
  const personalityId = bot.personality?.id || 'gto_pro';
  const toCall = currentHighestBet - bot.currentBet;
  const botEquity = calculateLiveEquity(bot.cards, communityCards, activePlayersCount - 1, potSize, toCall, 600).winRate;
  const potOdds = toCall > 0 ? (toCall / (potSize + toCall)) * 100 : 0;
  const isChecked = toCall === 0;

  const stack = bot.chips;

  // Preflop logic
  if (isPreflop) {
    const hand = evaluateHand(bot.cards);
    const isPair = bot.cards[0].rank === bot.cards[1].rank;
    const val1 = RANK_VALUES[bot.cards[0].rank];
    const val2 = RANK_VALUES[bot.cards[1].rank];
    const maxVal = Math.max(val1, val2);
    const minVal = Math.min(val1, val2);
    const isSuited = bot.cards[0].suit === bot.cards[1].suit;

    // Monster hands: AA, KK, QQ, AKs
    const isMonster = (isPair && maxVal >= 12) || (maxVal === 14 && minVal === 13 && isSuited);
    // Strong hands: JJ, TT, 99, AKo, AQs, AJs, KQs
    const isStrong = (isPair && maxVal >= 9) || (maxVal === 14 && minVal >= 11) || (maxVal === 13 && minVal >= 12 && isSuited);
    // Playable hands: 88-22, ATs-A2s, suited connectors
    const isPlayable = isPair || isSuited || (maxVal >= 11 && minVal >= 10);

    if (isMonster) {
      if (toCall > 0 && Math.random() < 0.8) {
        const raiseAmt = Math.min(stack, Math.max(bigBlind * 3, currentHighestBet * 3));
        return { action: 'raise', amount: raiseAmt, thought: '몬스터 핸드로 밸류 3-Bet 레이즈' };
      }
      if (isChecked) {
        return { action: 'bet', amount: Math.min(stack, bigBlind * 3), thought: '프리플랍 오픈 레이즈' };
      }
      return { action: 'call', amount: toCall, thought: '프리플랍 콜' };
    }

    if (personalityId === 'aggro_shark') {
      if (Math.random() < 0.6 && (isStrong || isPlayable)) {
        const raiseAmt = Math.min(stack, Math.max(bigBlind * 3, currentHighestBet * 2.5));
        return { action: isChecked ? 'bet' : 'raise', amount: raiseAmt, thought: '어그레시브 압박 레이즈' };
      }
    }

    if (personalityId === 'rock_nit') {
      if (!isMonster && !isStrong) {
        if (isChecked) return { action: 'check', amount: 0, thought: '체크로 플랍 확인' };
        return { action: 'fold', amount: 0, thought: '타이트하게 폴드' };
      }
    }

    if (personalityId === 'calling_station') {
      if (isChecked) return { action: 'check', amount: 0, thought: '체크' };
      if (toCall <= bigBlind * 4 || isPlayable) {
        return { action: 'call', amount: Math.min(stack, toCall), thought: '루즈하게 콜' };
      }
    }

    if (isStrong) {
      if (isChecked) return { action: 'bet', amount: Math.min(stack, bigBlind * 2.5), thought: '표준 오픈 레이즈' };
      if (toCall <= bigBlind * 4) return { action: 'call', amount: Math.min(stack, toCall), thought: '강한 핸드로 콜' };
    }

    if (isPlayable) {
      if (isChecked) return { action: 'check', amount: 0, thought: '체크' };
      if (toCall <= bigBlind * 2) return { action: 'call', amount: Math.min(stack, toCall), thought: '플레이어블 핸드로 콜' };
      return { action: 'fold', amount: 0, thought: '레이즈에 폴드' };
    }

    if (isChecked) return { action: 'check', amount: 0, thought: '무료 플랍 체크' };
    return { action: 'fold', amount: 0, thought: '약한 핸드 폴드' };
  }

  // Postflop logic based on equity & personality
  if (botEquity >= 75) {
    // Very Strong Made Hand
    if (personalityId === 'tricky_trap' && Math.random() < 0.5 && isChecked) {
      return { action: 'check', amount: 0, thought: '슬로우플레이 트랩 체크' };
    }
    const betSize = Math.min(stack, Math.max(bigBlind, Math.round(potSize * 0.65)));
    if (isChecked) {
      return { action: 'bet', amount: betSize, thought: '강한 밸류 벳' };
    }
    const raiseSize = Math.min(stack, Math.max(currentHighestBet * 2.5, currentHighestBet + Math.round(potSize * 0.5)));
    return { action: 'raise', amount: raiseSize, thought: '강한 밸류 레이즈' };
  }

  if (botEquity >= 50) {
    // Medium-Strong Hand
    if (isChecked) {
      if (Math.random() < 0.6) {
        const betSize = Math.min(stack, Math.max(bigBlind, Math.round(potSize * 0.4)));
        return { action: 'bet', amount: betSize, thought: '컨티뉴에이션 벳 (C-Bet)' };
      }
      return { action: 'check', amount: 0, thought: '팟 컨트롤 체크' };
    }
    if (toCall <= stack && botEquity >= potOdds) {
      return { action: 'call', amount: Math.min(stack, toCall), thought: '오즈에 맞는 합리적 콜' };
    }
    return { action: 'fold', amount: 0, thought: '오즈 부족으로 폴드' };
  }

  if (botEquity >= 30) {
    // Drawing / Marginal Hand
    if (isChecked) {
      if (personalityId === 'aggro_shark' && Math.random() < 0.4) {
        const betSize = Math.min(stack, Math.round(potSize * 0.5));
        return { action: 'bet', amount: betSize, thought: '세미 블러프 벳' };
      }
      return { action: 'check', amount: 0, thought: '드로우 완성을 위해 체크' };
    }
    if (botEquity >= potOdds || (personalityId === 'calling_station' && toCall <= stack * 0.15)) {
      return { action: 'call', amount: Math.min(stack, toCall), thought: '드로우 잠재력으로 콜' };
    }
    return { action: 'fold', amount: 0, thought: '오즈 불리하여 폴드' };
  }

  // Weak Hand
  if (isChecked) {
    if (personalityId === 'aggro_shark' && Math.random() < 0.25) {
      const betSize = Math.min(stack, Math.round(potSize * 0.6));
      return { action: 'bet', amount: betSize, thought: '순수 블러프 벳' };
    }
    return { action: 'check', amount: 0, thought: '약한 핸드 체크' };
  }

  if (personalityId === 'calling_station' && toCall <= bigBlind * 1.5 && Math.random() < 0.4) {
    return { action: 'call', amount: Math.min(stack, toCall), thought: '작은 벳이라 콜' };
  }

  return { action: 'fold', amount: 0, thought: '약한 핸드 폴드' };
}
