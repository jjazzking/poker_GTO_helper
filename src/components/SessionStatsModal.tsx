import React from 'react';
import { SessionStats } from '../types/poker';
import { X, TrendingUp, BarChart3, Award, Target, Flame, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

interface SessionStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: SessionStats;
  onResetStats: () => void;
}

export const SessionStatsModal: React.FC<SessionStatsModalProps> = ({
  isOpen,
  onClose,
  stats,
  onResetStats,
}) => {
  if (!isOpen) return null;

  const vpipPercent = stats.handsPlayed > 0 ? Math.round((stats.vpipHands / stats.handsPlayed) * 100) : 0;
  const pfrPercent = stats.handsPlayed > 0 ? Math.round((stats.pfrHands / stats.handsPlayed) * 100) : 0;
  const threeBetPercent =
    stats.threeBetOpportunities > 0 ? Math.round((stats.threeBetHands / stats.threeBetOpportunities) * 100) : 0;
  const showdownWinPercent =
    stats.showdownsReached > 0 ? Math.round((stats.showdownsWon / stats.showdownsReached) * 100) : 0;
  const winPercent = stats.handsPlayed > 0 ? Math.round((stats.handsWon / stats.handsPlayed) * 100) : 0;
  const netProfit = stats.currentChips - stats.startingChips;

  // Determine playstyle archetype
  const getPlaystyleArchetype = () => {
    if (stats.handsPlayed < 5) return { title: '데이터 수집 중', desc: '더 많은 핸드를 플레이해보세요.', color: 'text-slate-400' };
    if (vpipPercent <= 18 && pfrPercent <= 14) return { title: 'Nit (초보수형/바위)', desc: '너무 타이트합니다. 포지션에서 오픈 레인지를 넓혀보세요.', color: 'text-blue-400' };
    if (vpipPercent >= 19 && vpipPercent <= 28 && pfrPercent >= 16) return { title: 'TAG (타이트 어그레시브 - 정석 GTO)', desc: '이상적인 승률을 내는 가장 견고한 스타일입니다!', color: 'text-emerald-400' };
    if (vpipPercent > 28 && pfrPercent >= 22) return { title: 'LAG (루즈 어그레시브)', desc: '공격적인 압박형 스타일입니다. 포스트플랍 운영력이 중요합니다.', color: 'text-amber-400' };
    if (vpipPercent > 32 && pfrPercent < 15) return { title: 'Calling Station (루즈 패시브)', desc: '너무 많은 핸드로 콜만 합니다. 프리플랍 폴드 빈도를 높이세요.', color: 'text-rose-400' };
    return { title: '균형형 플레이어', desc: '상황에 따라 유연하게 대응하고 있습니다.', color: 'text-indigo-400' };
  };

  const archetype = getPlaystyleArchetype();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white shadow">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">내 세션 통계 & 릭(Leak) 진단</h3>
              <p className="text-xs text-slate-400">VPIP, PFR, 3-Bet 등 프로 수준의 핵심 지표 분석</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
          {/* Net Profit & Archetype Banner */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400">세션 순손익 (Net Profit)</span>
              <span
                className={`text-2xl font-mono font-extrabold flex items-center gap-1 ${
                  netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                <TrendingUp className="w-5 h-5" />
                {netProfit >= 0 ? `+$${netProfit.toLocaleString()}` : `-$${Math.abs(netProfit).toLocaleString()}`}
              </span>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-400">플레이스타일 진단</span>
              <span className={`text-sm font-bold ${archetype.color}`}>{archetype.title}</span>
              <span className="text-[11px] text-slate-400 max-w-[200px] text-right">{archetype.desc}</span>
            </div>
          </div>

          {/* Core HUD Metrics 2x2 Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* VPIP */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
              <span className="text-xs text-slate-400 font-medium">VPIP %</span>
              <span className="text-xl font-mono font-bold text-indigo-400">{vpipPercent}%</span>
              <span className="text-[10px] text-slate-500">GTO 권장: 20~26%</span>
            </div>

            {/* PFR */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
              <span className="text-xs text-slate-400 font-medium">PFR %</span>
              <span className="text-xl font-mono font-bold text-amber-400">{pfrPercent}%</span>
              <span className="text-[10px] text-slate-500">GTO 권장: 16~22%</span>
            </div>

            {/* 3-Bet */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
              <span className="text-xs text-slate-400 font-medium">3-Bet %</span>
              <span className="text-xl font-mono font-bold text-emerald-400">{threeBetPercent}%</span>
              <span className="text-[10px] text-slate-500">GTO 권장: 7~11%</span>
            </div>

            {/* Winrate */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
              <span className="text-xs text-slate-400 font-medium">승률 (Win%)</span>
              <span className="text-xl font-mono font-bold text-teal-400">{winPercent}%</span>
              <span className="text-[10px] text-slate-500">{stats.handsWon}승 / {stats.handsPlayed}판</span>
            </div>
          </div>

          {/* Extended Details */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col gap-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">총 진행 핸드:</span>
              <span className="font-mono font-bold text-slate-200">{stats.handsPlayed} Hands</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">쇼다운 진출 시 승률 (W$SD):</span>
              <span className="font-mono font-bold text-slate-200">
                {showdownWinPercent}% ({stats.showdownsWon} / {stats.showdownsReached})
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">최대 획득 팟:</span>
              <span className="font-mono font-bold text-amber-400">${stats.biggestPotWon.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">올인 시도 횟수:</span>
              <span className="font-mono font-bold text-slate-200">{stats.allInCount}회</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onResetStats}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>통계 초기화</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
          >
            확인
          </button>
        </div>
      </motion.div>
    </div>
  );
};
