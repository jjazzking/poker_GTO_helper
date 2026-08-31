// Client-Side Resilient GTO Engine & Knowledge Base for Static Hosting (GitHub Pages) & Offline Mode

export interface CoachAdvicePayload {
  action: 'FOLD' | 'CHECK' | 'CALL' | 'BET' | 'RAISE' | 'ALL_IN';
  suggestedAmount: number;
  confidence: number;
  summary: string;
  reasoning: string[];
  gtoConcept: string;
  bluffPercent: number;
  valuePercent: number;
}

export function generateClientGTOAdvice(params: {
  heroCards: Array<{ suit: string; rank: string; value: number }>;
  communityCards: Array<{ suit: string; rank: string; value: number }>;
  street: string;
  potSize: number;
  currentBet: number;
  toCall: number;
  position: string;
  heroChips: number;
  activeOpponents: number;
  calculatedEquity: number;
  potOdds: number;
}): CoachAdvicePayload {
  const {
    communityCards = [],
    street = 'preflop',
    potSize = 0,
    currentBet = 0,
    toCall = 0,
    position = 'BTN',
    calculatedEquity = 50,
    potOdds = 0,
  } = params;

  const isChecked = toCall === 0;
  const isPreflop = street === 'preflop';
  const boardCount = communityCards.length;

  let action: CoachAdvicePayload['action'] = isChecked ? 'CHECK' : 'FOLD';
  let suggestedAmount = 0;
  let confidence = 85;
  let summary = '';
  const reasoning: string[] = [];
  let gtoConcept = '';
  let bluffPercent = 15;
  let valuePercent = 85;

  // 1. High Equity (Monster / Dominant Made Hand)
  if (calculatedEquity >= 68) {
    confidence = 92;
    valuePercent = 90;
    bluffPercent = 10;

    if (isChecked) {
      action = 'BET';
      const isDryBoard = boardCount >= 3 && new Set(communityCards.map(c => c.suit)).size >= 3;
      suggestedAmount = Math.max(20, Math.round(potSize * (isDryBoard ? 0.33 : 0.67)));
      summary = '압도적인 에쿼티 우위를 가진 밸류 핸드입니다. 팟을 적극적으로 키우세요.';
      reasoning.push(`에쿼티가 ${calculatedEquity}%로 상대 레인지를 크게 앞서고 있습니다.`);
      reasoning.push('상대의 미들 페어 및 드로우 핸드로부터 최대 밸류를 추출하기 위한 벳입니다.');
      gtoConcept = 'GTO 밸류 베팅 원칙: 강한 핸드로 팟을 선제적으로 키워 EV를 극대화';
    } else {
      if (calculatedEquity >= 80) {
        action = 'RAISE';
        suggestedAmount = Math.round(currentBet * 2.5);
        summary = '최상위 몬스터 핸드입니다. 리레이즈로 주도권을 잡고 상대의 칩을 압박하세요.';
        reasoning.push(`승률 ${calculatedEquity}%로 넛(Nut)에 가까운 강한 핸드입니다.`);
        reasoning.push('상대의 베팅에 밸류 레이즈로 응수하여 팟을 극대화합니다.');
        gtoConcept = 'Polarized Range Value Raise: 상대의 콜 레인지를 타겟팅한 리레이즈';
      } else {
        action = toCall > potSize * 0.8 ? 'CALL' : 'RAISE';
        suggestedAmount = action === 'RAISE' ? Math.round(currentBet * 2.2) : 0;
        summary = '우수한 승률을 보유하고 있어 적극적인 레이즈 또는 팟 컨트롤 콜이 유효합니다.';
        reasoning.push(`에쿼티 ${calculatedEquity}%로 승산이 매우 높습니다.`);
        reasoning.push(`팟 오즈 요구치(${potOdds}%)를 크게 상회하는 절대적 +EV 상황입니다.`);
        gtoConcept = 'Linear Value Line: 높은 승률 기반의 적극적 액션 전개';
      }
    }
  }
  // 2. Strong / Medium-High Equity (Good Made Hand or Strong Draw)
  else if (calculatedEquity >= 50) {
    confidence = 82;
    valuePercent = 75;
    bluffPercent = 25;

    if (isChecked) {
      if (position === 'BTN' || position === 'CO') {
        action = 'BET';
        suggestedAmount = Math.max(20, Math.round(potSize * 0.4));
        summary = '포지션 이점과 양호한 에쿼티를 활용한 주도권 C-Bet(컨티뉴에이션 벳)을 권장합니다.';
        reasoning.push(`에쿼티 ${calculatedEquity}% 및 포지션(${position}) 이점을 동시에 확보했습니다.`);
        reasoning.push('상대방에게 폴드 에쿼티를 강요하고 팟을 리드합니다.');
        gtoConcept = 'Position & Initiative Advantage: 후포지션 주도권을 활용한 지분 실현';
      } else {
        action = 'CHECK';
        summary = '중간 강도의 핸드로 체크를 통해 안전하게 팟 크기를 컨트롤(Pot Control)합니다.';
        reasoning.push(`현재 에쿼티 ${calculatedEquity}%로 쇼다운 밸류가 있어 무리한 베팅보다는 팟 관리가 적합합니다.`);
        reasoning.push('상대의 체크-레이즈 위험을 방지하고 다음 카드를 확인합니다.');
        gtoConcept = 'Pot Control & Showdown Value: 중위권 핸드의 분산 최소화 전략';
      }
    } else {
      if (calculatedEquity >= potOdds) {
        action = 'CALL';
        summary = `팟 오즈 요구치(${potOdds}%)보다 에쿼티(${calculatedEquity}%)가 높아 수학적으로 확실한 +EV 콜입니다.`;
        reasoning.push(`요구 승률 ${potOdds}% 대비 실제 승률 ${calculatedEquity}%로 롱런 시 확실한 수익 발생.`);
        reasoning.push('상대의 블러프 레인지를 캐치하거나 쇼다운에서 승리를 노립니다.');
        gtoConcept = 'Pot Odds & MDF (Minimum Defense Frequency) 준수';
      } else {
        action = 'FOLD';
        summary = `에쿼티(${calculatedEquity}%)가 팟 오즈 요구치(${potOdds}%)에 미치지 못하므로 수학적 폴드가 정석입니다.`;
        reasoning.push(`요구 승률: ${potOdds}%, 현재 승률: ${calculatedEquity}% (기대값 -EV)`);
        reasoning.push('불리한 가격에 무리하게 따라가지 않는 것이 장기 수익의 핵심입니다.');
        gtoConcept = 'Discipline & Fold Discipline: 역배당 상황에서의 수학적 손절';
      }
    }
  }
  // 3. Speculative / Draw / Bluffing Equity (30% ~ 49%)
  else if (calculatedEquity >= 30) {
    confidence = 78;
    valuePercent = 40;
    bluffPercent = 60;

    if (isChecked) {
      if (position === 'BTN' && boardCount >= 3) {
        action = 'BET';
        suggestedAmount = Math.max(20, Math.round(potSize * 0.33));
        summary = '포지션 이점과 백도어/드로우 에쿼티를 활용한 1/3 팟 세미 블러프(Semi-Bluff)입니다.';
        reasoning.push('적은 칩으로 상대방의 위크 핸드를 폴드시킬 수 있는 기회입니다.');
        reasoning.push('턴/리버에서 발전할 경우 큰 팟을 독식할 잠재력(Implied Odds)이 있습니다.');
        gtoConcept = 'Semi-Bluffing & Fold Equity: 발전 가능성이 있는 핸드로 공격권 행사';
      } else {
        action = 'CHECK';
        summary = '공짜 카드(Free Card)를 확인하며 안전하게 드로우를 노립니다.';
        reasoning.push('칩 소모 없이 다음 스트리트의 완성 여부를 확인하는 것이 최선입니다.');
        gtoConcept = 'Realizing Equity for Free: 드로우 핸드의 무료 에쿼티 실현';
      }
    } else {
      if (calculatedEquity >= potOdds) {
        action = 'CALL';
        summary = `오즈가 충족되어 드로우 콜이 정당화됩니다 (승률 ${calculatedEquity}% >= 팟 오즈 ${potOdds}%).`;
        reasoning.push('추가 팟 잠재 수익(Implied Odds)을 감안할 때 콜이 유리합니다.');
        gtoConcept = 'Implied Odds & Pot Odds Synergy';
      } else {
        action = 'FOLD';
        summary = '드로우 완성 확률에 비해 상대의 베팅 가격이 너무 비쌉니다 (-EV).';
        reasoning.push(`요구 승률(${potOdds}%)에 비해 현재 승률(${calculatedEquity}%)이 부족합니다.`);
        gtoConcept = 'Chasing Draw Penalty: 배당이 나오지 않는 드로우 추격 방지';
      }
    }
  }
  // 4. Low Equity / Weak Hands (< 30%)
  else {
    confidence = 88;
    valuePercent = 10;
    bluffPercent = 90;

    if (isChecked) {
      action = 'CHECK';
      summary = '핸드가 약하므로 체크로 넘어가며 추가 손실을 방지합니다.';
      reasoning.push(`현재 에쿼티(${calculatedEquity}%)가 낮아 칩을 투자하기 부적합합니다.`);
      reasoning.push('체크로 쇼다운에 도달하거나 상대 액션을 탐색하세요.');
      gtoConcept = 'Check Range Protection & Risk Aversion';
    } else {
      action = 'FOLD';
      summary = '약한 핸드로 상대의 베팅에 무리하게 대응하지 않고 폴드합니다.';
      reasoning.push(`에쿼티(${calculatedEquity}%)가 팟 오즈(${potOdds}%)에 크게 미달합니다.`);
      reasoning.push('손실을 최소화하고 다음 좋은 스팟을 기다리는 것이 프로의 정석입니다.');
      gtoConcept = 'Disciplined Folding: 뱅크롤 보존을 위한 필수 덕목';
    }
  }

  // Preflop override
  if (isPreflop && isChecked && (position === 'BTN' || position === 'CO') && calculatedEquity >= 45) {
    action = 'RAISE';
    suggestedAmount = 50;
    summary = `${position} 포지션에서 오픈 레이즈(RFI)로 블라인드를 스틸하거나 팟을 주도하세요.`;
    reasoning.push('프리플랍에서 림프(Limp) 대신 오픈 레이즈로 이니셔티브를 잡는 것이 정석입니다.');
    gtoConcept = 'Raise First In (RFI) Standard Range';
  }

  return {
    action,
    suggestedAmount,
    confidence,
    summary,
    reasoning,
    gtoConcept,
    bluffPercent,
    valuePercent,
  };
}

export function generateClientHandReview(handHistory: any) {
  const net = handHistory?.netChips || 0;
  const isWon = net > 0;
  const grade = isWon ? (net > 200 ? 'A+' : 'A') : (net === 0 ? 'B' : (net > -100 ? 'B-' : 'C'));
  const heroPos = handHistory?.heroPosition || 'BTN';

  const strengths = [
    `${heroPos} 포지션의 특성을 감안하여 침착하게 의사결정을 수행했습니다.`,
    isWon ? '승률 우위를 점한 시점에 적절히 밸류를 추출하여 팟을 획득했습니다.' : '무리한 올인 승부를 피하고 칩 손실을 제한적으로 방어했습니다.',
  ];

  const leaks = [
    '스트리트별 벳 사이징(33% vs 66%)을 보드 텍스처(드라이/웻)에 맞춰 더 정교하게 조율할 수 있습니다.',
  ];

  const gtoAdvice = isWon
    ? '훌륭한 플레이였습니다. 지속적으로 프리플랍 레인지 표와 팟 오즈 수학을 점검하면 안정적인 장기 Win-rate를 유지할 수 있습니다.'
    : '포커는 단기 결과보다 각 결정의 기대값(+EV)이 중요합니다. 팟 오즈가 맞지 않는 무리한 콜을 줄이면 릭(Leak)을 크게 줄일 수 있습니다.';

  return {
    grade,
    summary: isWon
      ? `성공적인 핸드 운용으로 +$${net}의 수익을 달성했습니다.`
      : `결과적으로 손실이 발생했으나, 포지션과 기본 원칙을 점검하며 복기하세요.`,
    strengths,
    leaks,
    gtoAdvice,
  };
}

export function generateClientChatReply(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes('c-bet') || lower.includes('씨벳') || lower.includes('컨티뉴')) {
    return `### 🎯 C-Bet (컨티뉴에이션 벳) 핵심 가이드
1. **사이즈 결정 원리**:
   - **드라이 보드(Dry Board, 예: K♠ 7♦ 2♣)**: 25%~33% 작은 팟 벳. (상대가 맞출 확률이 낮아 적은 칩으로도 높은 폴드 에쿼티 확보)
   - **웻 보드(Wet Board, 예: J♠ T♠ 9♦)**: 66%~75% 큰 팟 벳. (많은 드로우가 존재하므로 드로우 핸드에 불리한 오즈를 강요)
2. **빈도(Frequency)**:
   - 인 포지션(IP)에서는 약 60~70% 빈도로 C-Bet을 구사하며, 완벽한 미스 핸드 중 백도어 에쿼티가 있는 핸드로 세미 블러프를 섞어 밸런스를 맞춥니다.`;
  }

  if (lower.includes('팟 오즈') || lower.includes('pot odds') || lower.includes('4/2') || lower.includes('4의 법칙')) {
    return `### 📐 팟 오즈와 4/2의 법칙 완벽 정리
1. **팟 오즈(Pot Odds)**:
   - 공식: \`콜해야 할 금액 / (현재 팟 + 콜해야 할 금액) × 100\`
   - 예: 팟이 $100이고 콜 금액이 $50이면 \`50 / (100 + 50) = 33.3%\`의 승률이 필요합니다.
2. **4/2의 법칙 (아웃츠 승률 계산법)**:
   - **플랍에서 리버까지 (2장 남음)**: \`아웃츠 × 4 = 대략적인 승률(%)\`
     - 플러시 드로우 (9 Outs) → 9 × 4 = **약 36%**
     - 양판 스트레이트 드로우 (8 Outs) → 8 × 4 = **약 32%**
   - **턴에서 리버까지 (1장 남음)**: \`아웃츠 × 2 = 대략적인 승률(%)\`
     - 플러시 드로우 (9 Outs) → 9 × 2 = **약 18%**
3. **결정 기준**: \`내 승률(에쿼티) > 팟 오즈 요구치\` 일 때만 수학적 콜(+EV)을 합니다.`;
  }

  if (lower.includes('spr') || lower.includes('스택')) {
    return `### 📊 SPR (Stack-to-Pot Ratio) 활용법
- **공식**: \`유효 스택 / 플랍 시작 팟 크기\`
- **SPR 분류별 전략**:
  - **Low SPR (1 ~ 3)**: 탑페어나 오버페어로 팟에 완전히 커밋(Commit)하여 올인 승부가 정당화됩니다.
  - **Medium SPR (4 ~ 7)**: 원페어 핸드로 신중한 팟 컨트롤이 필요하며, 투페어 이상 강한 핸드로 밸류를 추구합니다.
  - **High SPR (8+)**: 셋(Set), 넛 플러시, 넛 스트레이트 등 깊은 스택을 노릴 수 있는 스펙큘레이티브 핸드의 잠재 수익(Implied Odds)이 극대화됩니다.`;
  }

  if (lower.includes('3-bet') || lower.includes('3벳') || lower.includes('쓰리벳')) {
    return `### ⚔️ 프리플랍 3-Bet 레인지 구성 원리
1. **Linear Range (리니어/밸류 중심)**:
   - 주로 얼리/미들 포지션 상대 또는 콜러가 많은 환경에서 사용.
   - 구성: AA, KK, QQ, JJ, AKs, AKo, AQs 등 확실하게 앞서는 프리미엄 핸드로 구성.
2. **Polarized Range (폴라라이즈드/극단화)**:
   - 레이트 포지션(CO vs BTN, BTN vs Blinds)에서 사용.
   - 구성: **최상위 밸류 핸드(AA, KK, AK)** + **블러프/세미블러프 핸드(A2s~A5s, KJs, 87s, T9s)**.
   - 효과: 상대의 어중간한 오픈 핸드를 폴드시켜 블라인드와 팟을 즉시 획득.`;
  }

  if (lower.includes('lag') || lower.includes('어그로') || lower.includes('샤크')) {
    return `### 🦈 어그레시브한 상대(LAG) 익스플로잇 공략법
1. **블러프 캐칭 레인지 확대**: 상대가 블러프 빈도가 높으므로, 미들 페어나 탑페어 약한 키커로도 폴드하지 않고 첵-콜 라인을 유지합니다.
2. **트랩(Trap) 놓기**: 몬스터 핸드(셋, 투페어)를 가졌을 때 먼저 베팅하지 않고 체크하여 상대의 블러프 베팅을 유도한 뒤 리레이즈합니다.
3. **무리한 3-Bet 자제**: 무리하게 맞받아치기보다는 단단한 레인지로 팟을 지켜내며 결정적 스팟에서 스택을 빼앗아옵니다.`;
  }

  return `### 🎓 포커 마스터의 실전 조언
포커의 3대 핵심 원칙은 **포지션(Position)**, **팟 오즈(Pot Odds)**, **레인지 밸런스(Range Balance)**입니다.

1. **포지션의 힘**: 버튼(BTN)과 컷오프(CO)에서는 넓은 레인지로 공격적으로 플레이하고, 얼리 포지션(UTG)에서는 타이트하게 엄선된 핸드만 오픈하세요.
2. **팟 오즈 수학**: 내 승률이 팟이 요구하는 승률보다 높을 때만 콜하는 훈련을 반복하세요.
3. **추천 실전 연습**: 상단 메뉴의 **"프리플랍 차트"**와 **"포커 드릴 퀴즈"**를 병행하시면 실전 승률이 크게 향상됩니다!`;
}
