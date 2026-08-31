import { Card, EvaluatedHand, HandRank, Rank, Suit, Player, Pot, LiveEquityData, Position, ActionType, AIPersonalityId } from '../types/poker';

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
        score: HandRank.ROYAL_FLUSH * 100000000 + straightHigh,
        cards: sorted,
        description: '로열 스트레이트 플러시 (A-K-Q-J-10 동문양)',
      };
    }
    return {
      rank: HandRank.STRAIGHT_FLUSH,
      rankName: 'Straight Flush',
      rankNameKorean: RANK_NAMES_KOREAN[HandRank.STRAIGHT_FLUSH],
      score: HandRank.STRAIGHT_FLUSH * 100000000 + straightHigh,
      cards: sorted,
      description: `${VALUE_TO_RANK[straightHigh]} 하이 스트레이트 플러시`,
    };
  }

  // 2. Four of a kind
  if (counts[0].count === 4) {
    const quadVal = counts[0].val;
    const kicker = counts[1].val;
    const score = HandRank.FOUR_OF_A_KIND * 100000000 + quadVal * 100 + kicker;
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
    const score = HandRank.FULL_HOUSE * 100000000 + tripVal * 100 + pairVal;
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
    let score = HandRank.FLUSH * 100000000;
    values.forEach((v, i) => {
      score += v * Math.pow(15, 4 - i);
    });
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
    const score = HandRank.STRAIGHT * 100000000 + straightHigh;
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
    const score = HandRank.THREE_OF_A_KIND * 100000000 + tripVal * 10000 + kickers[0] * 100 + kickers[1];
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
    const score = HandRank.TWO_PAIR * 100000000 + highPair * 10000 + lowPair * 100 + kicker;
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
    const score = HandRank.ONE_PAIR * 100000000 + pairVal * 1000000 + kickers[0] * 10000 + kickers[1] * 100 + kickers[2];
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
  let score = HandRank.HIGH_CARD * 100000000;
  values.forEach((v, i) => {
    score += v * Math.pow(15, 4 - i);
  });
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

  // 6 or 7 cards: find highest score 5-card combo
  const allCombos = combinations(cards, 5);
  let bestHand = evaluate5Cards(allCombos[0]);

  for (let i = 1; i < allCombos.length; i++) {
    const current = evaluate5Cards(allCombos[i]);
    if (current.score > bestHand.score) {
      bestHand = current;
    }
  }

  return bestHand;
}

// Calculate Outs & Draws
export function calculateOuts(heroHole: Card[], community: Card[]): { count: number; drawTypes: string[] } {
  if (community.length < 3 || community.length >= 5) {
    return { count: 0, drawTypes: [] };
  }

  const allAvailable = createDeck().filter(
    c => !heroHole.some(h => h.id === c.id) && !community.some(b => b.id === c.id)
  );

  const currentRank = evaluateHand([...heroHole, ...community]).rank;
  const drawTypes: string[] = [];
  const winningOutCards = new Set<string>();

  // Suit count for flush draw
  const suitCounts: Record<Suit, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };
  [...heroHole, ...community].forEach(c => suitCounts[c.suit]++);

  for (const s of SUITS) {
    if (suitCounts[s] === 4) {
      drawTypes.push('플러시 드로우 (9 Outs)');
      allAvailable.filter(c => c.suit === s).forEach(c => winningOutCards.add(c.id));
    }
  }

  // Test every remaining card
  let straightOutsCount = 0;
  for (const card of allAvailable) {
    const nextHand = evaluateHand([...heroHole, ...community, card]);
    if (nextHand.rank === HandRank.STRAIGHT && currentRank < HandRank.STRAIGHT) {
      straightOutsCount++;
      winningOutCards.add(card.id);
    }
  }

  if (straightOutsCount >= 8) {
    drawTypes.push('양방 스트레이트 드로우 (8 Outs)');
  } else if (straightOutsCount >= 4) {
    drawTypes.push('것샷 스트레이트 드로우 (4 Outs)');
  }

  // Overcard outs if we have high cards
  const boardMax = Math.max(...community.map(c => RANK_VALUES[c.rank]));
  const heroOvercards = heroHole.filter(c => RANK_VALUES[c.rank] > boardMax);
  if (heroOvercards.length > 0 && currentRank === HandRank.HIGH_CARD) {
    drawTypes.push(`오버카드 드로우 (${heroOvercards.length * 3} Outs)`);
  }

  return {
    count: winningOutCards.size,
    drawTypes: drawTypes.length > 0 ? drawTypes : ['메이드 핸드 완료/발전 기회'],
  };
}

// Fast Monte Carlo Equity Calculation
export function calculateLiveEquity(
  heroHole: Card[],
  community: Card[],
  activeOpponentCount: number,
  potSize: number,
  callAmount: number,
  trials = 400
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

  for (let t = 0; t < trials; t++) {
    // Shuffle remaining deck copy
    const simDeck = shuffleDeck(remainingDeck);
    let deckIdx = 0;

    // Deal community cards up to 5
    const neededBoardCards = 5 - community.length;
    const simBoard = [...community];
    for (let b = 0; b < neededBoardCards; b++) {
      simBoard.push(simDeck[deckIdx++]);
    }

    const heroBest = evaluateHand([...heroHole, ...simBoard]);
    let heroWon = true;
    let isTie = false;

    for (let o = 0; o < numOpponents; o++) {
      const oppHole = [simDeck[deckIdx++], simDeck[deckIdx++]];
      const oppBest = evaluateHand([...oppHole, ...simBoard]);

      if (oppBest.score > heroBest.score) {
        heroWon = false;
        isTie = false;
        break;
      } else if (oppBest.score === heroBest.score) {
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

  const winRate = Math.round((wins / trials) * 100);
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

  return {
    winRate: totalEquity,
    tieRate,
    potOdds,
    requiredEquity,
    isPositiveEV,
    outsCount: outsInfo.count,
    drawTypes: outsInfo.drawTypes,
    handStrengthDesc: currentEval.description,
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
  const botEquity = calculateLiveEquity(bot.cards, communityCards, activePlayersCount - 1, potSize, toCall, 150).winRate;
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
