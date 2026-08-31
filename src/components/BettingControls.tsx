import React, { useState, useEffect } from 'react';
import { ActionType } from '../types/poker';
import { motion } from 'motion/react';
import { ArrowUpRight, Check, X, ShieldAlert, Sparkles } from 'lucide-react';

interface BettingControlsProps {
  isHeroTurn: boolean;
  canCheck: boolean;
  toCall: number;
  minBet: number;
  maxBet: number;
  potSize: number;
  bigBlind: number;
  heroChips: number;
  onAction: (action: ActionType, amount: number) => void;
  recommendedAction?: string;
  recommendedAmount?: number;
}

export const BettingControls: React.FC<BettingControlsProps> = ({
  isHeroTurn,
  canCheck,
  toCall,
  minBet,
  maxBet,
  potSize,
  bigBlind,
  heroChips,
  onAction,
  recommendedAction,
  recommendedAmount,
}) => {
  const [betAmount, setBetAmount] = useState<number>(minBet);

  useEffect(() => {
    setBetAmount(Math.min(maxBet, Math.max(minBet, recommendedAmount || minBet)));
  }, [minBet, maxBet, recommendedAmount]);

  if (!isHeroTurn) {
    return (
      <div className="w-full bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between text-slate-400 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-600 animate-pulse" />
          <span>다른 플레이어의 턴을 기다리는 중...</span>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          내 스택: <span className="text-amber-400 font-bold">${heroChips.toLocaleString()}</span>
        </div>
      </div>
    );
  }

  const isRaise = toCall > 0 && !canCheck;
  const isAllInBet = betAmount >= heroChips;

  // Preset quick sizes
  const handlePreset = (fraction: number) => {
    const calculated = Math.round(potSize * fraction);
    const clamped = Math.min(maxBet, Math.max(minBet, calculated));
    setBetAmount(clamped);
  };

  const handleBbPreset = (multiplier: number) => {
    const calculated = Math.round(bigBlind * multiplier);
    const clamped = Math.min(maxBet, Math.max(minBet, calculated));
    setBetAmount(clamped);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-slate-900/95 border border-slate-700/80 backdrop-blur-xl rounded-2xl p-4 shadow-2xl flex flex-col gap-3"
    >
      {/* Quick Sizing Buttons & Slider (Shown if bet/raise is possible) */}
      {heroChips > toCall && (
        <div className="flex flex-col gap-2">
          {/* Quick preset buttons */}
          <div className="flex flex-wrap items-center gap-1.5 justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setBetAmount(minBet)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                Min (${minBet})
              </button>
              <button
                type="button"
                onClick={() => handleBbPreset(2.5)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                2.5x BB
              </button>
              <button
                type="button"
                onClick={() => handlePreset(0.33)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                33% Pot
              </button>
              <button
                type="button"
                onClick={() => handlePreset(0.5)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                50% Pot
              </button>
              <button
                type="button"
                onClick={() => handlePreset(0.75)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                75% Pot
              </button>
              <button
                type="button"
                onClick={() => handlePreset(1.0)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                Pot 100%
              </button>
            </div>

            <button
              type="button"
              onClick={() => setBetAmount(maxBet)}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/50 transition flex items-center gap-1"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>All-In (${maxBet.toLocaleString()})</span>
            </button>
          </div>

          {/* Sizing Slider & Exact Amount Input */}
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={minBet}
              max={maxBet}
              step={bigBlind / 2 || 1}
              value={betAmount}
              onChange={e => setBetAmount(Number(e.target.value))}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1 text-sm font-mono text-amber-400 font-bold min-w-[110px] justify-between">
              <span>$</span>
              <input
                type="number"
                min={minBet}
                max={maxBet}
                value={betAmount}
                onChange={e => setBetAmount(Math.min(maxBet, Math.max(minBet, Number(e.target.value))))}
                className="w-20 bg-transparent text-right outline-none text-amber-400 font-bold font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Action Buttons */}
      <div className="grid grid-cols-3 gap-3">
        {/* 1. Fold Button */}
        <button
          type="button"
          onClick={() => onAction('fold', 0)}
          className={`py-3.5 px-4 rounded-xl font-bold text-sm transition flex flex-col items-center justify-center gap-0.5 shadow-lg border relative ${
            recommendedAction === 'FOLD'
              ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-200 border-rose-500 ring-2 ring-rose-400/50'
              : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
          }`}
        >
          {recommendedAction === 'FOLD' && (
            <span className="absolute -top-2.5 px-2 py-0.5 bg-rose-600 text-[10px] font-extrabold rounded-full text-white flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> AI 추천
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <X className="w-4 h-4 text-rose-400" />
            <span className="text-base">폴드 (Fold)</span>
          </div>
          <span className="text-[11px] text-slate-400 font-normal">카드 포기하기</span>
        </button>

        {/* 2. Check or Call Button */}
        {canCheck ? (
          <button
            type="button"
            onClick={() => onAction('check', 0)}
            className={`py-3.5 px-4 rounded-xl font-bold text-sm transition flex flex-col items-center justify-center gap-0.5 shadow-lg border relative ${
              recommendedAction === 'CHECK'
                ? 'bg-blue-900/80 hover:bg-blue-800 text-white border-blue-400 ring-2 ring-blue-400/50'
                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500'
            }`}
          >
            {recommendedAction === 'CHECK' && (
              <span className="absolute -top-2.5 px-2 py-0.5 bg-blue-500 text-[10px] font-extrabold rounded-full text-white flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> AI 추천
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              <span className="text-base">체크 (Check)</span>
            </div>
            <span className="text-[11px] text-blue-200 font-normal">무료로 넘기기</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onAction('call', Math.min(heroChips, toCall))}
            className={`py-3.5 px-4 rounded-xl font-bold text-sm transition flex flex-col items-center justify-center gap-0.5 shadow-lg border relative ${
              recommendedAction === 'CALL'
                ? 'bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 border-emerald-400 ring-2 ring-emerald-400/50'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
            }`}
          >
            {recommendedAction === 'CALL' && (
              <span className="absolute -top-2.5 px-2 py-0.5 bg-emerald-500 text-[10px] font-extrabold rounded-full text-white flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> AI 추천
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              <span className="text-base">
                {heroChips <= toCall ? `올인 콜 $${heroChips.toLocaleString()}` : `콜 $${toCall.toLocaleString()}`}
              </span>
            </div>
            <span className="text-[11px] text-emerald-200 font-normal">베팅 금액 맞추기</span>
          </button>
        )}

        {/* 3. Bet / Raise / All-in Button */}
        {heroChips > toCall ? (
          <button
            type="button"
            onClick={() => {
              if (isAllInBet) {
                onAction('all-in', maxBet);
              } else if (isRaise) {
                onAction('raise', betAmount);
              } else {
                onAction('bet', betAmount);
              }
            }}
            className={`py-3.5 px-4 rounded-xl font-bold text-sm transition flex flex-col items-center justify-center gap-0.5 shadow-lg border relative ${
              recommendedAction === 'BET' || recommendedAction === 'RAISE' || recommendedAction === 'ALL_IN'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400/60'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
            }`}
          >
            {(recommendedAction === 'BET' || recommendedAction === 'RAISE' || recommendedAction === 'ALL_IN') && (
              <span className="absolute -top-2.5 px-2 py-0.5 bg-amber-300 text-slate-950 text-[10px] font-extrabold rounded-full flex items-center gap-0.5 shadow">
                <Sparkles className="w-2.5 h-2.5" /> AI 추천
              </span>
            )}
            <div className="flex items-center gap-1.5 font-extrabold">
              <ArrowUpRight className="w-4 h-4" />
              <span className="text-base">
                {isAllInBet ? '올인 (All-In)' : isRaise ? '레이즈 (Raise)' : '벳 (Bet)'} ${betAmount.toLocaleString()}
              </span>
            </div>
            <span className="text-[11px] text-slate-900/80 font-semibold">
              {isAllInBet ? '전체 칩 베팅' : '팟 키우기 / 압박'}
            </span>
          </button>
        ) : (
          <div className="py-3.5 px-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col items-center justify-center text-slate-500 text-xs">
            <span>추가 베팅 불가</span>
            <span className="text-[10px]">스택 부족 (올인 상태)</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
