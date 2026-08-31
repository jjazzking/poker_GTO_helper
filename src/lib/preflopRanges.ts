import { Position, Rank } from '../types/poker';

export const GRID_RANKS: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

export interface MatrixCell {
  combo: string; // e.g. "AA", "AKs", "AKo"
  rank1: Rank;
  rank2: Rank;
  type: 'pair' | 'suited' | 'offsuit';
}

export function generateHandMatrix(): MatrixCell[][] {
  const matrix: MatrixCell[][] = [];

  for (let row = 0; row < 13; row++) {
    const rowCells: MatrixCell[] = [];
    for (let col = 0; col < 13; col++) {
      const r1 = GRID_RANKS[row];
      const r2 = GRID_RANKS[col];

      if (row === col) {
        // Pocket Pair
        rowCells.push({
          combo: `${r1}${r2}`,
          rank1: r1,
          rank2: r2,
          type: 'pair',
        });
      } else if (row < col) {
        // Suited (upper right triangle)
        rowCells.push({
          combo: `${r1}${r2}s`,
          rank1: r1,
          rank2: r2,
          type: 'suited',
        });
      } else {
        // Offsuit (lower left triangle)
        rowCells.push({
          combo: `${r2}${r1}o`,
          rank1: r2,
          rank2: r1,
          type: 'offsuit',
        });
      }
    }
    matrix.push(rowCells);
  }

  return matrix;
}

export type RangeAction = 'raise' | 'call' | 'fold' | 'three_bet' | 'mix';

export interface PositionRangeData {
  position: Position;
  nameKorean: string;
  openFrequency: number; // e.g. 15 for 15%
  recommendedActionMap: Record<string, RangeAction>; // combo -> action
  description: string;
}

// Pre-calculated GTO 6-Max Open Ranges
const UTG_RAISE = new Set([
  'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77',
  'AKs', 'AQs', 'AJs', 'ATs', 'A5s', 'A4s',
  'KQs', 'KJs', 'KTs',
  'QJs', 'QTs',
  'JTs', 'T9s', '98s',
  'AKo', 'AQo', 'AJo'
]);

const HJ_RAISE = new Set([
  ...UTG_RAISE,
  '66', '55',
  'A9s', 'A8s', 'A3s', 'A2s',
  'K9s', 'Q9s', 'J9s', '87s', '76s',
  'KQo', 'ATo'
]);

const CO_RAISE = new Set([
  ...HJ_RAISE,
  '44', '33', '22',
  'A7s', 'A6s',
  'K8s', 'K7s', 'K6s', 'K5s',
  'Q8s', 'J8s', 'T8s', '97s', '86s', '75s', '65s', '54s',
  'KJo', 'KTo', 'QJo', 'QTo', 'JTo'
]);

const BTN_RAISE = new Set([
  ...CO_RAISE,
  'K4s', 'K3s', 'K2s',
  'Q7s', 'Q6s', 'Q5s', 'Q4s', 'Q3s', 'Q2s',
  'J7s', 'J6s', 'J5s', 'T7s', 'T6s', '96s', '85s', '74s', '64s', '53s', '43s',
  'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o',
  'K9o', 'K8o', 'K7o',
  'Q9o', 'Q8o', 'J9o', 'J8o', 'T9o', 'T8o', '98o', '87o'
]);

const SB_RAISE = new Set([
  'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
  'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
  'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s',
  'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s',
  'JTs', 'J9s', 'J8s', 'J7s',
  'T9s', 'T8s', 'T7s', '98s', '97s', '87s', '86s', '76s', '75s', '65s', '54s',
  'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o',
  'KQo', 'KJo', 'KTo', 'K9o', 'QJo', 'QTo', 'Q9o', 'JTo', 'J9o', 'T9o', '98o'
]);

const BB_DEFENSE_VS_BTN = new Set([
  'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
  'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
  'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s',
  'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s', 'Q4s',
  'JTs', 'J9s', 'J8s', 'J7s', 'J6s', 'T9s', 'T8s', 'T7s', '98s', '97s', '96s', '87s', '86s', '76s', '75s', '65s', '54s',
  'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o',
  'KQo', 'KJo', 'KTo', 'K9o', 'K8o', 'QJo', 'QTo', 'Q9o', 'JTo', 'J9o', 'T9o', '98o', '87o'
]);

export const POSITION_RANGES: Record<Position, PositionRangeData> = {
  UTG: {
    position: 'UTG',
    nameKorean: '언더 더 건 (UTG - 약 15%)',
    openFrequency: 15,
    description: '얼리 포지션(EP)으로 5명의 플레이어가 뒤에 남아있어 타이트하고 강한 핸드 위주로 오픈해야 합니다.',
    recommendedActionMap: Array.from(UTG_RAISE).reduce((acc, c) => ({ ...acc, [c]: 'raise' }), {}),
  },
  HJ: {
    position: 'HJ',
    nameKorean: '하이잭 (HJ - 약 19%)',
    openFrequency: 19,
    description: '미들 포지션(MP)으로 UTG보다 수딧 브로드웨이 및 로우 포켓페어를 소폭 추가하여 오픈합니다.',
    recommendedActionMap: Array.from(HJ_RAISE).reduce((acc, c) => ({ ...acc, [c]: 'raise' }), {}),
  },
  CO: {
    position: 'CO',
    nameKorean: '컷오프 (CO - 약 27%)',
    openFrequency: 27,
    description: '레이트 포지션의 시작입니다. 버튼과 블라인드 3명만 남아있으므로 레인지를 27% 수준으로 크게 확장합니다.',
    recommendedActionMap: Array.from(CO_RAISE).reduce((acc, c) => ({ ...acc, [c]: 'raise' }), {}),
  },
  BTN: {
    position: 'BTN',
    nameKorean: '버튼 (BTN - 약 45%)',
    openFrequency: 45,
    description: '포커 테이블에서 가장 유리한 포지션입니다. 포스트플랍에서 항상 마지막 액션을 하므로 45% 이상의 넓은 레인지로 스틸 오픈합니다.',
    recommendedActionMap: Array.from(BTN_RAISE).reduce((acc, c) => ({ ...acc, [c]: 'raise' }), {}),
  },
  SB: {
    position: 'SB',
    nameKorean: '스몰 블라인드 (SB - 약 40%)',
    openFrequency: 40,
    description: '모두 폴드하고 빅블라인드만 남은 블라인드 vs 블라인드 상황에서 40% 이상의 공격적인 오픈/레이즈가 표준입니다.',
    recommendedActionMap: Array.from(SB_RAISE).reduce((acc, c) => ({ ...acc, [c]: 'raise' }), {}),
  },
  BB: {
    position: 'BB',
    nameKorean: '빅 블라인드 (BB - 방어 레인지)',
    openFrequency: 55,
    description: '이미 1BB를 지불했으므로 팟 오즈가 유리하여, 버튼의 오픈에 대해 넓은 레인지로 콜(디펜스) 또는 3-Bet을 합니다.',
    recommendedActionMap: Array.from(BB_DEFENSE_VS_BTN).reduce((acc, c) => ({ ...acc, [c]: 'call' }), {
      AA: 'three_bet', KK: 'three_bet', QQ: 'three_bet', JJ: 'three_bet', TT: 'three_bet',
      AKs: 'three_bet', AQs: 'three_bet', AJs: 'three_bet', KQs: 'three_bet', AKo: 'three_bet', AQo: 'three_bet',
      A5s: 'three_bet', A4s: 'three_bet',
    }),
  },
};

export function getHandComboString(card1: { rank: Rank; suit: string }, card2: { rank: Rank; suit: string }): string {
  const r1Idx = GRID_RANKS.indexOf(card1.rank);
  const r2Idx = GRID_RANKS.indexOf(card2.rank);

  const higherRank = r1Idx <= r2Idx ? card1.rank : card2.rank;
  const lowerRank = r1Idx <= r2Idx ? card2.rank : card1.rank;

  if (card1.rank === card2.rank) {
    return `${card1.rank}${card2.rank}`;
  }

  const isSuited = card1.suit === card2.suit;
  return `${higherRank}${lowerRank}${isSuited ? 's' : 'o'}`;
}
