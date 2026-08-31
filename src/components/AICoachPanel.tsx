import React from 'react';
import { LiveEquityData, CoachAdvice } from '../types/poker';
import { Sparkles, Brain, Calculator, Target, RefreshCw, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface AICoachPanelProps {
  equityData: LiveEquityData;
  coachAdvice: CoachAdvice | null;
  isLoadingCoach: boolean;
  onRefreshCoachAdvice: () => void;
  onOpenChatModal: () => void;
  isHeroTurn: boolean;
  toCall: number;
}

export const AICoachPanel: React.FC<AICoachPanelProps> = ({
  equityData,
  coachAdvice,
  isLoadingCoach,
  onRefreshCoachAdvice,
  onOpenChatModal,
  isHeroTurn,
  toCall,
}) => {
  const getEVBadge = () => {
    if (toCall === 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
          체크 가능 (Free Card)
        </span>
      );
    }
    if (equityData.isPositiveEV) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
          <span>+EV</span> (수익적 콜)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30 flex items-center gap-1">
        <span>-EV</span> (오즈 불리/폴드 권장)
      </span>
    );
  };

  const getActionColor = (action?: string) => {
    switch (action) {
      case 'FOLD':
        return 'text-rose-400 bg-rose-950/60 border-rose-600/60';
      case 'CHECK':
        return 'text-blue-300 bg-blue-950/60 border-blue-600/60';
      case 'CALL':
        return 'text-emerald-300 bg-emerald-950/60 border-emerald-600/60';
      case 'BET':
      case 'RAISE':
      case 'ALL_IN':
        return 'text-amber-300 bg-amber-950/60 border-amber-500/60';
      default:
        return 'text-slate-300 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="w-full bg-slate-900/95 border border-slate-800 backdrop-blur-xl rounded-2xl p-4 shadow-xl flex flex-col gap-4 text-slate-200">
      {/* Header with Title & Quick Action buttons */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow-md">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span>AI 포커 코치 & 실시간 HUD</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                Gemini & GTO
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">승률 에쿼티, 팟 오즈 및 GTO 전략 실시간 코칭</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onRefreshCoachAdvice}
            disabled={isLoadingCoach}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
            title="코치 조언 새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCoach ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">분석 갱신</span>
          </button>
          <button
            type="button"
            onClick={onOpenChatModal}
            className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-semibold flex items-center gap-1 transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>코치에게 질문</span>
          </button>
        </div>
      </div>

      {/* Grid: Math / Equity Stats + Live Coach Recommendation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Mathematical Calculations (Equity / Pot Odds / Outs) */}
        <div className="flex flex-col gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Calculator className="w-3.5 h-3.5 text-indigo-400" />
              <span>실시간 핸드 상태:</span>
            </div>
            <span className="text-xs font-bold text-amber-300 font-mono">
              {equityData.handStrengthDesc}
            </span>
          </div>

          {/* Equity Gauge */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">승률 (Win Equity):</span>
              <span className="font-mono font-extrabold text-sm text-emerald-400">
                {equityData.winRate}% {equityData.tieRate > 0 && <span className="text-xs text-slate-400">({equityData.tieRate}% Split)</span>}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, equityData.winRate))}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          {/* Pot Odds vs Required Equity */}
          {toCall > 0 && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">필요 팟 오즈 (Pot Odds):</span>
                <span className="font-mono font-bold text-xs text-amber-300">
                  {equityData.potOdds}% 필요 (승률 {equityData.winRate}%)
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <div className="text-[11px] text-slate-400">EV 기대값 판정:</div>
                <div>{getEVBadge()}</div>
              </div>
            </div>
          )}

          {/* Outs & Draws */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-slate-400">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>아웃츠 (Outs):</span>
            </div>
            <div className="font-mono text-xs font-semibold text-slate-200">
              {equityData.outsCount > 0 ? (
                <span className="text-amber-400 font-bold">{equityData.outsCount} Outs</span>
              ) : (
                <span className="text-slate-400">0 Outs (메이드 완료)</span>
              )}
              {equityData.drawTypes.length > 0 && (
                <span className="text-[11px] text-slate-400 block text-right mt-0.5">
                  {equityData.drawTypes.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Strategic Coach Advice */}
        <div className="flex flex-col justify-between bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          {isLoadingCoach ? (
            <div className="h-full min-h-[130px] flex flex-col items-center justify-center text-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />
              <div className="text-xs text-slate-300 font-medium">
                Gemini 3.7 포커 마스터가 최적의 결정을 분석 중...
              </div>
              <div className="text-[10px] text-slate-500">포지션, 레인지 우위, 팟 오즈 및 SPR 종합 분석</div>
            </div>
          ) : coachAdvice ? (
            <div className="flex flex-col gap-2.5">
              {/* Action Banner */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">AI 추천 액션:</span>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-extrabold rounded-md border font-mono ${getActionColor(
                      coachAdvice.action
                    )}`}
                  >
                    {coachAdvice.action}{' '}
                    {coachAdvice.suggestedAmount ? `$${coachAdvice.suggestedAmount.toLocaleString()}` : ''}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  신뢰도: <span className="text-amber-400 font-bold">{coachAdvice.confidence}%</span>
                </span>
              </div>

              {/* Summary */}
              <p className="text-xs font-medium text-slate-200 leading-snug">
                {coachAdvice.summary}
              </p>

              {/* Reasoning points */}
              {coachAdvice.reasoning && coachAdvice.reasoning.length > 0 && (
                <ul className="flex flex-col gap-1 text-[11px] text-slate-400 list-disc list-inside">
                  {coachAdvice.reasoning.slice(0, 2).map((reason, idx) => (
                    <li key={idx} className="truncate">
                      {reason}
                    </li>
                  ))}
                </ul>
              )}

              {/* GTO Concept Pill */}
              {coachAdvice.gtoConcept && (
                <div className="mt-1 pt-1.5 border-t border-slate-800/80 text-[10px] text-indigo-300 font-mono flex items-center gap-1 truncate">
                  <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span className="truncate">{coachAdvice.gtoConcept}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[130px] flex flex-col items-center justify-center text-center gap-2 text-slate-400">
              <Brain className="w-6 h-6 text-slate-600" />
              <div className="text-xs font-medium">핸드 진행 시 AI 실시간 조언이 활성화됩니다.</div>
              <button
                type="button"
                onClick={onRefreshCoachAdvice}
                className="mt-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 font-semibold transition"
              >
                조언 요청하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
