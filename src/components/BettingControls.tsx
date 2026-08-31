import React, { useState, useEffect } from 'react';
import { ActionType } from '../types/poker';
import { motion } from 'motion/react';
import { ArrowUpRight, Check, X, ShieldAlert, Sparkles, Plus, Minus, Coins } from 'lucide-react';

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

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isHeroTurn) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      if (e.key === 'f' || e.key === 'F') {
        onAction('fold', 0);
      } else if (e.key === 'c' || e.key === 'C') {
        if (canCheck) onAction('check', 0);
        else onAction('call', Math.min(heroChips, toCall));
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'b' || e.key === 'B') {
        if (heroChips > toCall) {
          const isRaise = toCall > 0 && !canCheck;
          const isAllInBet = betAmount >= heroChips;
          if (isAllInBet) onAction('all-in', maxBet);
          else if (isRaise) onAction('raise', betAmount);
          else onAction('bet', betAmount);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHeroTurn, canCheck, toCall, heroChips, betAmount, maxBet, onAction]);

  const isRaise = toCall > 0 && !canCheck;
  const isAllInBet = betAmount >= heroChips || betAmount >= maxBet;

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

  const adjustBet = (delta: number) => {
    setBetAmount(prev => Math.min(maxBet, Math.max(minBet, prev + delta)));
  };

  if (!isHeroTurn) {
    return (
      <div className="w-full h-full min-h-[460px] sm:min-h-[500px] bg-slate-900/90 border border-slate-800/90 backdrop-blur-xl rounded-3xl p-5 flex flex-col justify-between shadow-2xl">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500/80 animate-ping" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">베팅 대기 상태</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              턴 대기
            </span>
          </div>

          <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-500 shadow-inner">
              <Coins className="w-7 h-7 text-amber-500/70 animate-pulse" />
            </div>
            <div className="text-sm font-semibold text-slate-300">상대 플레이어의 액션 진행 중</div>
            <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">
              내 차례가 되면 세로형 베팅 슬라이더와 액션 버튼이 활성화됩니다.
            </p>
          </div>
        </div>

        {/* Current status summary card */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3.5 flex flex-col gap-2 font-mono text-xs">
          <div className="flex justify-between items-center text-slate-400">
            <span>내 보유 스택:</span>
            <span className="text-amber-400 font-bold text-sm">${heroChips.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>현재 팟 사이즈:</span>
            <span className="text-emerald-400 font-bold text-sm">${potSize.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full h-full min-h-[460px] sm:min-h-[500px] bg-slate-900/95 border border-amber-500/30 backdrop-blur-xl rounded-3xl p-4 shadow-2xl flex flex-col justify-between gap-3 text-slate-200"
    >
      {/* Header: Turn Indicator & Stack Info */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
          <span className="text-xs font-black text-emerald-400 tracking-wide">내 턴 (HERO ACTION)</span>
        </div>
        <div className="text-xs font-mono text-slate-400">
          스택: <span className="text-amber-400 font-bold font-mono">${heroChips.toLocaleString()}</span>
        </div>
      </div>

      {/* Middle Section: Vertical Bet Sizing & Controls (Shown if Bet/Raise is possible) */}
      {heroChips > toCall ? (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <span>베팅 금액 설정</span>
            </span>
            <span className="font-mono text-amber-400 font-extrabold text-sm">${betAmount.toLocaleString()}</span>
          </div>

          {/* Vertical Slider & Sizing Presets Side by Side */}
          <div className="flex items-center gap-3">
            {/* Vertical Slider Column */}
            <div className="flex flex-col items-center justify-between h-28 py-1 px-1 bg-slate-900/90 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => adjustBet(bigBlind)}
                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition text-xs"
                title="+1 BB"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {/* Native Vertical Slider */}
              <div className="relative flex items-center justify-center h-16 w-6">
                <input
                  type="range"
                  min={minBet}
                  max={maxBet}
                  step={bigBlind / 2 || 1}
                  value={betAmount}
                  onChange={e => setBetAmount(Number(e.target.value))}
                  className="h-16 w-2 appearance-none bg-slate-700 rounded-full cursor-pointer accent-amber-400"
                  style={{
                    writingMode: 'vertical-lr',
                    direction: 'rtl',
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => adjustBet(-bigBlind)}
                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition text-xs"
                title="-1 BB"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Sizing Buttons & Input */}
            <div className="flex-1 flex flex-col gap-1.5">
              {/* Presets Grid */}
              <div className="grid grid-cols-3 gap-1 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setBetAmount(minBet)}
                  className="py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/80 transition text-center"
                >
                  Min (${minBet})
                </button>
                <button
                  type="button"
                  onClick={() => handleBbPreset(2.5)}
                  className="py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/80 transition text-center"
                >
                  2.5x BB
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(0.33)}
                  className="py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/80 transition text-center"
                >
                  33% 팟
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(0.5)}
                  className="py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/80 transition text-center"
                >
                  50% 팟
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(0.75)}
                  className="py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/80 transition text-center"
                >
                  75% 팟
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(1.0)}
                  className="py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/80 transition text-center"
                >
                  100% 팟
                </button>
              </div>

              {/* Exact Amount Input + All-In Button */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="flex-1 flex items-center bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs font-mono font-bold text-amber-400">
                  <span className="text-slate-500 mr-1">$</span>
                  <input
                    type="number"
                    min={minBet}
                    max={maxBet}
                    value={betAmount}
                    onChange={e => setBetAmount(Math.min(maxBet, Math.max(minBet, Number(e.target.value))))}
                    className="w-full bg-transparent outline-none text-amber-400 font-mono font-bold text-right"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setBetAmount(maxBet)}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-600/50 transition flex items-center gap-1 shrink-0"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>올인</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-center text-xs text-slate-400">
          남은 스택이 부족하여 추가 레이즈가 불가능합니다.
        </div>
      )}

      {/* Vertical Action Buttons Stack (Fold, Check/Call, Bet/Raise) */}
      <div className="flex flex-col gap-2.5">
        {/* 1. Fold Button (Vertical item 1) */}
        <button
          type="button"
          onClick={() => onAction('fold', 0)}
          className={`w-full py-3 px-3.5 rounded-2xl font-bold text-sm transition flex items-center justify-between shadow-lg border relative ${
            recommendedAction === 'FOLD'
              ? 'bg-rose-950 hover:bg-rose-900 text-rose-200 border-rose-500 ring-2 ring-rose-400/60'
              : 'bg-slate-800/90 hover:bg-slate-750 text-slate-300 border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-rose-900/50 border border-rose-700/50 flex items-center justify-center text-rose-400">
              <X className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-extrabold leading-tight">폴드 (Fold)</span>
              <span className="text-[10px] text-slate-400 font-normal">카드 포기 [단축키: F]</span>
            </div>
          </div>
          {recommendedAction === 'FOLD' && (
            <span className="px-2 py-0.5 bg-rose-600 text-[10px] font-black rounded-full text-white flex items-center gap-0.5 shadow">
              <Sparkles className="w-2.5 h-2.5" /> AI 추천
            </span>
          )}
        </button>

        {/* 2. Check / Call Button (Vertical item 2) */}
        {canCheck ? (
          <button
            type="button"
            onClick={() => onAction('check', 0)}
            className={`w-full py-3 px-3.5 rounded-2xl font-bold text-sm transition flex items-center justify-between shadow-lg border relative ${
              recommendedAction === 'CHECK'
                ? 'bg-blue-900/90 hover:bg-blue-800 text-white border-blue-400 ring-2 ring-blue-400/60'
                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-950/60 border border-blue-400/40 flex items-center justify-center text-white">
                <Check className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-extrabold leading-tight">체크 (Check)</span>
                <span className="text-[10px] text-blue-200 font-normal">무료 카드 보기 [단축키: C]</span>
              </div>
            </div>
            {recommendedAction === 'CHECK' && (
              <span className="px-2 py-0.5 bg-blue-400 text-slate-950 text-[10px] font-black rounded-full flex items-center gap-0.5 shadow">
                <Sparkles className="w-2.5 h-2.5" /> AI 추천
              </span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onAction('call', Math.min(heroChips, toCall))}
            className={`w-full py-3 px-3.5 rounded-2xl font-bold text-sm transition flex items-center justify-between shadow-lg border relative ${
              recommendedAction === 'CALL'
                ? 'bg-emerald-900/90 hover:bg-emerald-800 text-emerald-100 border-emerald-400 ring-2 ring-emerald-400/60'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-950/60 border border-emerald-400/40 flex items-center justify-center text-white">
                <Check className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-extrabold leading-tight">
                  {heroChips <= toCall ? `올인 콜 $${heroChips.toLocaleString()}` : `콜 $${toCall.toLocaleString()}`}
                </span>
                <span className="text-[10px] text-emerald-200 font-normal">베팅 맞추기 [단축키: C]</span>
              </div>
            </div>
            {recommendedAction === 'CALL' && (
              <span className="px-2 py-0.5 bg-emerald-400 text-slate-950 text-[10px] font-black rounded-full flex items-center gap-0.5 shadow">
                <Sparkles className="w-2.5 h-2.5" /> AI 추천
              </span>
            )}
          </button>
        )}

        {/* 3. Bet / Raise / All-in Button (Vertical item 3) */}
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
            className={`w-full py-3 px-3.5 rounded-2xl font-bold text-sm transition flex items-center justify-between shadow-lg border relative ${
              recommendedAction === 'BET' || recommendedAction === 'RAISE' || recommendedAction === 'ALL_IN'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 border-amber-200 ring-2 ring-amber-300/80 shadow-amber-500/30'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-slate-950/20 border border-slate-950/20 flex items-center justify-center text-slate-950">
                <ArrowUpRight className="w-4 h-4 stroke-[3]" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-extrabold leading-tight">
                  {isAllInBet ? '올인 (All-In)' : isRaise ? '레이즈 (Raise)' : '벳 (Bet)'} ${betAmount.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-900/80 font-bold">
                  {isAllInBet ? '전체 칩 베팅' : isRaise ? '베팅 금액 올리기' : '팟 주도권 선점'} [단축키: R]
                </span>
              </div>
            </div>
            {(recommendedAction === 'BET' || recommendedAction === 'RAISE' || recommendedAction === 'ALL_IN') && (
              <span className="px-2 py-0.5 bg-slate-950 text-amber-300 text-[10px] font-black rounded-full flex items-center gap-0.5 shadow">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" /> AI 추천
              </span>
            )}
          </button>
        ) : (
          <div className="w-full py-3 px-3.5 rounded-2xl bg-slate-850/60 border border-slate-800 flex items-center justify-center text-slate-500 text-xs font-semibold">
            올인 상태 (추가 베팅 불가)
          </div>
        )}
      </div>
    </motion.div>
  );
};
