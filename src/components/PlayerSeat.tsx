import React from 'react';
import { Player } from '../types/poker';
import { PlayingCard } from './PlayingCard';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, User, Coins } from 'lucide-react';

interface PlayerSeatProps {
  player: Player;
  isCurrentTurn: boolean;
  isDealer: boolean;
  useFourColor: boolean;
  showAiCards?: boolean;
  winningHandDesc?: string;
  isWinner?: boolean;
  positionCoordinates?: { top: string; left: string };
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isCurrentTurn,
  isDealer,
  useFourColor,
  showAiCards = false,
  winningHandDesc,
  isWinner = false,
  positionCoordinates,
}) => {
  const getActionColor = (actionType?: string) => {
    switch (actionType) {
      case 'fold':
        return 'bg-slate-700 text-slate-300 border-slate-600';
      case 'check':
        return 'bg-blue-600 text-white border-blue-400';
      case 'call':
        return 'bg-emerald-600 text-white border-emerald-400';
      case 'bet':
      case 'raise':
        return 'bg-amber-500 text-slate-950 font-bold border-amber-300';
      case 'all-in':
        return 'bg-rose-600 text-white font-black border-rose-400 animate-pulse';
      default:
        return 'bg-slate-800 text-slate-200 border-slate-700';
    }
  };

  const getActionLabel = (actionType?: string, amount?: number) => {
    switch (actionType) {
      case 'fold':
        return '폴드 (Fold)';
      case 'check':
        return '체크 (Check)';
      case 'call':
        return `콜 $${amount?.toLocaleString()}`;
      case 'bet':
        return `벳 $${amount?.toLocaleString()}`;
      case 'raise':
        return `레이즈 $${amount?.toLocaleString()}`;
      case 'all-in':
        return `올인 $${amount?.toLocaleString()}`;
      default:
        return '';
    }
  };

  const isHuman = player.isHuman;
  const isFolded = player.folded;

  return (
    <div
      className={`absolute transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10`}
      style={{
        top: positionCoordinates?.top || '50%',
        left: positionCoordinates?.left || '50%',
      }}
    >
      {/* Action Notification Bubble */}
      <AnimatePresence>
        {player.lastAction && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute -top-7 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-md whitespace-nowrap z-20 ${getActionColor(
              player.lastAction.type
            )}`}
          >
            {getActionLabel(player.lastAction.type, player.lastAction.amount)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winner Crown / Badge */}
      {isWinner && (
        <motion.div
          initial={{ scale: 0, y: 10 }}
          animate={{ scale: 1, y: -2 }}
          className="absolute -top-12 px-3 py-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-extrabold text-xs rounded-full shadow-lg border border-yellow-200 flex items-center gap-1 z-30 animate-bounce"
        >
          <span>🏆 승리!</span>
          {winningHandDesc && <span className="font-normal text-[11px]">({winningHandDesc})</span>}
        </motion.div>
      )}

      {/* Cards Container */}
      <div className="flex gap-1 -mb-3 z-10">
        {player.cards.length === 2 ? (
          <>
            <PlayingCard
              card={player.cards[0]}
              faceDown={!isHuman && !showAiCards && !player.showCards}
              size={isHuman ? 'md' : 'sm'}
              isFolded={isFolded}
              useFourColor={useFourColor}
            />
            <PlayingCard
              card={player.cards[1]}
              faceDown={!isHuman && !showAiCards && !player.showCards}
              size={isHuman ? 'md' : 'sm'}
              isFolded={isFolded}
              useFourColor={useFourColor}
            />
          </>
        ) : (
          <div className="h-14 w-20 flex items-center justify-center opacity-0" />
        )}
      </div>

      {/* Player Avatar & Info Box */}
      <div
        className={`relative w-36 rounded-xl p-2 flex flex-col items-center transition-all duration-300 shadow-xl backdrop-blur-md ${
          isFolded
            ? 'bg-slate-900/60 opacity-40 border border-slate-800'
            : isCurrentTurn
            ? 'bg-slate-900/95 ring-2 ring-amber-400 border border-amber-300/80 shadow-amber-500/20 scale-105'
            : isWinner
            ? 'bg-slate-900/95 ring-2 ring-emerald-400 border border-emerald-300 shadow-emerald-500/30'
            : 'bg-slate-900/90 border border-slate-700/80'
        }`}
      >
        {/* Dealer Button Badge */}
        {isDealer && (
          <div className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-white text-slate-950 font-black text-[11px] flex items-center justify-center shadow-lg border-2 border-slate-900">
            D
          </div>
        )}

        {/* Position Tag */}
        <div className="absolute -top-2 -left-2 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-[10px] font-mono font-bold text-slate-300">
          {player.position}
        </div>

        {/* Avatar + Turn Timer Ring */}
        <div className="relative mb-1">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
              isHuman
                ? 'bg-indigo-600 border-indigo-400 text-white'
                : player.personality?.color
                ? `${player.personality.color} text-white`
                : 'bg-slate-700 border-slate-500 text-slate-200'
            }`}
          >
            {isHuman ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
          </div>

          {/* Active Turn Pulse */}
          {isCurrentTurn && (
            <div className="absolute -inset-1 rounded-full border-2 border-amber-400 animate-ping opacity-75 pointer-events-none" />
          )}
        </div>

        {/* Name & Personality */}
        <div className="w-full text-center truncate">
          <div className="text-xs font-semibold text-slate-100 flex items-center justify-center gap-1">
            <span className="truncate">{player.name}</span>
            {isHuman && (
              <span className="text-[10px] px-1 bg-indigo-500/30 text-indigo-300 rounded font-normal">
                YOU
              </span>
            )}
          </div>

          {!isHuman && player.personality && (
            <div className="text-[10px] text-slate-400 truncate">
              {player.personality.title}
            </div>
          )}
        </div>

        {/* Chips Balance */}
        <div className="mt-1 flex items-center justify-center gap-1 text-xs font-mono font-bold text-amber-400 bg-slate-950/80 px-2 py-0.5 rounded-md w-full">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span>${player.chips.toLocaleString()}</span>
        </div>
      </div>

      {/* Current Bet Chips on Table */}
      {player.currentBet > 0 && (
        <motion.div
          initial={{ scale: 0.5, y: -5 }}
          animate={{ scale: 1, y: 0 }}
          className="mt-1 flex items-center gap-1 px-2 py-0.5 bg-slate-950/90 text-amber-300 font-mono text-xs font-bold rounded-full border border-amber-500/40 shadow-md"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-200" />
          <span>${player.currentBet.toLocaleString()}</span>
        </motion.div>
      )}
    </div>
  );
};
