import React from 'react';
import { Player, Card, Pot, BettingRound, EvaluatedHand } from '../types/poker';
import { PlayerSeat } from './PlayerSeat';
import { PlayingCard } from './PlayingCard';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, FastForward, Eye, EyeOff, Trophy, Sparkles } from 'lucide-react';

interface PokerTableProps {
  players: Player[];
  communityCards: Card[];
  pots: Pot[];
  currentTurnPlayerId: string | null;
  dealerSeatIndex: number;
  bettingRound: BettingRound;
  isHandActive: boolean;
  winners: { playerId: string; name: string; amount: number; handDescription?: string }[];
  heroBestHand?: EvaluatedHand | null;
  useFourColor: boolean;
  showAiCards: boolean;
  gameSpeed: number; // 1 = 1x, 2 = 2x, 0.5 = slow
  isHeadsUpMode: boolean;
  onNextHand: () => void;
  onRebuyChips: () => void;
  onToggleAiCards: () => void;
  onChangeGameSpeed: (speed: number) => void;
  onOpenHandReview: () => void;
  hasHandHistoryToReview: boolean;
}

export const PokerTable: React.FC<PokerTableProps> = ({
  players,
  communityCards,
  pots,
  currentTurnPlayerId,
  dealerSeatIndex,
  bettingRound,
  isHandActive,
  winners,
  heroBestHand,
  useFourColor,
  showAiCards,
  gameSpeed,
  isHeadsUpMode,
  onNextHand,
  onRebuyChips,
  onToggleAiCards,
  onChangeGameSpeed,
  onOpenHandReview,
  hasHandHistoryToReview,
}) => {
  // 6-Max oval positions (percentages from center container)
  const sixMaxPositions = [
    { top: '82%', left: '50%' },  // Seat 0: Hero (Bottom Center)
    { top: '68%', left: '16%' },  // Seat 1: Bottom Left
    { top: '28%', left: '16%' },  // Seat 2: Top Left
    { top: '15%', left: '50%' },  // Seat 3: Top Center
    { top: '28%', left: '84%' },  // Seat 4: Top Right
    { top: '68%', left: '84%' },  // Seat 5: Bottom Right
  ];

  // Heads-Up positions (2 players)
  const headsUpPositions = [
    { top: '82%', left: '50%' },  // Seat 0: Hero (Bottom)
    { top: '18%', left: '50%' },  // Seat 1: Opponent (Top)
  ];

  const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);

  const getStreetLabel = (round: BettingRound) => {
    switch (round) {
      case 'preflop':
        return '프리플랍 (Pre-flop)';
      case 'flop':
        return '플랍 (Flop)';
      case 'turn':
        return '턴 (Turn)';
      case 'river':
        return '리버 (River)';
      case 'showdown':
        return '쇼다운 (Showdown)';
      case 'ended':
        return '핸드 종료';
    }
  };

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Table Action Bar Controls (Speed, Peeking, History) */}
      <div className="w-full flex items-center justify-between mb-3 px-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold">게임 속도:</span>
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => onChangeGameSpeed(1)}
              className={`px-2 py-0.5 rounded font-mono ${gameSpeed === 1 ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              1x
            </button>
            <button
              type="button"
              onClick={() => onChangeGameSpeed(2)}
              className={`px-2 py-0.5 rounded font-mono ${gameSpeed === 2 ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              2x
            </button>
            <button
              type="button"
              onClick={() => onChangeGameSpeed(4)}
              className={`px-2 py-0.5 rounded font-mono flex items-center gap-0.5 ${gameSpeed === 4 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <FastForward className="w-3 h-3" />
              <span>고속</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleAiCards}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 transition ${
              showAiCards
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
            title="연습용 AI 카드 보기 토글"
          >
            {showAiCards ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showAiCards ? 'AI 카드 공개중' : 'AI 카드 투시(연습)'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {hasHandHistoryToReview && (
            <button
              type="button"
              onClick={onOpenHandReview}
              className="px-2.5 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-500/40 font-semibold flex items-center gap-1 shadow-sm transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>핸드 복기 & AI 평가</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRebuyChips}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-800 font-semibold flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>칩 충전 ($1,000)</span>
          </button>
        </div>
      </div>

      {/* The Felt Table Canvas Area */}
      <div className="relative w-full h-[460px] sm:h-[500px] rounded-[100px] sm:rounded-[140px] p-4 flex items-center justify-center select-none shadow-2xl overflow-hidden border-[10px] sm:border-[12px] border-amber-950 bg-slate-950">
        {/* Felt Outer Shadow & Texture */}
        <div
          className="absolute inset-0 rounded-[90px] sm:rounded-[128px] border-4 border-emerald-950/80 shadow-inner flex items-center justify-center overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at center, #065f46 0%, #044e3a 55%, #022c22 100%)',
          }}
        >
          {/* Subtle table watermarked felt line */}
          <div className="w-[82%] h-[74%] rounded-[70px] sm:rounded-[100px] border border-emerald-400/15 pointer-events-none" />
        </div>

        {/* Central Poker Board Area */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-3">
          {/* Street & Round Indicator */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-slate-950/80 border border-emerald-500/30 rounded-full text-xs font-mono font-bold text-emerald-300 shadow-md backdrop-blur-md">
              {getStreetLabel(bettingRound)}
            </span>
          </div>

          {/* Main Pot & Side Pots Display */}
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 px-4 py-1.5 bg-slate-950/90 border border-amber-500/40 rounded-2xl shadow-xl backdrop-blur-md"
            >
              <div className="flex -space-x-1">
                <div className="w-4 h-4 rounded-full bg-amber-400 border border-amber-200 shadow-sm" />
                <div className="w-4 h-4 rounded-full bg-rose-500 border border-rose-200 shadow-sm" />
                <div className="w-4 h-4 rounded-full bg-blue-500 border border-blue-200 shadow-sm" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-amber-300/80 uppercase font-semibold leading-none">
                  Total Pot
                </span>
                <span className="text-base font-mono font-extrabold text-amber-400 leading-tight">
                  ${totalPot.toLocaleString()}
                </span>
              </div>
            </motion.div>

            {/* Side pots info if any */}
            {pots.length > 1 && (
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-amber-200/90 font-mono">
                {pots.map((pot, idx) => (
                  <span key={idx} className="bg-slate-950/80 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {idx === 0 ? '메인팟' : `사이드팟 ${idx}`}: ${pot.amount}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 5 Community Cards (Flop, Turn, River) */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-h-[90px] p-2 bg-emerald-950/40 rounded-2xl border border-emerald-400/20 shadow-inner">
            {/* 5 Slots */}
            {[0, 1, 2, 3, 4].map(idx => {
              const card = communityCards[idx];
              return card ? (
                <PlayingCard
                  key={card.id}
                  card={card}
                  size="md"
                  useFourColor={useFourColor}
                  animate={true}
                />
              ) : (
                <div
                  key={`empty_${idx}`}
                  className="w-14 h-20 rounded-lg border-2 border-dashed border-emerald-600/30 flex items-center justify-center text-emerald-600/40 text-xs font-mono select-none"
                >
                  {idx < 3 ? 'Flop' : idx === 3 ? 'Turn' : 'River'}
                </div>
              );
            })}
          </div>

          {/* Hand ended action prompt */}
          {!isHandActive && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-1 flex items-center gap-2"
            >
              <button
                type="button"
                onClick={onNextHand}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-xl flex items-center gap-1.5 transform hover:scale-105 transition"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>다음 핸드 시작 (Next Hand)</span>
              </button>
            </motion.div>
          )}
        </div>

        {/* Player Seats Layout around the table */}
        {players.map((player, index) => {
          const coords = isHeadsUpMode
            ? headsUpPositions[index % headsUpPositions.length]
            : sixMaxPositions[index % sixMaxPositions.length];
          const isCurrentTurn = isHandActive && currentTurnPlayerId === player.id;
          const isDealer = index === dealerSeatIndex;
          const winnerData = winners.find(w => w.playerId === player.id);

          return (
            <PlayerSeat
              key={player.id}
              player={player}
              isCurrentTurn={isCurrentTurn}
              isDealer={isDealer}
              useFourColor={useFourColor}
              showAiCards={showAiCards}
              isWinner={Boolean(winnerData)}
              winningHandDesc={winnerData?.handDescription}
              positionCoordinates={coords}
            />
          );
        })}
      </div>
    </div>
  );
};
