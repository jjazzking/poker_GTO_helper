import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Player,
  Card,
  Pot,
  BettingRound,
  EvaluatedHand,
  LiveEquityData,
  CoachAdvice,
  HandHistoryItem,
  SessionStats,
  AppViewMode,
  ActionType,
  Position,
  AIPersonality,
} from './types/poker';
import {
  createDeck,
  shuffleDeck,
  evaluateHand,
  calculateLiveEquity,
  calculatePots,
  calculateBotAction,
} from './lib/pokerEngine';
import { pokerAudio } from './lib/audioSynth';
import { generateClientGTOAdvice } from './lib/gtoSolver';
import type { SerializableRange } from './lib/gtoSolver';
import { assignPreflopRange, liveCombosFor } from './lib/rangeModel';
import type { AssignedRange } from './lib/rangeModel';
import { Navbar } from './components/Navbar';
import { PokerTable } from './components/PokerTable';
import { BettingControls } from './components/BettingControls';
import { AICoachPanel } from './components/AICoachPanel';
import { PreflopChartViewer } from './components/PreflopChartViewer';
import { DrillMode } from './components/DrillMode';
import { HandHistoryReviewModal } from './components/HandHistoryReviewModal';
import { SessionStatsModal } from './components/SessionStatsModal';
import { CoachChatModal } from './components/CoachChatModal';

const BOT_PERSONALITIES: AIPersonality[] = [
  {
    id: 'gto_pro',
    name: 'GTO 프로 (Solver)',
    title: '수학적 밸런스형',
    avatar: 'bot1',
    vpip: 22,
    pfr: 19,
    aggression: 3,
    description: '솔버 기반의 수학적 균형 플레이를 구사합니다.',
    color: 'bg-blue-600 border-blue-400',
  },
  {
    id: 'aggro_shark',
    name: '어그로 샤크 (Shark)',
    title: '공격적 LAG',
    avatar: 'bot2',
    vpip: 32,
    pfr: 28,
    aggression: 5,
    description: '넓은 레인지로 3-Bet 및 강력한 압박 베팅을 가합니다.',
    color: 'bg-rose-600 border-rose-400',
  },
  {
    id: 'rock_nit',
    name: '타이트 락 (Rock)',
    title: '보수형 Nit',
    avatar: 'bot3',
    vpip: 14,
    pfr: 12,
    aggression: 2,
    description: '프리미엄 핸드만 플레이하며 저항에 쉽게 폴드합니다.',
    color: 'bg-slate-700 border-slate-500',
  },
  {
    id: 'calling_station',
    name: '피쉬 콜러 (Fish)',
    title: '루즈 패시브',
    avatar: 'bot4',
    vpip: 45,
    pfr: 8,
    aggression: 1,
    description: '드로우와 미들페어로 끝까지 콜하며 잘 폴드하지 않습니다.',
    color: 'bg-emerald-600 border-emerald-400',
  },
  {
    id: 'tricky_trap',
    name: '트릭키 폭스 (Fox)',
    title: '변칙 트랩형',
    avatar: 'bot5',
    vpip: 26,
    pfr: 20,
    aggression: 4,
    description: '몬스터 핸드를 슬로우플레이하고 깜짝 체크레이즈를 시도합니다.',
    color: 'bg-amber-600 border-amber-400',
  },
];

const INITIAL_CHIPS = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;
// Monte Carlo trials for the live equity HUD. At 2000+ the estimate is stable
// to about +/-2%p, which keeps the recommendation from flipping between renders;
// measured at roughly 40ms, so it still runs synchronously without jank.
const EQUITY_TRIALS = 2500;

export default function App() {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<AppViewMode>('table');
  const [isHeadsUpMode, setIsHeadsUpMode] = useState<boolean>(false);

  // Settings & Toggles
  const [useFourColor, setUseFourColor] = useState<boolean>(true);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [showAiCards, setShowAiCards] = useState<boolean>(false);
  const [gameSpeed, setGameSpeed] = useState<number>(1);

  // Modals
  const [isHandReviewOpen, setIsHandReviewOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [isCoachChatOpen, setIsCoachChatOpen] = useState<boolean>(false);

  // Poker Game Engine States
  const [players, setPlayers] = useState<Player[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [pots, setPots] = useState<Pot[]>([{ amount: 0, eligiblePlayerIds: [] }]);
  const lastEquityKeyRef = useRef<string>('');
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);
  const [dealerSeatIndex, setDealerSeatIndex] = useState<number>(0);
  const [bettingRound, setBettingRound] = useState<BettingRound>('ended');
  const [currentHighestBet, setCurrentHighestBet] = useState<number>(0);
  const [minRaiseIncrement, setMinRaiseIncrement] = useState<number>(BIG_BLIND);
  const [isHandActive, setIsHandActive] = useState<boolean>(false);
  const [winners, setWinners] = useState<{ playerId: string; name: string; amount: number; handDescription?: string }[]>([]);
  const [handNumber, setHandNumber] = useState<number>(1);
  const [handHistory, setHandHistory] = useState<HandHistoryItem[]>([]);
  const [currentHandActions, setCurrentHandActions] = useState<HandHistoryItem['actions']>([]);

  // AI Coach HUD states
  const [equityData, setEquityData] = useState<LiveEquityData>({
    winRate: 0,
    tieRate: 0,
    potOdds: 0,
    requiredEquity: 0,
    isPositiveEV: true,
    outsCount: 0,
    drawTypes: [],
    handStrengthDesc: '대기 중',
  });
  const [coachAdvice, setCoachAdvice] = useState<CoachAdvice | null>(null);
  const [isLoadingCoach, setIsLoadingCoach] = useState<boolean>(false);

  // Session Statistics
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    handsPlayed: 0,
    handsWon: 0,
    vpipHands: 0,
    pfrHands: 0,
    threeBetHands: 0,
    threeBetOpportunities: 0,
    showdownsReached: 0,
    showdownsWon: 0,
    startingChips: INITIAL_CHIPS,
    currentChips: INITIAL_CHIPS,
    biggestPotWon: 0,
    allInCount: 0,
  });

  // Track players who have acted in the current betting round
  const actedPlayerIdsRef = useRef<Set<string>>(new Set());
  const aiTurnTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedStateRef = useRef<string>('');
  const isFetchingCoachRef = useRef<boolean>(false);

  // Initialize Players (6-Max or Heads-Up)
  const initPlayers = useCallback((headsUp = false) => {
    const hero: Player = {
      id: 'hero',
      name: '나 (Hero)',
      isHuman: true,
      avatar: 'hero',
      chips: INITIAL_CHIPS,
      currentBet: 0,
      totalInvestedThisHand: 0,
      cards: [],
      folded: false,
      isAllIn: false,
      sittingOut: false,
      position: 'BTN',
      seatIndex: 0,
    };

    if (headsUp) {
      const opp: Player = {
        id: 'bot_1',
        name: BOT_PERSONALITIES[0].name,
        isHuman: false,
        avatar: BOT_PERSONALITIES[0].avatar,
        chips: INITIAL_CHIPS,
        currentBet: 0,
        totalInvestedThisHand: 0,
        cards: [],
        folded: false,
        isAllIn: false,
        sittingOut: false,
        position: 'BB',
        seatIndex: 1,
        personality: BOT_PERSONALITIES[0],
      };
      return [hero, opp];
    }

    const aiBots: Player[] = BOT_PERSONALITIES.map((personality, index) => ({
      id: `bot_${index + 1}`,
      name: personality.name,
      isHuman: false,
      avatar: personality.avatar,
      chips: INITIAL_CHIPS,
      currentBet: 0,
      totalInvestedThisHand: 0,
      cards: [],
      folded: false,
      isAllIn: false,
      sittingOut: false,
      position: 'UTG',
      seatIndex: index + 1,
      personality,
    }));

    return [hero, ...aiBots];
  }, []);

  // Initial mount setup
  useEffect(() => {
    setPlayers(initPlayers(isHeadsUpMode));
  }, [initPlayers, isHeadsUpMode]);

  // Sound toggle helper
  const handleToggleSound = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    pokerAudio.setMuted(next);
  };

  // Switch View Mode (handle heads-up switch and coach chat)
  const handleSelectView = (view: AppViewMode) => {
    if (view === 'coach_chat') {
      setViewMode(isHeadsUpMode ? 'headsup' : 'table');
      setIsCoachChatOpen(true);
      return;
    }
    setViewMode(view);
    if (view === 'headsup' && !isHeadsUpMode) {
      setIsHeadsUpMode(true);
      setPlayers(initPlayers(true));
      setIsHandActive(false);
      setBettingRound('ended');
    } else if (view === 'table' && isHeadsUpMode) {
      setIsHeadsUpMode(false);
      setPlayers(initPlayers(false));
      setIsHandActive(false);
      setBettingRound('ended');
    }
  };

  // Rebuy chips
  const handleRebuyChips = () => {
    setPlayers(prev =>
      prev.map(p => ({
        ...p,
        chips: Math.max(p.chips, INITIAL_CHIPS),
      }))
    );
    pokerAudio.playChipBet();
  };

  // What each opponent still in the hand can be holding, from their seat, their
  // playing style and what they have done this hand. This is what turns "can my
  // hand beat five random hands" into "can it beat what these players would
  // still be holding here".
  const buildOpponentRanges = useCallback(
    (
      livePlayers: Player[],
      hero: Player,
      board: Card[],
      calledBetToPot: number
    ): { ranges: AssignedRange[]; combos: Array<Array<{ a: Card; b: Card }>> } => {
      const dead = new Set<string>([...hero.cards, ...board].map(c => c.id));
      const ranges: AssignedRange[] = [];
      const combos: Array<Array<{ a: Card; b: Card }>> = [];

      for (const p of livePlayers) {
        const range = assignPreflopRange(
          {
            id: p.id,
            name: p.name,
            position: p.position,
            vpip: p.personality?.vpip ?? 25,
            pfr: p.personality?.pfr ?? 18,
          },
          currentHandActions
        );
        // Only a player who has actually put chips in on this street has shown
        // anything worth narrowing their range with. Someone yet to act still
        // holds their whole preflop range.
        const committedThisStreet = currentHandActions.some(
          a =>
            a.playerId === p.id &&
            a.street === bettingRound &&
            (a.action === 'call' || a.action === 'bet' || a.action === 'raise' || a.action === 'all-in')
        );
        const live = liveCombosFor(range, dead, board, committedThisStreet ? calledBetToPot : 0);
        if (live.length === 0) continue;
        ranges.push(range);
        combos.push(live);
      }

      return { ranges, combos };
    },
    [currentHandActions, bettingRound]
  );

  // Fetch AI Coach Advice from server
  const fetchCoachAdvice = useCallback(async (force = false) => {
    const hero = players.find(p => p.isHuman);
    if (!hero || hero.folded || hero.cards.length !== 2) return;

    const toCall = Math.max(0, currentHighestBet - hero.currentBet);
    const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);
    const activeOpponents = players.filter(p => !p.folded && !p.isHuman).length;
    const cardStr = hero.cards.map(c => `${c.rank}${c.suit}`).sort().join('');
    const boardStr = communityCards.map(c => `${c.rank}${c.suit}`).sort().join('');
    const stateKey = `${handNumber}_${bettingRound}_${cardStr}_${boardStr}_${toCall}_${hero.position}`;

    if (!force && (lastFetchedStateRef.current === stateKey || isFetchingCoachRef.current)) {
      return;
    }

    const callersInPot = players.filter(
      p => !p.isHuman && !p.folded && p.lastAction?.type === 'call' && p.lastAction.street === bettingRound
    ).length;
    const minRaiseTo = currentHighestBet > 0 ? currentHighestBet + minRaiseIncrement : BIG_BLIND;

    const { ranges } = buildOpponentRanges(
      players.filter(p => !p.folded && !p.isHuman),
      hero,
      communityCards,
      totalPot > 0 ? currentHighestBet / totalPot : 0
    );
    const serializedRanges: SerializableRange[] = ranges.map(r => ({
      playerId: r.playerId,
      name: r.name,
      combos: Array.from(r.combos),
      percent: r.percent,
      reason: r.reason,
    }));

    lastFetchedStateRef.current = stateKey;
    isFetchingCoachRef.current = true;
    setIsLoadingCoach(true);

    try {
      const response = await fetch('/api/poker/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heroCards: hero.cards,
          communityCards,
          street: bettingRound,
          potSize: totalPot,
          currentBet: currentHighestBet,
          toCall,
          position: hero.position,
          heroChips: hero.chips,
          activeOpponents,
          calculatedEquity: equityData.winRate,
          potOdds: equityData.potOdds,
          bigBlind: BIG_BLIND,
          callersInPot,
          minRaiseTo,
          opponentRanges: serializedRanges,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCoachAdvice(data);
      } else {
        const fallback = generateClientGTOAdvice({
          heroCards: hero.cards,
          communityCards,
          street: bettingRound,
          potSize: totalPot,
          currentBet: currentHighestBet,
          toCall,
          position: hero.position,
          heroChips: hero.chips,
          activeOpponents,
          calculatedEquity: equityData.winRate,
          potOdds: equityData.potOdds,
          bigBlind: BIG_BLIND,
          callersInPot,
          minRaiseTo,
          opponentRanges: serializedRanges,
        });
        setCoachAdvice(fallback);
      }
    } catch {
      const fallback = generateClientGTOAdvice({
        heroCards: hero.cards,
        communityCards,
        street: bettingRound,
        potSize: totalPot,
        currentBet: currentHighestBet,
        toCall,
        position: hero.position,
        heroChips: hero.chips,
        activeOpponents,
        calculatedEquity: equityData.winRate,
        potOdds: equityData.potOdds,
        bigBlind: BIG_BLIND,
        callersInPot,
        minRaiseTo,
        opponentRanges: serializedRanges,
      });
      setCoachAdvice(fallback);
    } finally {
      isFetchingCoachRef.current = false;
      setIsLoadingCoach(false);
    }
  }, [players, communityCards, bettingRound, currentHighestBet, minRaiseIncrement, pots, equityData, handNumber, buildOpponentRanges]);

  // Recalculate live equity whenever cards, board, or highest bet changes
  useEffect(() => {
    const hero = players.find(p => p.isHuman);
    if (hero && hero.cards.length === 2 && !hero.folded) {
      const activeCount = players.filter(p => !p.folded && !p.isHuman).length;
      const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);
      const toCall = Math.max(0, currentHighestBet - hero.currentBet);

      // This effect depends on `players`, which changes on every action, chip
      // animation and bot update. Equity is a Monte Carlo estimate, so
      // recomputing it when none of its inputs moved would make the displayed
      // win rate (and the recommendation built from it) jitter for no reason.
      // Only recompute when something that actually changes the math changes.
      const equityKey = [
        hero.cards.map(c => c.id).sort().join(','),
        communityCards.map(c => c.id).join(','),
        activeCount,
        totalPot,
        toCall,
        bettingRound,
        hero.position,
        handNumber,
      ].join('|');

      if (equityKey === lastEquityKeyRef.current) return;
      lastEquityKeyRef.current = equityKey;

      // Range-weighted equity. The bet already faced on this street also tells
      // us how much of each opponent's range is still live.
      const liveOpponents = players.filter(p => !p.folded && !p.isHuman);
      const calledBetToPot = totalPot > 0 ? currentHighestBet / totalPot : 0;
      const { ranges, combos } = buildOpponentRanges(liveOpponents, hero, communityCards, calledBetToPot);
      const serializedRanges: SerializableRange[] = ranges.map(r => ({
        playerId: r.playerId,
        name: r.name,
        combos: Array.from(r.combos),
        percent: r.percent,
        reason: r.reason,
      }));

      // Fast synchronous real-time equity & outs calculation
      const eq = calculateLiveEquity(
        hero.cards,
        communityCards,
        activeCount,
        totalPot,
        toCall,
        EQUITY_TRIALS,
        combos.length >= activeCount ? combos : undefined
      );
      setEquityData(eq);

      // Sizing inputs: a raise is only meaningful in big blinds, and it has to
      // land inside the legal range the betting controls enforce.
      const callersInPot = players.filter(
        p => !p.isHuman && !p.folded && p.lastAction?.type === 'call' && p.lastAction.street === bettingRound
      ).length;
      const minRaiseTo = currentHighestBet > 0 ? currentHighestBet + minRaiseIncrement : BIG_BLIND;

      // Immediate local GTO advice fallback so HUD updates instantly
      const instantGTO = generateClientGTOAdvice({
        heroCards: hero.cards,
        communityCards,
        street: bettingRound,
        potSize: totalPot,
        currentBet: currentHighestBet,
        toCall,
        position: hero.position,
        heroChips: hero.chips,
        activeOpponents: activeCount,
        calculatedEquity: eq.winRate,
        potOdds: eq.potOdds,
        bigBlind: BIG_BLIND,
        callersInPot,
        minRaiseTo,
        opponentRanges: serializedRanges,
      });
      setCoachAdvice(prev => (prev ? { ...prev, ...instantGTO, confidence: prev.confidence || instantGTO.confidence } : instantGTO));
    }
  }, [players, communityCards, currentHighestBet, minRaiseIncrement, pots, bettingRound, handNumber, buildOpponentRanges]);

  // Assign Positions according to dealer button
  const assignPositions = (tablePlayers: Player[], dealerIdx: number): Player[] => {
    const n = tablePlayers.length;
    if (n === 2) {
      // Heads-up: Dealer is SB / BTN, other is BB
      return tablePlayers.map((p, idx) => ({
        ...p,
        position: idx === dealerIdx ? 'BTN' : 'BB',
      }));
    }

    const positions6Max: Position[] = ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'];
    return tablePlayers.map((p, idx) => {
      const relativeIdx = (idx - dealerIdx + n) % n;
      return {
        ...p,
        position: positions6Max[relativeIdx % positions6Max.length],
      };
    });
  };

  // Start New Hand
  const startNewHand = () => {
    if (aiTurnTimeoutRef.current) {
      clearTimeout(aiTurnTimeoutRef.current);
    }

    // Advance dealer button
    const nextDealerIdx = (dealerSeatIndex + 1) % players.length;
    setDealerSeatIndex(nextDealerIdx);

    // Filter out busted players and reset
    let freshDeck = shuffleDeck(createDeck());

    let updatedPlayers: Player[] = players.map(p => ({
      ...p,
      chips: p.chips <= 0 ? INITIAL_CHIPS : p.chips,
      currentBet: 0,
      totalInvestedThisHand: 0,
      cards: [],
      folded: false,
      isAllIn: false,
      lastAction: undefined,
      showCards: false,
    }));

    updatedPlayers = assignPositions(updatedPlayers, nextDealerIdx);

    // Deal 2 cards to each player
    updatedPlayers = updatedPlayers.map(p => {
      const card1 = freshDeck.pop()!;
      const card2 = freshDeck.pop()!;
      return {
        ...p,
        cards: [card1, card2],
      };
    });

    setDeck(freshDeck);
    setCommunityCards([]);
    setWinners([]);
    setCurrentHandActions([]);
    setCoachAdvice(null);
    actedPlayerIdsRef.current.clear();

    // Deduct Blinds
    const sbPlayer = updatedPlayers.find(p => p.position === 'SB') || updatedPlayers.find(p => p.position === 'BTN');
    const bbPlayer = updatedPlayers.find(p => p.position === 'BB');

    const sbAmt = Math.min(sbPlayer ? sbPlayer.chips : 0, SMALL_BLIND);
    const bbAmt = Math.min(bbPlayer ? bbPlayer.chips : 0, BIG_BLIND);

    updatedPlayers = updatedPlayers.map(p => {
      if (sbPlayer && p.id === sbPlayer.id) {
        return {
          ...p,
          chips: p.chips - sbAmt,
          currentBet: sbAmt,
          totalInvestedThisHand: sbAmt,
          isAllIn: p.chips - sbAmt === 0,
        };
      }
      if (bbPlayer && p.id === bbPlayer.id) {
        return {
          ...p,
          chips: p.chips - bbAmt,
          currentBet: bbAmt,
          totalInvestedThisHand: bbAmt,
          isAllIn: p.chips - bbAmt === 0,
        };
      }
      return p;
    });

    const initialPots = calculatePots(updatedPlayers);
    setPots(initialPots);
    setCurrentHighestBet(BIG_BLIND);
    setMinRaiseIncrement(BIG_BLIND);
    setBettingRound('preflop');
    setIsHandActive(true);

    // Preflop first turn: UTG in 6-max (or BTN in Heads-up)
    let firstTurnPlayer: Player | undefined;
    if (updatedPlayers.length === 2) {
      firstTurnPlayer = updatedPlayers.find(p => p.position === 'BTN');
    } else {
      firstTurnPlayer = updatedPlayers.find(p => p.position === 'UTG');
    }

    if (!firstTurnPlayer) {
      firstTurnPlayer = updatedPlayers[(nextDealerIdx + 1) % updatedPlayers.length];
    }

    setPlayers(updatedPlayers);
    setCurrentTurnPlayerId(firstTurnPlayer.id);

    pokerAudio.playDealCard();

    // Update session stats for hands played
    setSessionStats(prev => ({
      ...prev,
      handsPlayed: prev.handsPlayed + 1,
    }));
  };

  // Advance Street or resolve showdown
  const advanceStreet = useCallback(
    (currentTablePlayers: Player[], nextRound: BettingRound, remainingDeck: Card[], currentBoard: Card[]) => {
      actedPlayerIdsRef.current.clear();

      // Reset current bets for the new street
      const resetPlayers = currentTablePlayers.map(p => ({
        ...p,
        currentBet: 0,
        lastAction: undefined,
      }));

      const deckCopy = [...remainingDeck];
      const newBoard = [...currentBoard];

      if (nextRound === 'flop') {
        deckCopy.pop(); // burn
        newBoard.push(deckCopy.pop()!, deckCopy.pop()!, deckCopy.pop()!);
        pokerAudio.playDealCard();
      } else if (nextRound === 'turn') {
        deckCopy.pop(); // burn
        newBoard.push(deckCopy.pop()!);
        pokerAudio.playDealCard();
      } else if (nextRound === 'river') {
        deckCopy.pop(); // burn
        newBoard.push(deckCopy.pop()!);
        pokerAudio.playDealCard();
      }

      setDeck(deckCopy);
      setCommunityCards(newBoard);
      setBettingRound(nextRound);
      setCurrentHighestBet(0);
      setMinRaiseIncrement(BIG_BLIND);

      if (nextRound === 'showdown') {
        resolveShowdown(resetPlayers, newBoard);
        return;
      }

      // Check if only 1 active player remains who is not all-in
      const activeUncommitted = resetPlayers.filter(p => !p.folded && !p.isAllIn);
      if (activeUncommitted.length <= 1) {
        // Run out remaining cards to showdown
        let finalBoard = [...newBoard];
        while (finalBoard.length < 5) {
          deckCopy.pop(); // burn
          finalBoard.push(deckCopy.pop()!);
        }
        setCommunityCards(finalBoard);
        setBettingRound('showdown');
        resolveShowdown(resetPlayers, finalBoard);
        return;
      }

      // Find first player after dealer to act
      const n = resetPlayers.length;
      let nextTurnIdx = (dealerSeatIndex + 1) % n;
      while (resetPlayers[nextTurnIdx].folded || resetPlayers[nextTurnIdx].isAllIn) {
        nextTurnIdx = (nextTurnIdx + 1) % n;
      }

      setPlayers(resetPlayers);
      setCurrentTurnPlayerId(resetPlayers[nextTurnIdx].id);
    },
    [dealerSeatIndex]
  );

  // Resolve Showdown & Distribute Pots
  const resolveShowdown = (finalPlayers: Player[], board: Card[]) => {
    setIsHandActive(false);
    setBettingRound('showdown');
    setCurrentTurnPlayerId(null);

    const calculatedPots = calculatePots(finalPlayers);
    const winnersList: { playerId: string; name: string; amount: number; handDescription?: string }[] = [];
    const updatedPlayers = [...finalPlayers];

    // Reveal cards at showdown
    updatedPlayers.forEach(p => {
      if (!p.folded) p.showCards = true;
    });

    for (const pot of calculatedPots) {
      if (pot.amount <= 0 || pot.eligiblePlayerIds.length === 0) continue;

      const eligiblePlayers = updatedPlayers.filter(p => pot.eligiblePlayerIds.includes(p.id) && !p.folded);
      if (eligiblePlayers.length === 0) continue;

      // Evaluate hands
      const evaluated = eligiblePlayers.map(p => ({
        player: p,
        hand: evaluateHand([...p.cards, ...board]),
      }));

      // Sort by score descending
      evaluated.sort((a, b) => b.hand.score - a.hand.score);
      const bestScore = evaluated[0].hand.score;
      const winningPlayers = evaluated.filter(e => e.hand.score === bestScore);

      const splitAmount = Math.floor(pot.amount / winningPlayers.length);

      winningPlayers.forEach(w => {
        const playerIndex = updatedPlayers.findIndex(p => p.id === w.player.id);
        if (playerIndex !== -1) {
          updatedPlayers[playerIndex].chips += splitAmount;
        }
        winnersList.push({
          playerId: w.player.id,
          name: w.player.name,
          amount: splitAmount,
          handDescription: w.hand.description,
        });
      });
    }

    setPlayers(updatedPlayers);
    setWinners(winnersList);

    // Check if hero won
    const heroWinner = winnersList.find(w => w.playerId === 'hero');
    const hero = updatedPlayers.find(p => p.id === 'hero');

    if (heroWinner) {
      pokerAudio.playWinChime();
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
      });
    }

    // Save Hand History
    const heroHand = hero && hero.cards.length === 2 ? evaluateHand([...hero.cards, ...board]) : undefined;
    const newHistoryItem: HandHistoryItem = {
      id: `hand_${Date.now()}`,
      handNumber,
      timestamp: Date.now(),
      smallBlind: SMALL_BLIND,
      bigBlind: BIG_BLIND,
      communityCards: board,
      heroCards: hero ? hero.cards : [],
      heroPosition: hero ? hero.position : 'BTN',
      players: updatedPlayers.map(p => ({
        id: p.id,
        name: p.name,
        isHuman: p.isHuman,
        position: p.position,
        chipsBefore: p.chips,
        chipsAfter: p.chips,
        cards: p.cards,
        handDescription: evaluateHand([...p.cards, ...board]).description,
      })),
      winners: winnersList,
      actions: currentHandActions,
      netChips: hero ? hero.chips - INITIAL_CHIPS : 0,
    };

    setHandHistory(prev => [newHistoryItem, ...prev]);
    setHandNumber(prev => prev + 1);

    // Update session stats
    if (hero) {
      setSessionStats(prev => ({
        ...prev,
        handsWon: heroWinner ? prev.handsWon + 1 : prev.handsWon,
        showdownsReached: prev.showdownsReached + 1,
        showdownsWon: heroWinner ? prev.showdownsWon + 1 : prev.showdownsWon,
        currentChips: hero.chips,
        biggestPotWon: heroWinner
          ? Math.max(prev.biggestPotWon, heroWinner.amount)
          : prev.biggestPotWon,
      }));
    }
  };

  // Resolve Hand if everyone folded except one winner
  const resolveFoldVictory = (currentTablePlayers: Player[]) => {
    setIsHandActive(false);
    setBettingRound('ended');
    setCurrentTurnPlayerId(null);

    const winner = currentTablePlayers.find(p => !p.folded);
    if (!winner) return;

    const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);
    const updated = currentTablePlayers.map(p => {
      if (p.id === winner.id) {
        return {
          ...p,
          chips: p.chips + totalPot,
        };
      }
      return p;
    });

    const winnersList = [{ playerId: winner.id, name: winner.name, amount: totalPot, handDescription: '상대 전원 폴드 승리' }];
    setPlayers(updated);
    setWinners(winnersList);

    if (winner.isHuman) {
      pokerAudio.playWinChime();
    }

    const hero = updated.find(p => p.id === 'hero');
    const heroWon = winner.id === 'hero';

    const newHistoryItem: HandHistoryItem = {
      id: `hand_${Date.now()}`,
      handNumber,
      timestamp: Date.now(),
      smallBlind: SMALL_BLIND,
      bigBlind: BIG_BLIND,
      communityCards,
      heroCards: hero ? hero.cards : [],
      heroPosition: hero ? hero.position : 'BTN',
      players: updated.map(p => ({
        id: p.id,
        name: p.name,
        isHuman: p.isHuman,
        position: p.position,
        chipsBefore: p.chips,
        chipsAfter: p.chips,
        cards: p.cards,
      })),
      winners: winnersList,
      actions: currentHandActions,
      netChips: hero ? hero.chips - INITIAL_CHIPS : 0,
    };

    setHandHistory(prev => [newHistoryItem, ...prev]);
    setHandNumber(prev => prev + 1);

    if (hero) {
      setSessionStats(prev => ({
        ...prev,
        handsWon: heroWon ? prev.handsWon + 1 : prev.handsWon,
        currentChips: hero.chips,
        biggestPotWon: heroWon ? Math.max(prev.biggestPotWon, totalPot) : prev.biggestPotWon,
      }));
    }
  };

  // Player / AI Action Execution Handler
  const handlePlayerAction = useCallback(
    (playerId: string, action: ActionType, amount: number) => {
      setPlayers(currentPlayers => {
        const playerIndex = currentPlayers.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return currentPlayers;

        const player = currentPlayers[playerIndex];
        let updatedPlayers = [...currentPlayers];
        let newHighestBet = currentHighestBet;
        let newMinRaiseInc = minRaiseIncrement;

        // Record action history
        setCurrentHandActions(prev => [
          ...prev,
          {
            street: bettingRound,
            playerId: player.id,
            playerName: player.name,
            action,
            amount,
          },
        ]);

        actedPlayerIdsRef.current.add(playerId);

        // Update Session Stats for Hero
        if (player.isHuman) {
          if (bettingRound === 'preflop') {
            if (action === 'call' || action === 'bet' || action === 'raise' || action === 'all-in') {
              setSessionStats(prev => ({ ...prev, vpipHands: prev.vpipHands + 1 }));
            }
            if (action === 'bet' || action === 'raise' || (action === 'all-in' && amount > currentHighestBet)) {
              setSessionStats(prev => ({ ...prev, pfrHands: prev.pfrHands + 1 }));
            }
          }
          if (action === 'all-in') {
            setSessionStats(prev => ({ ...prev, allInCount: prev.allInCount + 1 }));
          }
        }

        switch (action) {
          case 'fold': {
            pokerAudio.playFold();
            updatedPlayers[playerIndex] = {
              ...player,
              folded: true,
              lastAction: { type: 'fold', amount: 0, street: bettingRound, timestamp: Date.now() },
            };
            break;
          }

          case 'check': {
            pokerAudio.playCheckKnock();
            updatedPlayers[playerIndex] = {
              ...player,
              lastAction: { type: 'check', amount: 0, street: bettingRound, timestamp: Date.now() },
            };
            break;
          }

          case 'call': {
            pokerAudio.playChipBet();
            // A call is always exactly what is owed, capped by the stack, no
            // matter what the caller passed in.
            const owed = Math.max(0, newHighestBet - player.currentBet);
            const callAmount = Math.min(player.chips, owed);
            const isAllIn = callAmount >= player.chips;
            updatedPlayers[playerIndex] = {
              ...player,
              chips: player.chips - callAmount,
              currentBet: player.currentBet + callAmount,
              totalInvestedThisHand: player.totalInvestedThisHand + callAmount,
              isAllIn,
              lastAction: { type: 'call', amount: callAmount, street: bettingRound, timestamp: Date.now() },
            };
            break;
          }

          case 'bet':
          case 'raise': {
            pokerAudio.playChipBet();
            // `amount` is the total to have in front after the action, so the
            // ceiling is the stack plus what is already committed.
            const maxRaiseTo = player.chips + player.currentBet;
            let raiseTo = Math.min(maxRaiseTo, Math.max(0, amount));

            if (raiseTo < newHighestBet) {
              // Below the current bet is not a raise. Left as-is it would end the
              // action unmatched and not all in, and "all bets matched" could
              // never become true again -- the table would rotate forever. The
              // only legal move here is to put in what is left as a call.
              raiseTo = Math.min(maxRaiseTo, newHighestBet);
            } else if (raiseTo > newHighestBet) {
              // A raise has to clear the last one by at least the minimum, unless
              // the player is putting their whole stack in for less.
              const minLegalRaiseTo = newHighestBet + newMinRaiseInc;
              if (raiseTo < minLegalRaiseTo) raiseTo = Math.min(maxRaiseTo, minLegalRaiseTo);
            }

            // Never negative: a smaller total than what is already committed
            // would hand chips back and mint them out of nothing.
            const additionalChips = Math.max(0, raiseTo - player.currentBet);
            const isAllIn = additionalChips >= player.chips;

            const raiseDiff = raiseTo - newHighestBet;
            if (raiseDiff > 0) {
              newMinRaiseInc = Math.max(minRaiseIncrement, raiseDiff);
              newHighestBet = raiseTo;
              // If a raise occurs, players who previously acted must act again
              actedPlayerIdsRef.current.clear();
              actedPlayerIdsRef.current.add(playerId);
            }

            updatedPlayers[playerIndex] = {
              ...player,
              chips: player.chips - additionalChips,
              currentBet: raiseTo,
              totalInvestedThisHand: player.totalInvestedThisHand + additionalChips,
              isAllIn,
              lastAction: { type: action, amount: raiseTo, street: bettingRound, timestamp: Date.now() },
            };
            break;
          }

          case 'all-in': {
            pokerAudio.playAllIn();
            const allInChips = player.chips;
            const totalBet = player.currentBet + allInChips;

            if (totalBet > newHighestBet) {
              newMinRaiseInc = Math.max(minRaiseIncrement, totalBet - newHighestBet);
              newHighestBet = totalBet;
              actedPlayerIdsRef.current.clear();
              actedPlayerIdsRef.current.add(playerId);
            }

            updatedPlayers[playerIndex] = {
              ...player,
              chips: 0,
              currentBet: totalBet,
              totalInvestedThisHand: player.totalInvestedThisHand + allInChips,
              isAllIn: true,
              lastAction: { type: 'all-in', amount: totalBet, street: bettingRound, timestamp: Date.now() },
            };
            break;
          }
        }

        // Recalculate Pots
        const updatedPots = calculatePots(updatedPlayers);
        setPots(updatedPots);
        setCurrentHighestBet(newHighestBet);
        setMinRaiseIncrement(newMinRaiseInc);

        // Check if everyone folded except 1
        const activePlayers = updatedPlayers.filter(p => !p.folded);
        if (activePlayers.length === 1) {
          resolveFoldVictory(updatedPlayers);
          return updatedPlayers;
        }

        // Check if betting round is complete
        const nonAllInActive = updatedPlayers.filter(p => !p.folded && !p.isAllIn);
        const allActed = nonAllInActive.every(p => actedPlayerIdsRef.current.has(p.id));
        const allBetsMatched = nonAllInActive.every(p => p.currentBet === newHighestBet);

        if (allActed && allBetsMatched) {
          // Move to next street
          const streets: BettingRound[] = ['preflop', 'flop', 'turn', 'river', 'showdown'];
          const currentIdx = streets.indexOf(bettingRound);
          const nextStreet = streets[currentIdx + 1] || 'showdown';

          setTimeout(() => {
            advanceStreet(updatedPlayers, nextStreet, deck, communityCards);
          }, 300 / gameSpeed);

          return updatedPlayers;
        }

        // Next player turn. Bounded: the completion checks above are supposed to
        // catch the case where nobody can act, but a bug there must not spin the
        // browser in an unbounded loop.
        const n = updatedPlayers.length;
        let nextIdx = (playerIndex + 1) % n;
        let scanned = 0;
        while (updatedPlayers[nextIdx].folded || updatedPlayers[nextIdx].isAllIn) {
          nextIdx = (nextIdx + 1) % n;
          if (++scanned > n) {
            // Nobody left to act; the street is done.
            const streets: BettingRound[] = ['preflop', 'flop', 'turn', 'river', 'showdown'];
            const next = streets[streets.indexOf(bettingRound) + 1] || 'showdown';
            setTimeout(() => advanceStreet(updatedPlayers, next, deck, communityCards), 300 / gameSpeed);
            return updatedPlayers;
          }
        }

        setCurrentTurnPlayerId(updatedPlayers[nextIdx].id);
        return updatedPlayers;
      });
    },
    [bettingRound, currentHighestBet, minRaiseIncrement, deck, communityCards, gameSpeed, advanceStreet]
  );

  // AI Turn Automator (Plays bot actions automatically)
  useEffect(() => {
    if (!isHandActive || !currentTurnPlayerId) return;

    const currentPlayer = players.find(p => p.id === currentTurnPlayerId);
    if (!currentPlayer || currentPlayer.isHuman || currentPlayer.folded || currentPlayer.isAllIn) {
      return;
    }

    const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);
    const activeCount = players.filter(p => !p.folded).length;

    // AI Bot thinking delay
    const delay = Math.max(150, 700 / gameSpeed);

    aiTurnTimeoutRef.current = setTimeout(() => {
      const decision = calculateBotAction(
        currentPlayer,
        communityCards,
        currentHighestBet,
        totalPot,
        BIG_BLIND,
        activeCount,
        bettingRound === 'preflop'
      );

      handlePlayerAction(currentPlayer.id, decision.action, decision.amount);
    }, delay);

    return () => {
      if (aiTurnTimeoutRef.current) {
        clearTimeout(aiTurnTimeoutRef.current);
      }
    };
  }, [
    isHandActive,
    currentTurnPlayerId,
    players,
    communityCards,
    currentHighestBet,
    pots,
    bettingRound,
    gameSpeed,
    handlePlayerAction,
  ]);

  // When it's Hero's turn, auto fetch / refresh Coach Advice
  useEffect(() => {
    if (isHandActive && currentTurnPlayerId === 'hero') {
      fetchCoachAdvice();
    }
  }, [isHandActive, currentTurnPlayerId, fetchCoachAdvice]);

  const heroPlayer = players.find(p => p.isHuman) || players[0];
  const isHeroTurn = isHandActive && currentTurnPlayerId === 'hero';
  const toCall = heroPlayer ? Math.max(0, currentHighestBet - heroPlayer.currentBet) : 0;
  const canCheck = toCall === 0;
  const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);
  const minBet = currentHighestBet > 0 ? currentHighestBet + minRaiseIncrement : BIG_BLIND;
  const maxBet = heroPlayer ? heroPlayer.chips + heroPlayer.currentBet : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentView={viewMode}
        onSelectView={handleSelectView}
        soundMuted={soundMuted}
        onToggleSound={handleToggleSound}
        useFourColor={useFourColor}
        onToggleFourColor={() => setUseFourColor(!useFourColor)}
        onOpenStats={() => setIsStatsOpen(true)}
        heroChips={heroPlayer?.chips || INITIAL_CHIPS}
      />

      {/* Main App Content Viewport */}
      <main className={`flex-1 w-full ${isCoachChatOpen ? 'max-w-[1920px]' : 'max-w-7xl'} mx-auto px-2 sm:px-4 py-4 flex flex-col gap-5 transition-all duration-300`}>
        {viewMode === 'table' || viewMode === 'headsup' ? (
          /* Live Poker Felt Table + Side-by-Side AI Coach View */
          <div className={`grid grid-cols-1 ${isCoachChatOpen ? 'xl:grid-cols-12' : 'grid-cols-1'} gap-4 items-start`}>
            {/* Left Area: Complete Poker Game (Shifted left when AI open) */}
            <div className={`${isCoachChatOpen ? 'xl:col-span-8 2xl:col-span-8' : 'w-full'} flex flex-col gap-4 transition-all duration-300`}>
              {/* Upper Area: Left Poker Table + Right Vertical Betting Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* Left Column: The Poker Felt Table */}
                <div className="lg:col-span-8 xl:col-span-9 flex flex-col">
                  <PokerTable
                    players={players}
                    communityCards={communityCards}
                    pots={pots}
                    currentTurnPlayerId={currentTurnPlayerId}
                    dealerSeatIndex={dealerSeatIndex}
                    bettingRound={bettingRound}
                    isHandActive={isHandActive}
                    winners={winners}
                    heroBestHand={
                      heroPlayer && heroPlayer.cards.length === 2
                        ? evaluateHand([...heroPlayer.cards, ...communityCards])
                        : null
                    }
                    useFourColor={useFourColor}
                    showAiCards={showAiCards}
                    gameSpeed={gameSpeed}
                    isHeadsUpMode={isHeadsUpMode}
                    onNextHand={startNewHand}
                    onRebuyChips={handleRebuyChips}
                    onToggleAiCards={() => setShowAiCards(!showAiCards)}
                    onChangeGameSpeed={setGameSpeed}
                    onOpenHandReview={() => setIsHandReviewOpen(true)}
                    hasHandHistoryToReview={handHistory.length > 0}
                  />
                </div>

                {/* Right Column: Vertical Interactive Betting Controls */}
                <div className="lg:col-span-4 xl:col-span-3 flex flex-col justify-stretch">
                  <BettingControls
                    isHeroTurn={isHeroTurn}
                    canCheck={canCheck}
                    toCall={toCall}
                    minBet={minBet}
                    maxBet={maxBet}
                    potSize={totalPot}
                    bigBlind={BIG_BLIND}
                    heroChips={heroPlayer?.chips || 0}
                    onAction={(act, amt) => handlePlayerAction('hero', act, amt)}
                    recommendedAction={coachAdvice?.action}
                    recommendedAmount={coachAdvice?.suggestedAmount}
                  />
                </div>
              </div>

              {/* Lower Area: Full-Width AI Coach & Real-time Math HUD */}
              <div className="w-full">
                <AICoachPanel
                  equityData={equityData}
                  coachAdvice={coachAdvice}
                  isLoadingCoach={isLoadingCoach}
                  onRefreshCoachAdvice={() => fetchCoachAdvice(true)}
                  onOpenChatModal={() => setIsCoachChatOpen(!isCoachChatOpen)}
                  isChatOpen={isCoachChatOpen}
                  isHeroTurn={isHeroTurn}
                  toCall={toCall}
                  useFourColor={useFourColor}
                />
              </div>
            </div>

            {/* Right Area: Interactive Side AI Coach Chat Panel */}
            {isCoachChatOpen && (
              <div className="xl:col-span-4 2xl:col-span-4 w-full h-[calc(100vh-100px)] min-h-[640px] sticky top-16 flex flex-col">
                <CoachChatModal
                  isOpen={true}
                  onClose={() => setIsCoachChatOpen(false)}
                  gameContext={{
                    heroCards: heroPlayer?.cards || [],
                    communityCards,
                    potSize: pots.reduce((sum, p) => sum + p.amount, 0),
                    currentBet: currentHighestBet,
                    toCall,
                    position: heroPlayer?.position || 'BTN',
                    street: bettingRound,
                    heroChips: heroPlayer?.chips || 0,
                    winRate: equityData.winRate,
                    handStrengthDesc: equityData.handStrengthDesc,
                    aimingHandSummary: equityData.aimingHandSummary,
                    outsCount: equityData.outsCount,
                  }}
                  useFourColor={useFourColor}
                />
              </div>
            )}
          </div>
        ) : viewMode === 'range_chart' ? (
          /* Preflop 13x13 Matrix Range Chart View */
          <PreflopChartViewer />
        ) : viewMode === 'drills' ? (
          /* Training Drills & Math Quiz View */
          <DrillMode />
        ) : null}
      </main>

      {/* Modals */}
      <HandHistoryReviewModal
        isOpen={isHandReviewOpen}
        onClose={() => setIsHandReviewOpen(false)}
        handHistory={handHistory[0] || null}
        useFourColor={useFourColor}
      />

      <SessionStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={sessionStats}
        onResetStats={() =>
          setSessionStats({
            handsPlayed: 0,
            handsWon: 0,
            vpipHands: 0,
            pfrHands: 0,
            threeBetHands: 0,
            threeBetOpportunities: 0,
            showdownsReached: 0,
            showdownsWon: 0,
            startingChips: heroPlayer?.chips || INITIAL_CHIPS,
            currentChips: heroPlayer?.chips || INITIAL_CHIPS,
            biggestPotWon: 0,
            allInCount: 0,
          })
        }
      />
    </div>
  );
}
