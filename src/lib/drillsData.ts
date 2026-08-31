import { DrillQuestion } from '../types/poker';

export const DRILL_QUESTIONS: DrillQuestion[] = [
  {
    id: 'drill_1',
    category: 'pot_odds',
    title: '플러시 드로우와 팟 오즈 계산',
    scenario: '플랍에서 팟은 $100입니다. 상대방이 $50를 벳했고, 당신은 넛 플러시 드로우(9 Outs)를 가지고 있습니다. 콜하기 위해 $50가 필요한 상황입니다. 이 콜은 수학적으로 +EV(수익성 있는) 콜일까요?',
    holeCards: [
      { rank: 'A', suit: 'spades', id: 'A_spades' },
      { rank: 'K', suit: 'spades', id: 'K_spades' },
    ],
    communityCards: [
      { rank: '2', suit: 'spades', id: '2_spades' },
      { rank: '7', suit: 'spades', id: '7_spades' },
      { rank: 'J', suit: 'hearts', id: 'J_hearts' },
    ],
    potSize: 150, // $100 + $50 bet
    toCall: 50,
    position: 'BTN',
    options: [
      {
        id: 'opt_1',
        text: '콜 (Call) — 팟 오즈(25%)보다 플러시 완성 확률(약 35%)이 높아 명확한 +EV입니다.',
        isCorrect: true,
        explanation: '팟 오즈는 50 / (150 + 50) = 25%입니다. 턴과 리버까지 9개의 아웃츠로 플러시가 완성될 확률은 4의 법칙으로 약 36%이므로 직접적인 +EV 콜입니다.',
      },
      {
        id: 'opt_2',
        text: '폴드 (Fold) — 상대의 벳 크기가 팟의 절반이므로 오즈가 나오지 않습니다.',
        isCorrect: false,
        explanation: '틀렸습니다. 팟 오즈 요구치는 25%에 불과하며 드로우 확률(약 36%)이 훨씬 높습니다.',
      },
      {
        id: 'opt_3',
        text: '올인 레이즈 (All-In) — 무조건 올인해야 폴드 에쿼티를 극대화할 수 있습니다.',
        isCorrect: false,
        explanation: '올인 세미블러프도 유효할 수 있으나, 팟 오즈 관점에서는 25% 요구치 대비 35% 승률로 저렴한 콜만으로도 안정적인 이득을 취할 수 있습니다.',
      },
    ],
    deepExplanation: '팟 오즈 = [콜 금액] / [현재 팟 + 상대 벳 + 콜 금액] = 50 / (100 + 50 + 50) = 25%.\n9 아웃츠의 2스트리트 완성 확률은 (9 × 4) = 36%입니다. 36% > 25% 이므로 콜은 확실한 이익을 가져옵니다.',
  },
  {
    id: 'drill_2',
    category: 'preflop',
    title: 'UTG 포지션 6-Max 오픈 결정',
    scenario: '6-Max 캐시게임에서 당신은 첫 번째 순서인 UTG(Under the Gun)입니다. 당신의 손에 [A♥ T♦] (A-10 옵수딧)이 들어왔습니다. GTO 표준 전략상 가장 올바른 액션은 무엇인가요?',
    holeCards: [
      { rank: 'A', suit: 'hearts', id: 'A_hearts' },
      { rank: 'T', suit: 'diamonds', id: 'T_diamonds' },
    ],
    potSize: 1.5,
    toCall: 1.0,
    position: 'UTG',
    options: [
      {
        id: 'opt_1',
        text: '폴드 (Fold) — UTG에서는 ATo가 도미네이트되기 쉬워 표준 폴드입니다.',
        isCorrect: true,
        explanation: 'UTG 뒤에는 5명의 플레이어가 남아있어 AK, AQ, AJ 및 상위 페어에 도미네이트될 위험이 매우 큽니다. A-10 수딧(ATs)은 오픈하지만 ATo는 폴드가 GTO 정석입니다.',
      },
      {
        id: 'opt_2',
        text: '오픈 레이즈 2.5BB (Raise) — 에이스를 들고 있으므로 항상 공격적으로 오픈합니다.',
        isCorrect: false,
        explanation: '에이스가 있더라도 옵수딧 키커 10은 얼리 포지션에서 장기적으로 -EV를 기록하는 대표적인 트랩 핸드입니다.',
      },
      {
        id: 'opt_3',
        text: '림프 1BB (Limp / Call) — 플랍을 싸게 보기 위해 1BB만 콜합니다.',
        isCorrect: false,
        explanation: '현대 노리밋 홀덤에서 오픈 림프(Open Limp)는 거의 모든 상황에서 금기시되는 최악의 플레이입니다.',
      },
    ],
    deepExplanation: 'UTG 레인지(15%)에는 AJo+, ATs+, KTs+, QTs+, JTs, 77+ 등이 포함됩니다. ATo는 컷오프(CO)나 버튼(BTN)에서는 강력한 오픈 핸드이지만 UTG에서는 릭(Leak)이 됩니다.',
  },
  {
    id: 'drill_3',
    category: 'outs',
    title: '양방 스트레이트 + 플러시 콤보 드로우',
    scenario: '플랍 보드가 [9♠ 8♠ 2♦]입니다. 당신은 [J♠ T♠]을 가지고 있습니다. 당신의 아웃츠(Outs)는 총 몇 개이며 다음 카드(턴)에서 넛 또는 강한 핸드가 완성될 확률은 얼마일까요?',
    holeCards: [
      { rank: 'J', suit: 'spades', id: 'J_spades' },
      { rank: 'T', suit: 'spades', id: 'T_spades' },
    ],
    communityCards: [
      { rank: '9', suit: 'spades', id: '9_spades' },
      { rank: '8', suit: 'spades', id: '8_spades' },
      { rank: '2', suit: 'diamonds', id: '2_diamonds' },
    ],
    potSize: 80,
    toCall: 40,
    position: 'CO',
    options: [
      {
        id: 'opt_1',
        text: '총 15 Outs (플러시 9개 + 스트레이트 6개) / 턴 완성 확률 약 32% (리버까지 약 54%)',
        isCorrect: true,
        explanation: '스페이드 9개 + 비스페이드 Q (3개) + 비스페이드 7 (3개) = 총 15 아웃츠 (Monster Draw). 1장의 스트리트에서 15 × 2 = 약 32% 확률로 즉시 완성됩니다.',
      },
      {
        id: 'opt_2',
        text: '총 17 Outs / 확률 약 70%',
        isCorrect: false,
        explanation: '중복되는 Q♠와 7♠를 두 번 계산하면 안 됩니다. 플러시 아웃츠에 이미 포함되어 있으므로 15개입니다.',
      },
      {
        id: 'opt_3',
        text: '총 8 Outs / 확률 약 16%',
        isCorrect: false,
        explanation: '스트레이트 드로우만 계산한 수치입니다. 스페이드 플러시 드로우 9개가 추가되어야 합니다.',
      },
    ],
    deepExplanation: '콤보 드로우는 포커에서 가장 강력한 세미블러프 핸드입니다. 15개의 아웃츠는 상대가 오버페어(AA, KK)를 들고 있어도 플랍 시점에서 당신의 승률이 54% 이상으로 앞서는 압도적인 상황입니다.',
  },
  {
    id: 'drill_4',
    category: 'bluff_catching',
    title: '리버 블러프 캐처 (Bluff Catcher) 판단',
    scenario: '보드가 [K♦ J♠ 4♣ 2♥ 7♦]로 깔렸습니다. 당신은 [K♠ T♥] (탑페어 위크키커)입니다. 상대는 매우 공격적인 LAG 플레이어로, 플랍/턴/리버 3배럴을 팟의 75%로 베팅했습니다. 미스된 스트레이트 드로우(Q-T, T-9, Q-9)가 많은 보드입니다. 올바른 결정은?',
    holeCards: [
      { rank: 'K', suit: 'spades', id: 'K_spades' },
      { rank: 'T', suit: 'hearts', id: 'T_hearts' },
    ],
    communityCards: [
      { rank: 'K', suit: 'diamonds', id: 'K_diamonds' },
      { rank: 'J', suit: 'spades', id: 'J_spades' },
      { rank: '4', suit: 'clubs', id: '4_clubs' },
      { rank: '2', suit: 'hearts', id: '2_hearts' },
      { rank: '7', suit: 'diamonds', id: '7_diamonds' },
    ],
    potSize: 220,
    toCall: 90,
    position: 'BB',
    options: [
      {
        id: 'opt_1',
        text: '콜 (Call) — 보드에 미스된 거트샷/스트레이트 드로우가 다수 존재하고 상대 성향상 블러프 빈도가 충분합니다.',
        isCorrect: true,
        explanation: '리버의 7♦는 어떠한 드로우도 완성시키지 못한 완벽한 블랭크(Blank)입니다. 공격적인 상대의 레인지에는 Q-T, T-9, Q-9 등의 실패한 드로우 블러프가 많아 탑페어는 훌륭한 블러프 캐처입니다.',
      },
      {
        id: 'opt_2',
        text: '폴드 (Fold) — 키커가 10이라 AK, KQ에 항상 지므로 무조건 폴드합니다.',
        isCorrect: false,
        explanation: '상대의 밸류 핸드(AK, KQ, 셋)에만 지는 것은 맞지만, 상대가 블러프할 수 있는 콤보 수가 요구되는 브레이크이븐 승률(약 29%)을 상회합니다.',
      },
      {
        id: 'opt_3',
        text: '올인 레이즈 (All-In) — 상대를 역으로 블러프하기 위해 올인합니다.',
        isCorrect: false,
        explanation: '블러프 캐처 핸드로 레이즈하는 것은 상대의 더 안 좋은 핸드는 폴드시켜 밸류를 못 얻고, 더 좋은 핸드에만 콜당하는 최악의 수입니다.',
      },
    ],
    deepExplanation: '블러프 캐처의 핵심: 상대가 베팅할 때 이길 수 있는 것은 상대의 "블러프"뿐입니다. 보드에 완성되지 못한 드로우가 많고, 상대의 블러프 빈도가 팟 오즈 요구 승률(90/(220+90)=29%)보다 높다면 콜이 정답입니다.',
  },
];
