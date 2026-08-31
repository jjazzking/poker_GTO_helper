import React, { useState } from 'react';
import { DRILL_QUESTIONS } from '../lib/drillsData';
import { DrillQuestion } from '../types/poker';
import { PlayingCard } from './PlayingCard';
import { Award, BookOpen, CheckCircle, XCircle, ChevronRight, RotateCcw, Target, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export const DrillMode: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [totalAnswered, setTotalAnswered] = useState<number>(0);

  const filteredQuestions =
    selectedCategory === 'all'
      ? DRILL_QUESTIONS
      : DRILL_QUESTIONS.filter(q => q.category === selectedCategory);

  const currentQuestion: DrillQuestion =
    filteredQuestions[currentIndex % filteredQuestions.length] || DRILL_QUESTIONS[0];

  const handleSelectOption = (optionId: string) => {
    if (isAnswerSubmitted) return;
    setSelectedOptionId(optionId);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOptionId || isAnswerSubmitted) return;

    const chosenOption = currentQuestion.options.find(o => o.id === selectedOptionId);
    if (chosenOption?.isCorrect) {
      setScore(prev => prev + 1);
    }
    setTotalAnswered(prev => prev + 1);
    setIsAnswerSubmitted(true);
  };

  const handleNextQuestion = () => {
    setSelectedOptionId(null);
    setIsAnswerSubmitted(false);
    setCurrentIndex(prev => (prev + 1) % filteredQuestions.length);
  };

  const handleResetDrills = () => {
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setTotalAnswered(0);
  };

  const chosenOption = currentQuestion.options.find(o => o.id === selectedOptionId);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 text-slate-100">
      {/* Header & Stats Banner */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white shadow-md">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-100">
              홀덤 실전 트레이닝 & 포커 수학 드릴
            </h2>
            <p className="text-xs text-slate-400">
              팟 오즈, 에쿼티 계산, 아웃츠 카운팅, 블러프 캐칭 등 필수 상황별 집중 훈련
            </p>
          </div>
        </div>

        {/* Score Counter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs">
            <Award className="w-4 h-4 text-amber-400" />
            <span>정답:</span>
            <span className="font-bold text-amber-400">
              {score} / {totalAnswered}{' '}
              {totalAnswered > 0 && `(${Math.round((score / totalAnswered) * 100)}%)`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleResetDrills}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-700 transition"
            title="기록 초기화"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'all', label: '전체 문제' },
          { id: 'pot_odds', label: '팟 오즈 & EV 계산' },
          { id: 'preflop', label: '프리플랍 포지션 판단' },
          { id: 'outs', label: '아웃츠 & 드로우' },
          { id: 'bluff_catching', label: '리버 블러프 캐칭' },
        ].map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setSelectedCategory(cat.id);
              setCurrentIndex(0);
              setSelectedOptionId(null);
              setIsAnswerSubmitted(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-md border border-indigo-400'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Question Card */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
        {/* Question Title & Meta Info */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 font-mono font-bold text-xs rounded-full border border-indigo-500/30">
              문제 {currentIndex + 1} / {filteredQuestions.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              포지션: <strong className="text-slate-200 font-mono">{currentQuestion.position}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400">
              팟: <strong className="text-amber-400">${currentQuestion.potSize}</strong>
            </span>
            {currentQuestion.toCall > 0 && (
              <span className="text-slate-400">
                콜 요구액: <strong className="text-emerald-400">${currentQuestion.toCall}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Visual Cards Display Area */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 bg-slate-950/80 p-5 rounded-2xl border border-slate-800/80">
          {/* Hole Cards */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-semibold uppercase">내 핸드 (Hole Cards)</span>
            <div className="flex gap-2">
              <PlayingCard card={currentQuestion.holeCards[0]} size="lg" />
              <PlayingCard card={currentQuestion.holeCards[1]} size="lg" />
            </div>
          </div>

          {/* Community Cards if present */}
          {currentQuestion.communityCards && currentQuestion.communityCards.length > 0 && (
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">보드 (Board)</span>
              <div className="flex gap-1.5">
                {currentQuestion.communityCards.map((card, i) => (
                  <PlayingCard key={i} card={card} size="md" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Scenario Text */}
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-bold text-slate-100">{currentQuestion.title}</h3>
          <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            {currentQuestion.scenario}
          </p>
        </div>

        {/* Options List */}
        <div className="flex flex-col gap-3">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedOptionId === option.id;
            let optionStyle = 'bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-200';

            if (isAnswerSubmitted) {
              if (option.isCorrect) {
                optionStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-100 ring-2 ring-emerald-500/50';
              } else if (isSelected && !option.isCorrect) {
                optionStyle = 'bg-rose-950/80 border-rose-500 text-rose-100 ring-2 ring-rose-500/50';
              } else {
                optionStyle = 'bg-slate-900 border-slate-800 text-slate-500 opacity-60';
              }
            } else if (isSelected) {
              optionStyle = 'bg-indigo-900/60 border-indigo-400 text-white ring-2 ring-indigo-400/50';
            }

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelectOption(option.id)}
                disabled={isAnswerSubmitted}
                className={`p-4 rounded-xl border text-left text-sm font-medium transition flex items-start gap-3 ${optionStyle}`}
              >
                <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <span>{option.text}</span>
                  {isAnswerSubmitted && option.explanation && (
                    <span className="text-xs text-slate-400 mt-1 block">
                      {option.explanation}
                    </span>
                  )}
                </div>
                {isAnswerSubmitted && option.isCorrect && (
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                {isAnswerSubmitted && isSelected && !option.isCorrect && (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Submit or Next Button */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="text-xs text-slate-500">
            {!isAnswerSubmitted
              ? '원하는 정답을 선택한 후 [정답 제출]을 누르세요.'
              : chosenOption?.isCorrect
              ? '🎉 훌륭합니다! 정답을 맞췄습니다.'
              : '❌ 아쉽습니다! 하단 해설을 확인해보세요.'}
          </div>

          {!isAnswerSubmitted ? (
            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={!selectedOptionId}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              정답 제출
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold text-sm shadow-lg flex items-center gap-1.5 transition"
            >
              <span>다음 드릴 문제</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Deep Explanation Box when answer submitted */}
        {isAnswerSubmitted && currentQuestion.deepExplanation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col gap-1.5 text-xs text-indigo-200"
          >
            <div className="flex items-center gap-1.5 font-bold text-indigo-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>포커 마스터 심층 해설 & 수학적 원리:</span>
            </div>
            <p className="leading-relaxed whitespace-pre-line text-slate-300">
              {currentQuestion.deepExplanation}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
