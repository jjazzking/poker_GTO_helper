import React from 'react';
import { Card, Suit } from '../types/poker';
import { motion } from 'motion/react';

interface PlayingCardProps {
  card?: Card;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isWinningCard?: boolean;
  isFolded?: boolean;
  useFourColor?: boolean;
  className?: string;
  animate?: boolean;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  faceDown = false,
  size = 'md',
  isWinningCard = false,
  isFolded = false,
  useFourColor = true,
  className = '',
  animate = true,
}) => {
  // Size dimensions
  const sizeClasses = {
    xs: 'w-7 h-10 text-xs rounded',
    sm: 'w-10 h-14 text-sm rounded-md',
    md: 'w-14 h-20 text-base rounded-lg',
    lg: 'w-20 h-28 text-xl rounded-xl',
    xl: 'w-24 h-34 text-2xl rounded-2xl',
  };

  // Suit symbols and colors
  const getSuitInfo = (suit: Suit) => {
    if (useFourColor) {
      switch (suit) {
        case 'spades':
          return { symbol: '♠', color: 'text-slate-900', bgBadge: 'bg-slate-100' };
        case 'hearts':
          return { symbol: '♥', color: 'text-rose-600', bgBadge: 'bg-rose-50' };
        case 'diamonds':
          return { symbol: '♦', color: 'text-blue-600', bgBadge: 'bg-blue-50' };
        case 'clubs':
          return { symbol: '♣', color: 'text-emerald-700', bgBadge: 'bg-emerald-50' };
      }
    } else {
      switch (suit) {
        case 'spades':
          return { symbol: '♠', color: 'text-slate-900', bgBadge: 'bg-slate-100' };
        case 'hearts':
          return { symbol: '♥', color: 'text-rose-600', bgBadge: 'bg-rose-50' };
        case 'diamonds':
          return { symbol: '♦', color: 'text-rose-600', bgBadge: 'bg-rose-50' };
        case 'clubs':
          return { symbol: '♣', color: 'text-slate-900', bgBadge: 'bg-slate-100' };
      }
    }
  };

  if (faceDown || !card) {
    return (
      <motion.div
        initial={animate ? { scale: 0.8, opacity: 0 } : false}
        animate={{ scale: 1, opacity: isFolded ? 0.4 : 1 }}
        transition={{ duration: 0.2 }}
        className={`relative select-none flex items-center justify-center border border-indigo-900/60 shadow-md ${sizeClasses[size]} ${className}`}
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
        }}
      >
        <div className="absolute inset-1 rounded border border-indigo-400/30 flex items-center justify-center overflow-hidden">
          <div className="w-full h-full opacity-20 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:6px_6px]" />
          <div className="absolute text-indigo-300 font-bold text-xs opacity-60">♠♦</div>
        </div>
      </motion.div>
    );
  }

  const { symbol, color } = getSuitInfo(card.suit);

  return (
    <motion.div
      initial={animate ? { scale: 0.7, y: -12, opacity: 0 } : false}
      animate={{
        scale: isWinningCard ? 1.08 : 1,
        y: isWinningCard ? -6 : 0,
        opacity: isFolded ? 0.35 : 1,
      }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`relative select-none bg-white font-mono font-bold flex flex-col justify-between p-1 shadow-lg border ${
        isWinningCard
          ? 'ring-3 ring-amber-400 border-amber-300 shadow-amber-400/40'
          : 'border-slate-300 hover:border-slate-400'
      } ${sizeClasses[size]} ${className}`}
    >
      {/* Top corner */}
      <div className={`leading-none flex flex-col items-center ${color}`}>
        <span className="font-extrabold tracking-tighter">{card.rank}</span>
        <span className="text-[0.7em] -mt-0.5">{symbol}</span>
      </div>

      {/* Center large suit icon */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none opacity-85 text-2xl ${color}`}>
        {symbol}
      </div>

      {/* Bottom corner flipped */}
      <div className={`leading-none flex flex-col items-center rotate-180 ${color}`}>
        <span className="font-extrabold tracking-tighter">{card.rank}</span>
        <span className="text-[0.7em] -mt-0.5">{symbol}</span>
      </div>
    </motion.div>
  );
};
