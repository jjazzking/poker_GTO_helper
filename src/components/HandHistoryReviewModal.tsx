import React, { useState, useEffect } from 'react';
import { HandHistoryItem } from '../types/poker';
import { PlayingCard } from './PlayingCard';
import { X, Sparkles, Award, AlertTriangle, CheckCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { generateClientHandReview } from '../lib/gtoSolver';

interface HandHistoryReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  handHistory: HandHistoryItem | null;
  useFourColor: boolean;
}

interface AIAnalysisResult {
  grade: string;
  summary: string;
  strengths: string[];
  leaks: string[];
  gtoAdvice: string;
}

export const HandHistoryReviewModal: React.FC<HandHistoryReviewModalProps> = ({
  isOpen,
  onClose,
  handHistory,
  useFourColor,
}) => {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchAIAnalysis = async () => {
    if (!handHistory) return;
    setIsLoading(true);

    try {
      const response = await fetch('/api/poker/analyze-hand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handHistory }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      } else {
        const fallback = generateClientHandReview(handHistory);
        setAnalysis(fallback);
      }
    } catch {
      const fallback = generateClientHandReview(handHistory);
      setAnalysis(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && handHistory) {
      fetchAIAnalysis();
    }
  }, [isOpen, handHistory?.id]);

  if (!isOpen || !handHistory) return null;

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'from-emerald-500 to-teal-400 text-slate-950 border-emerald-300';
    if (grade.startsWith('B')) return 'from-blue-500 to-indigo-400 text-white border-blue-300';
    if (grade.startsWith('C')) return 'from-amber-500 to-yellow-400 text-slate-950 border-amber-300';
    return 'from-rose-600 to-rose-500 text-white border-rose-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>핸드 #{handHistory.handNumber} AI 복기 & 릭 분석</span>
              </h3>
              <p className="text-xs text-slate-400">
                Gemini 3.7 솔버 엔진 기반 스트리트별 의사결정 평가
              </p>
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Hand Overview Banner */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            {/* Hero Cards & Position */}
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <PlayingCard card={handHistory.heroCards[0]} size="sm" useFourColor={useFourColor} />
                <PlayingCard card={handHistory.heroCards[1]} size="sm" useFourColor={useFourColor} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400">Hero 포지션</span>
                <span className="text-sm font-bold text-amber-400 font-mono">
                  {handHistory.heroPosition}
                </span>
              </div>
            </div>

            {/* Community Board Cards */}
            <div className="flex flex-col items-center">
              <span className="text-xs text-slate-400 mb-1">커뮤니티 보드</span>
              <div className="flex gap-1">
                {handHistory.communityCards.map((card, i) => (
                  <PlayingCard key={i} card={card} size="xs" useFourColor={useFourColor} />
                ))}
              </div>
            </div>

            {/* Result / Net Chips */}
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-400">결과 수익</span>
              <span
                className={`text-base font-extrabold font-mono ${
                  handHistory.netChips >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {handHistory.netChips >= 0 ? `+$${handHistory.netChips}` : `-$${Math.abs(handHistory.netChips)}`}
              </span>
            </div>
          </div>

          {/* AI Analysis Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-200">
                <Award className="w-4 h-4 text-amber-400" />
                <span>AI 코치 종합 평가</span>
              </div>
              <button
                type="button"
                onClick={fetchAIAnalysis}
                disabled={isLoading}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>다시 분석</span>
              </button>
            </div>

            {isLoading ? (
              <div className="p-8 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2 text-center">
                <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />
                <span className="text-xs text-slate-300 font-medium">핸드 액션을 정밀 분석하는 중...</span>
              </div>
            ) : analysis ? (
              <div className="flex flex-col gap-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                {/* Grade & Summary */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${getGradeColor(
                      analysis.grade
                    )} flex items-center justify-center font-black text-xl shadow-lg border shrink-0`}
                  >
                    {analysis.grade}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">{analysis.summary}</h4>
                  </div>
                </div>

                {/* Strengths & Leaks Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                  {/* Strengths */}
                  <div className="bg-emerald-950/30 p-3 rounded-lg border border-emerald-500/30 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>잘한 플레이 (Strengths)</span>
                    </div>
                    <ul className="text-[11px] text-slate-300 list-disc list-inside flex flex-col gap-1">
                      {analysis.strengths.map((str, idx) => (
                        <li key={idx}>{str}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Leaks */}
                  <div className="bg-amber-950/30 p-3 rounded-lg border border-amber-500/30 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>개선할 점 (Leaks)</span>
                    </div>
                    <ul className="text-[11px] text-slate-300 list-disc list-inside flex flex-col gap-1">
                      {analysis.leaks.map((leak, idx) => (
                        <li key={idx}>{leak}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* GTO Solver Advice */}
                {analysis.gtoAdvice && (
                  <div className="p-3 bg-indigo-950/40 rounded-lg border border-indigo-500/30 flex items-start gap-2 text-xs text-indigo-200">
                    <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-indigo-300 block mb-0.5">GTO 솔버 전략 팁:</strong>
                      <span>{analysis.gtoAdvice}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Action Log History */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-300">스트리트별 액션 기록</span>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5 text-xs font-mono max-h-48 overflow-y-auto">
              {handHistory.actions.map((act, i) => (
                <div key={i} className="flex items-center justify-between text-slate-300 py-0.5 border-b border-slate-900">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 uppercase w-14">[{act.street}]</span>
                    <span className="font-semibold text-slate-200">{act.playerName}:</span>
                    <span className="text-amber-300 font-bold uppercase">{act.action}</span>
                  </div>
                  {act.amount > 0 && <span className="text-slate-400">${act.amount}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
          >
            닫기
          </button>
        </div>
      </motion.div>
    </div>
  );
};
