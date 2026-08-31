export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  rank: Rank;
  suit: Suit;
  id: string;
}

export enum HandRank {
  HIGH_CARD = 0,
  ONE_PAIR = 1,
  TWO_PAIR = 2,
  THREE_OF_A_KIND = 3,
  STRAIGHT = 4,
  FLUSH = 5,
  FULL_HOUSE = 6,
  FOUR_OF_A_KIND = 7,
  STRAIGHT_FLUSH = 8,
  ROYAL_FLUSH = 9,
}

export interface EvaluatedHand {
  rank: HandRank;
  rankName: string;
  rankNameKorean: string;
  score: number; // numeric value for tie-breaking
  cards: Card[]; // The best 5 cards
  description: string;
}

export type Position = 'BTN' | 'SB' | 'BB' | 'UTG' | 'HJ' | 'CO';

export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

export interface PlayerAction {
  type: ActionType;
  amount: number;
  street: BettingRound;
  timestamp: number;
}

export type AIPersonalityId = 'gto_pro' | 'aggro_shark' | 'rock_nit' | 'calling_station' | 'tricky_trap';

export interface AIPersonality {
  id: AIPersonalityId;
  name: string;
  title: string;
  avatar: string;
  vpip: number; // 0-100%
  pfr: number;  // 0-100%
  aggression: number; // 1-5
  description: string;
  color: string;
}

export interface Player {
  id: string;
  name: string;
  isHuman: boolean;
  avatar: string;
  chips: number;
  currentBet: number;
  totalInvestedThisHand: number;
  cards: Card[];
  folded: boolean;
  isAllIn: boolean;
  sittingOut: boolean;
  position: Position;
  seatIndex: number;
  lastAction?: PlayerAction;
  personality?: AIPersonality;
  showCards?: boolean;
}

export type BettingRound = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'ended';

export interface Pot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface HandHistoryItem {
  id: string;
  handNumber: number;
  timestamp: number;
  smallBlind: number;
  bigBlind: number;
  communityCards: Card[];
  heroCards: Card[];
  heroPosition: Position;
  players: {
    id: string;
    name: string;
    isHuman: boolean;
    position: Position;
    chipsBefore: number;
    chipsAfter: number;
    cards?: Card[];
    handDescription?: string;
  }[];
  winners: {
    playerId: string;
    name: string;
    amount: number;
    handDescription?: string;
  }[];
  actions: {
    street: BettingRound;
    playerId: string;
    playerName: string;
    action: ActionType;
    amount: number;
  }[];
  netChips: number;
  analysis?: string;
  scoreGrade?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface OutsGroup {
  targetHand: string; // e.g. "플러시 (Flush)"
  targetKorean: string;
  outsCount: number;
  cards: Card[];
  nextStreetProb: number; // e.g. 19.1%
  riverProb?: number; // e.g. 35.0%
}

export interface LiveEquityData {
  winRate: number; // 0 - 100%
  tieRate: number; // 0 - 100%
  potOdds: number; // 0 - 100%
  requiredEquity: number; // 0 - 100%
  isPositiveEV: boolean;
  outsCount: number;
  drawTypes: string[];
  handStrengthDesc: string;
  outsGroups?: OutsGroup[];
  winningCards?: Card[];
  equityExplanation?: string;
  aimingHandSummary?: string;
}

export interface CoachAdvice {
  action: 'FOLD' | 'CHECK' | 'CALL' | 'BET' | 'RAISE' | 'ALL_IN';
  suggestedAmount?: number; // Total chips to raise TO on this street
  suggestedAmountBB?: number; // The same size in big blinds
  sizingLabel?: string; // e.g. "3-Bet 9BB", "67% 팟 벳", "올인"
  sizingRationale?: string; // One line on where the size came from
  potFraction?: number; // Chips added, as a fraction of the pot
  confidence: number; // 0-100%
  summary: string;
  reasoning: string[];
  gtoConcept: string;
  bluffPercent?: number;
  valuePercent?: number;
}

export type AppViewMode = 'table' | 'headsup' | 'drills' | 'range_chart' | 'coach_chat';

export interface SessionStats {
  handsPlayed: number;
  handsWon: number;
  vpipHands: number; // count of hands entered pot voluntarily preflop
  pfrHands: number;  // count of hands raised preflop
  threeBetHands: number;
  threeBetOpportunities: number;
  showdownsReached: number;
  showdownsWon: number;
  startingChips: number;
  currentChips: number;
  biggestPotWon: number;
  allInCount: number;
}

export interface DrillQuestion {
  id: string;
  category: 'preflop' | 'pot_odds' | 'outs' | 'bluff_catching';
  title: string;
  scenario: string;
  holeCards: [Card, Card];
  communityCards?: Card[];
  potSize: number;
  toCall: number;
  position: Position;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    explanation: string;
  }[];
  deepExplanation: string;
}
