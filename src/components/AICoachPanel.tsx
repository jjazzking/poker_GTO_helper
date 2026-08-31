import React, { useState } from 'react';
import { LiveEquityData, CoachAdvice } from '../types/poker';
import { Sparkles, Brain, Calculator, Target, RefreshCw, HelpCircle, Layers, CheckCircle2, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, Plus, Minus, Coins, Drama, Ban } from 'lucide-react';
import { PlayingCard } from './PlayingCard';
import { motion, AnimatePresence } from 'motion/react';

interface AICoachPanelProps {
  equityData: LiveEquityData;
  coachAdvice: CoachAdvice | null;
  isLoadingCoach: boolean;
  onRefreshCoachAdvice: () => void;
  onOpenChatModal: () => void;
  isChatOpen?: boolean;
  isHeroTurn: boolean;
  toCall: number;
  useFourColor?: boolean;
}

export const AICoachPanel: React.FC<AICoachPanelProps> = ({
  equityData,
  coachAdvice,
  isLoadingCoach,
  onRefreshCoachAdvice,
  onOpenChatModal,
  isChatOpen = false,
  isHeroTurn,
  toCall,
  useFourColor = true,
}) => {
  const [showAllOuts, setShowAllOuts] = useState<boolean>(true);
  const [showBluffDetail, setShowBluffDetail] = useState<boolean>(false);

  // Value hands want calls; bluffs want folds. Colouring them apart keeps the
  // two kinds of bet from reading as the same recommendation.
  const HAND_CLASS_STYLE: Record<string, string> = {
    value: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
    semi_bluff: 'bg-amber-500/15 text-amber-300 border-amber-400/40',
    pure_bluff: 'bg-rose-500/15 text-rose-300 border-rose-400/40',
    showdown_value: 'bg-sky-500/15 text-sky-300 border-sky-400/40',
  };

  const getEVBadge = () => {
    if (toCall === 0) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/40 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>체크 가능 (Free Card)</span>
        </span>
      );
    }
    if (equityData.isPositiveEV) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>+EV 기대값 우세 (수익적 콜)</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-400/40 flex items-center gap-1">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span>-EV 기대값 불리 (폴드 권장)</span>
      </span>
    );
  };

  const getActionColor = (action?: string) => {
    switch (action) {
      case 'FOLD':
        return 'text-rose-300 bg-rose-950/80 border-rose-600/80';
      case 'CHECK':
        return 'text-blue-200 bg-blue-950/80 border-blue-500/80';
      case 'CALL':
        return 'text-emerald-200 bg-emerald-950/80 border-emerald-500/80';
      case 'BET':
      case 'RAISE':
      case 'ALL_IN':
        return 'text-amber-200 bg-amber-950/80 border-amber-400/80';
      default:
        return 'text-slate-300 bg-slate-800 border-slate-700';
    }
  };

  const outsGroups = equityData.outsGroups || [];
  const hasMultipleGroups = outsGroups.length > 1;

  return (
    <div className="w-full bg-slate-900/95 border border-slate-800 backdrop-blur-xl rounded-3xl p-5 shadow-2xl flex flex-col gap-4 text-slate-200">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow-lg">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-100 tracking-tight">
                AI 포커 코치 & 실시간 HUD 분석
              </h3>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/40">
                Gemini 3.7 + Realtime Solver
              </span>
            </div>
            <p className="text-xs text-slate-400">
              실시간 승률 에쿼티, 팟 오즈 계산, 실제 이기는 아웃츠 카드 및 최적 GTO 추천
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefreshCoachAdvice}
            disabled={isLoadingCoach}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm cursor-pointer"
            title="코치 분석 즉시 갱신"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCoach ? 'animate-spin text-amber-400' : 'text-indigo-400'}`} />
            <span>{isLoadingCoach ? '분석 중...' : '분석 즉시 갱신'}</span>
          </button>
          <button
            type="button"
            onClick={onOpenChatModal}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition shadow-md cursor-pointer ${
              isChatOpen
                ? 'bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-300 border-indigo-500/50 shadow-indigo-900/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400/40 shadow-indigo-600/30'
            }`}
            title={isChatOpen ? '우측 AI 코치 패널 접기' : '우측에 AI 코치 Q&A 패널 열기'}
          >
            <HelpCircle className="w-4 h-4" />
            <span>{isChatOpen ? 'AI 코치 패널 접기' : 'AI 코치 질문 (우측 열기)'}</span>
          </button>
        </div>
      </div>

      {/* Main Spacious 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* Card 1: Hand Strength, Equity & Math Breakdown */}
        <div className="flex flex-col justify-start bg-slate-950/70 p-4 rounded-2xl border border-slate-800/90 gap-3">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <Calculator className="w-4 h-4 text-indigo-400" />
              <span>실시간 승률 & 기대값</span>
            </div>
            <span className="text-xs font-extrabold text-amber-300 font-mono px-2 py-0.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
              {equityData.handStrengthDesc}
            </span>
          </div>

          {/* Win Rate Bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">승률 (Win Equity):</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-base text-emerald-400">
                  {equityData.winRate}%
                </span>
                {equityData.tieRate > 0 && (
                  <span className="text-[11px] text-slate-400 font-mono">({equityData.tieRate}% Split)</span>
                )}
              </div>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex p-0.5 border border-slate-700/60">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-400 shadow-sm"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, equityData.winRate))}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Pot Odds & EV Judgment */}
          <div className="flex flex-col gap-1.5 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 text-xs">
            {toCall > 0 ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">필요 팟 오즈 (Pot Odds):</span>
                  <span className="font-mono font-bold text-amber-300">{equityData.potOdds}% 필요</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400">기대값 판정:</span>
                  <div>{getEVBadge()}</div>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">현재 베팅 상태:</span>
                <div>{getEVBadge()}</div>
              </div>
            )}
          </div>

          {/* Reason explanation text */}
          <div className="text-[11px] text-slate-300 leading-relaxed bg-indigo-950/30 p-2.5 rounded-xl border border-indigo-500/20">
            <span className="text-indigo-300 font-bold mr-1">💡 승률 분석:</span>
            {equityData.equityExplanation || '카드가 주어지면 핸드 우위와 상대 추정 레인지 대비 승률 이유를 안내합니다.'}
          </div>
        </div>

        {/* Card 2: Aiming Target Hands & Actual Winning Outs Cards */}
        <div className="flex flex-col justify-start bg-slate-950/70 p-4 rounded-2xl border border-slate-800/90 gap-3">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <Target className="w-4 h-4 text-amber-400" />
              <span>노리는 핸드 & 이기는 카드 (Outs)</span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasMultipleGroups && (
                <button
                  type="button"
                  onClick={() => setShowAllOuts(prev => !prev)}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                  title={showAllOuts ? '핸드 목록 축소' : '모든 목표 핸드 펼치기'}
                >
                  {showAllOuts ? (
                    <>
                      <Minus className="w-3 h-3 text-amber-400" />
                      <span>접기</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3 text-amber-400" />
                      <span>+{outsGroups.length}개 전체보기</span>
                    </>
                  )}
                </button>
              )}
              <div className="font-mono text-xs font-extrabold text-amber-400 px-2 py-0.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                {equityData.outsCount > 0 ? `${equityData.outsCount} Outs` : '메이드 완료'}
              </div>
            </div>
          </div>

          {/* Aiming Summary Banner (No truncate, Multi-line wrap, Distinct Goal Chips) */}
          <div className="text-xs font-medium text-amber-200 bg-amber-950/35 border border-amber-500/30 px-3 py-2 rounded-xl flex flex-col gap-1.5">
            <div className="flex items-start gap-2">
              <Layers className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed break-words whitespace-normal text-slate-200">
                {equityData.aimingHandSummary || '목표 핸드 분석 중...'}
              </div>
            </div>

            {/* If there are multiple outs groups, show individual pill tags that wrap cleanly */}
            {outsGroups.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-amber-500/20">
                {outsGroups.map((group, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-900/60 border border-amber-500/40 text-[11px] font-semibold text-amber-200"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>{group.targetKorean}</span>
                    <span className="text-amber-300/80 font-mono text-[10px]">({group.outsCount}장)</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actual Visual Cards for each Outs Group with expandable view */}
          <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[180px] pr-1">
            {outsGroups.length > 0 ? (
              (showAllOuts ? outsGroups : outsGroups.slice(0, 1)).map((group, gIdx) => (
                <motion.div
                  key={gIdx}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5 break-words">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <span>{group.targetHand}</span>
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300">
                      <span className="px-1.5 py-0.2 bg-slate-800 rounded text-amber-300 font-bold border border-slate-700">
                        {group.outsCount}장
                      </span>
                      <span className="text-slate-400">({group.nextStreetProb}% 확률)</span>
                    </div>
                  </div>

                  {/* Visual Mini Cards with automatic wrapping */}
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    {group.cards.map((card, cIdx) => (
                      <PlayingCard
                        key={cIdx}
                        card={card}
                        size="xs"
                        useFourColor={useFourColor}
                        animate={false}
                      />
                    ))}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="h-full min-h-[100px] flex flex-col items-center justify-center text-center p-3 text-slate-400 gap-1.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div className="text-xs font-semibold text-slate-300">
                  {equityData.outsCount === 0 ? '추가 드로우 불필요 (메이드 핸드)' : '아웃츠 없음'}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  현재 조합으로 쇼다운 경쟁력이 충분하거나 최종 보드가 완성되었습니다.
                </p>
              </div>
            )}
          </div>

          {/* Quick hit percentage summary */}
          {equityData.outsCount > 0 && (
            <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0">
              <span>다음 턴/리버 역전 확률:</span>
              <span className="text-emerald-400 font-bold">
                약 {Math.min(99, Math.round(equityData.outsCount * 2.1))}%
              </span>
            </div>
          )}
        </div>

        {/* Card 3: AI Strategy & GTO Recommendation */}
        <div className="flex flex-col justify-start bg-slate-950/70 p-4 rounded-2xl border border-slate-800/90 gap-3">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>GTO 솔버 & AI 전략 조언</span>
            </div>
            {coachAdvice && (
              <span className="text-xs font-mono text-slate-400">
                신뢰도: <span className="text-amber-400 font-bold">{coachAdvice.confidence}%</span>
              </span>
            )}
          </div>

          {isLoadingCoach ? (
            <div className="flex-1 min-h-[140px] flex flex-col items-center justify-center text-center gap-2">
              <Sparkles className="w-7 h-7 text-amber-400 animate-spin" />
              <div className="text-xs font-semibold text-slate-300">Gemini 3.7 실시간 최적 전략 연산 중...</div>
              <p className="text-[11px] text-slate-500">포지션, SPR, 상대 성향 및 레인지 우위 계산</p>
            </div>
          ) : coachAdvice ? (
            <div className="flex flex-col gap-2.5">
              {/* Action Banner - Always anchored right below header */}
              <div className="flex items-center justify-between bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800/80">
                <span className="text-xs text-slate-300 font-semibold">AI 추천 액션:</span>
                <span
                  className={`px-3 py-1 text-xs font-black rounded-xl border font-mono tracking-wide shadow ${getActionColor(
                    coachAdvice.action
                  )}`}
                >
                  {coachAdvice.action}
                  {coachAdvice.suggestedAmount ? (
                    <>
                      {' '}
                      ${coachAdvice.suggestedAmount.toLocaleString()}
                      {coachAdvice.suggestedAmountBB ? (
                        <span className="ml-1 opacity-80">({coachAdvice.suggestedAmountBB}BB)</span>
                      ) : null}
                    </>
                  ) : null}
                </span>
              </div>

              {/* Bet / raise sizing: what number to use and where it came from */}
              {coachAdvice.sizingLabel && (
                <div className="flex flex-col gap-1 bg-amber-950/25 border border-amber-500/25 px-2.5 py-2 rounded-xl">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-[11px] font-extrabold text-amber-200 break-words">
                      {coachAdvice.sizingLabel}
                    </span>
                    {typeof coachAdvice.potFraction === 'number' && coachAdvice.potFraction > 0 && (
                      <span className="text-[10px] font-mono text-amber-300/90 px-1.5 py-0.5 bg-amber-900/50 rounded border border-amber-500/30">
                        팟의 {Math.round(coachAdvice.potFraction * 100)}%
                      </span>
                    )}
                  </div>
                  {coachAdvice.sizingRationale && (
                    <p className="text-[10px] leading-snug text-slate-300 break-words">
                      {coachAdvice.sizingRationale}
                    </p>
                  )}
                </div>
              )}

              {/* Bluff analysis: what kind of bet this is, and whether the fold
                  equity behind it actually pays for it */}
              {coachAdvice.bluff && (
                <div className="flex flex-col gap-2 bg-slate-950/80 border border-slate-800 px-2.5 py-2 rounded-xl">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Drama className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-[11px] font-bold text-slate-300">블러프 분석</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${
                        HAND_CLASS_STYLE[coachAdvice.bluff.handClass] || 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {coachAdvice.bluff.handClassLabel}
                    </span>
                  </div>

                  {/* Fold equity against the break-even it has to clear */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-baseline text-[10px]">
                      <span className="text-slate-400">폴드 에쿼티</span>
                      <span className="font-mono">
                        <span
                          className={`font-black text-xs ${
                            coachAdvice.bluff.foldEquity >= coachAdvice.bluff.breakEvenFoldEquity
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {coachAdvice.bluff.foldEquity}%
                        </span>
                        <span className="text-slate-500"> / 손익분기 {coachAdvice.bluff.breakEvenFoldEquity}%</span>
                      </span>
                    </div>
                    <div className="relative w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                      <motion.div
                        className={`h-full rounded-full ${
                          coachAdvice.bluff.foldEquity >= coachAdvice.bluff.breakEvenFoldEquity
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : 'bg-gradient-to-r from-rose-600 to-rose-400'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.max(0, coachAdvice.bluff.foldEquity))}%` }}
                        transition={{ duration: 0.3 }}
                      />
                      {/* Break-even marker */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-100/80"
                        style={{ left: `${Math.min(100, Math.max(0, coachAdvice.bluff.breakEvenFoldEquity))}%` }}
                        title={`손익분기 ${coachAdvice.bluff.breakEvenFoldEquity}%`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="bg-slate-900/80 rounded-lg px-2 py-1 border border-slate-800">
                      <div className="text-slate-400">콜당할 때 승률</div>
                      <div className="font-mono font-bold text-slate-200">{coachAdvice.bluff.equityWhenCalled}%</div>
                    </div>
                    <div className="bg-slate-900/80 rounded-lg px-2 py-1 border border-slate-800">
                      <div className="text-slate-400">벳 EV vs 체크 EV</div>
                      <div className="font-mono font-bold">
                        <span className={coachAdvice.bluff.isProfitable ? 'text-emerald-400' : 'text-slate-300'}>
                          ${coachAdvice.bluff.bluffEV.toLocaleString()}
                        </span>
                        <span className="text-slate-500"> / </span>
                        <span className={coachAdvice.bluff.isProfitable ? 'text-slate-300' : 'text-emerald-400'}>
                          ${coachAdvice.bluff.checkEV.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowBluffDetail(prev => !prev)}
                    className="self-start text-[10px] text-indigo-300 hover:text-indigo-200 font-bold flex items-center gap-1 cursor-pointer transition"
                  >
                    {showBluffDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    <span>{showBluffDetail ? '근거 접기' : '블로커 · 상대 레인지 근거 보기'}</span>
                  </button>

                  {showBluffDetail && (
                    <div className="flex flex-col gap-1.5 text-[10px] leading-snug text-slate-300 border-t border-slate-800 pt-1.5">
                      <p className="break-words">{coachAdvice.bluff.handClassDetail}</p>
                      <p className="break-words flex items-start gap-1">
                        <Ban className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                        <span>{coachAdvice.bluff.blockerSummary}</span>
                      </p>
                      <p className="break-words text-slate-400">
                        <span className="text-slate-300 font-bold">상대 레인지 </span>
                        {coachAdvice.bluff.opponentRangeSummary}
                      </p>
                      <p className="text-[9px] text-slate-500 break-words">
                        모델 디펜스 {coachAdvice.bluff.modelDefenseFrequency}% vs 이론적 최소(MDF){' '}
                        {coachAdvice.bluff.minDefenseFrequency}%. 한 스트리트 기준 근사치이며 이후 스트리트 플레이는
                        반영하지 않습니다.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Summary with full wrapping */}
              <p className="text-xs font-medium text-slate-200 leading-relaxed bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 break-words">
                {coachAdvice.summary}
              </p>

              {/* Reasoning points */}
              {coachAdvice.reasoning && coachAdvice.reasoning.length > 0 && (
                <ul className="flex flex-col gap-1 text-[11px] text-slate-400 list-disc list-inside">
                  {coachAdvice.reasoning.slice(0, 2).map((reason, idx) => (
                    <li key={idx} className="leading-tight break-words">
                      {reason}
                    </li>
                  ))}
                </ul>
              )}

              {/* GTO Concept Pill (No truncate, wrap cleanly) */}
              {coachAdvice.gtoConcept && (
                <div className="pt-2 border-t border-slate-800/80 text-[10px] font-mono text-indigo-300 flex items-start gap-1.5 break-words">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{coachAdvice.gtoConcept}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-[140px] flex flex-col items-center justify-center text-center gap-2 text-slate-400">
              <Brain className="w-7 h-7 text-slate-600" />
              <div className="text-xs font-semibold text-slate-300">핸드 진행 시 실시간 전략이 가동됩니다.</div>
              <button
                type="button"
                onClick={onRefreshCoachAdvice}
                className="mt-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 font-bold transition cursor-pointer"
              >
                전략 조언 요청
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
