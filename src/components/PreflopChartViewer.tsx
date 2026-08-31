import React, { useState } from 'react';
import { Position } from '../types/poker';
import { generateHandMatrix, POSITION_RANGES, MatrixCell, RangeAction } from '../lib/preflopRanges';
import { Grid, Sparkles, CheckCircle2, XCircle, Info, Layers } from 'lucide-react';
import { motion } from 'motion/react';

export const PreflopChartViewer: React.FC = () => {
  const [selectedPosition, setSelectedPosition] = useState<Position>('BTN');
  const [selectedCell, setSelectedCell] = useState<MatrixCell | null>(null);

  // Quiz state
  const [isQuizMode, setIsQuizMode] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });
  const [quizQuestion, setQuizQuestion] = useState<{ position: Position; combo: string } | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);

  const matrix = generateHandMatrix();
  const currentRangeData = POSITION_RANGES[selectedPosition];

  const getActionForCombo = (combo: string): RangeAction => {
    return currentRangeData.recommendedActionMap[combo] || 'fold';
  };

  const getCellBgColor = (action: RangeAction, type: 'pair' | 'suited' | 'offsuit') => {
    switch (action) {
      case 'three_bet':
        return 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black';
      case 'raise':
        return 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold';
      case 'call':
        return 'bg-blue-600 hover:bg-blue-500 text-white font-bold';
      case 'fold':
      default:
        if (type === 'pair') return 'bg-slate-800/90 hover:bg-slate-700 text-slate-400 font-medium';
        if (type === 'suited') return 'bg-slate-850 hover:bg-slate-750 text-slate-500 font-normal';
        return 'bg-slate-900 hover:bg-slate-800 text-slate-600 font-normal';
    }
  };

  // Generate random quiz question
  const nextQuizQuestion = () => {
    const positions: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    const randomPos = positions[Math.floor(Math.random() * positions.length)];
    const flatMatrix = matrix.flat();
    const randomCell = flatMatrix[Math.floor(Math.random() * flatMatrix.length)];

    setQuizQuestion({
      position: randomPos,
      combo: randomCell.combo,
    });
    setQuizFeedback(null);
  };

  const handleQuizAnswer = (userAction: 'raise' | 'call' | 'fold') => {
    if (!quizQuestion) return;

    const range = POSITION_RANGES[quizQuestion.position];
    const correctAction = range.recommendedActionMap[quizQuestion.combo] || 'fold';

    const isCorrect =
      (userAction === 'raise' && (correctAction === 'raise' || correctAction === 'three_bet')) ||
      (userAction === 'call' && correctAction === 'call') ||
      (userAction === 'fold' && correctAction === 'fold');

    setQuizScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    setQuizFeedback({
      isCorrect,
      message: isCorrect
        ? `정답입니다! ${quizQuestion.position} 포지션에서 ${quizQuestion.combo}는 표준 ${correctAction.toUpperCase()} 핸드입니다.`
        : `오답입니다! ${quizQuestion.position} 포지션에서 ${quizQuestion.combo}의 GTO 정답은 [${correctAction.toUpperCase()}]입니다.`,
    });
  };

  const positionsList: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 text-slate-100">
      {/* Header & Mode Switcher */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-100">
                GTO 프리플랍 레인지 차트 & 13x13 핸드 매트릭스
              </h2>
              <p className="text-xs text-slate-400">
                6-Max 기준 각 포지션별(UTG, HJ, CO, BTN, SB, BB) 수학적 최적 오픈/방어 레인지 분석
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsQuizMode(!isQuizMode);
              if (!isQuizMode && !quizQuestion) {
                nextQuizQuestion();
              }
            }}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
              isQuizMode
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-amber-500/20'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isQuizMode ? '차트 보기로 전환' : '레인지 암기 퀴즈 풀기'}</span>
          </button>
        </div>
      </div>

      {isQuizMode ? (
        /* Quiz Trainer Section */
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center gap-6">
          <div className="flex items-center justify-between w-full border-b border-slate-800 pb-3 text-xs text-slate-400">
            <span>프리플랍 레인지 트레이닝 퀴즈</span>
            <span className="font-mono font-bold text-amber-400">
              정답률: {quizScore.correct} / {quizScore.total}{' '}
              {quizScore.total > 0 && `(${Math.round((quizScore.correct / quizScore.total) * 100)}%)`}
            </span>
          </div>

          {quizQuestion && (
            <div className="flex flex-col items-center gap-4 my-4">
              <div className="text-xs text-slate-400">당신의 포지션:</div>
              <div className="px-4 py-1.5 bg-indigo-600 text-white font-black text-lg rounded-xl border border-indigo-400 shadow-md">
                {quizQuestion.position} ({POSITION_RANGES[quizQuestion.position].nameKorean})
              </div>

              <div className="text-xs text-slate-400 mt-2">받은 핸드 콤보:</div>
              <div className="px-6 py-3 bg-slate-950 font-mono text-3xl font-extrabold text-amber-300 rounded-2xl border border-amber-400/40 shadow-inner">
                {quizQuestion.combo}
              </div>

              <p className="text-xs text-slate-300 max-w-md">
                이 포지션에서 첫 번째 액션(또는 BB 방어)으로 올바른 GTO 선택은 무엇일까요?
              </p>

              {/* Quiz Buttons */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-md mt-2">
                <button
                  type="button"
                  onClick={() => handleQuizAnswer('raise')}
                  disabled={Boolean(quizFeedback)}
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition disabled:opacity-50"
                >
                  오픈 레이즈 (Raise)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuizAnswer('call')}
                  disabled={Boolean(quizFeedback)}
                  className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition disabled:opacity-50"
                >
                  콜 / 림프 (Call)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuizAnswer('fold')}
                  disabled={Boolean(quizFeedback)}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-sm border border-slate-700 transition disabled:opacity-50"
                >
                  폴드 (Fold)
                </button>
              </div>

              {/* Feedback */}
              {quizFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 p-4 rounded-xl border flex flex-col items-center gap-2 max-w-lg w-full ${
                    quizFeedback.isCorrect
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                      : 'bg-rose-950/60 border-rose-500 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {quizFeedback.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                    <span>{quizFeedback.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={nextQuizQuestion}
                    className="mt-2 px-5 py-1.5 bg-amber-500 text-slate-950 font-extrabold text-xs rounded-lg shadow-md hover:bg-amber-400 transition"
                  >
                    다음 문제 풀기
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Standard 13x13 Grid Matrix View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 13x13 Matrix Grid (2 columns on large screen) */}
          <div className="lg:col-span-2 bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-4">
            {/* Position Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-3">
              {positionsList.map(pos => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setSelectedPosition(pos)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    selectedPosition === pos
                      ? 'bg-indigo-600 text-white shadow-md border border-indigo-400'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
                >
                  <span>{pos}</span>
                  <span className="text-[10px] opacity-75 font-mono">
                    {POSITION_RANGES[pos].openFrequency}%
                  </span>
                </button>
              ))}
            </div>

            {/* Matrix Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-3.5 h-3.5 rounded bg-emerald-600 border border-emerald-400" />
                  <span className="text-slate-300">오픈 레이즈 (Open Raise)</span>
                </div>
                {selectedPosition === 'BB' && (
                  <div className="flex items-center gap-1">
                    <div className="w-3.5 h-3.5 rounded bg-blue-600 border border-blue-400" />
                    <span className="text-slate-300">디펜스 콜 (Defend Call)</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <div className="w-3.5 h-3.5 rounded bg-amber-500 border border-amber-300" />
                  <span className="text-slate-300">3-Bet</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3.5 h-3.5 rounded bg-slate-800 border border-slate-700" />
                  <span className="text-slate-400">폴드 (Fold)</span>
                </div>
              </div>

              <span className="text-[11px] text-slate-400">
                대각선: 페어 | 우상단: 수딧(s) | 좌하단: 옵수딧(o)
              </span>
            </div>

            {/* 13x13 Grid Table */}
            <div className="w-full overflow-x-auto">
              <div className="grid grid-cols-13 gap-0.5 sm:gap-1 min-w-[500px] select-none">
                {matrix.map((row, rIdx) =>
                  row.map((cell, cIdx) => {
                    const action = getActionForCombo(cell.combo);
                    const isSelected = selectedCell?.combo === cell.combo;
                    const colorClass = getCellBgColor(action, cell.type);

                    return (
                      <button
                        key={`${rIdx}_${cIdx}`}
                        type="button"
                        onClick={() => setSelectedCell(cell)}
                        className={`aspect-square flex items-center justify-center rounded text-[10px] sm:text-xs font-mono transition transform hover:scale-110 hover:z-20 cursor-pointer shadow-sm ${colorClass} ${
                          isSelected ? 'ring-2 ring-white z-10 scale-105' : ''
                        }`}
                        title={`${cell.combo} (${action.toUpperCase()})`}
                      >
                        {cell.combo}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Details & Strategic Guide for Selected Position */}
          <div className="flex flex-col gap-4">
            {/* Position Overview Card */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-indigo-400">
                  {currentRangeData.position} POSITION
                </span>
                <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full font-mono font-bold border border-emerald-400/30">
                  오픈 빈도: 약 {currentRangeData.openFrequency}%
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-100">
                {currentRangeData.nameKorean}
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed">
                {currentRangeData.description}
              </p>
            </div>

            {/* Hand Detail Inspector */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Info className="w-4 h-4 text-amber-400" />
                <span>선택 핸드 분석:</span>
              </div>

              {selectedCell ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="font-mono text-xl font-extrabold text-amber-400">
                      {selectedCell.combo}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-extrabold font-mono uppercase ${
                        getActionForCombo(selectedCell.combo) === 'raise'
                          ? 'bg-emerald-600 text-white'
                          : getActionForCombo(selectedCell.combo) === 'three_bet'
                          ? 'bg-amber-500 text-slate-950'
                          : getActionForCombo(selectedCell.combo) === 'call'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {getActionForCombo(selectedCell.combo)}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 flex flex-col gap-1 mt-1">
                    <div>
                      핸드 유형:{' '}
                      <span className="text-slate-200 font-semibold">
                        {selectedCell.type === 'pair'
                          ? '포켓 페어 (Pocket Pair)'
                          : selectedCell.type === 'suited'
                          ? '동일 문양 (Suited)'
                          : '서로 다른 문양 (Offsuit)'}
                      </span>
                    </div>
                    <div>
                      GTO 추천:{' '}
                      <span className="text-slate-200 font-semibold">
                        {getActionForCombo(selectedCell.combo) === 'raise'
                          ? '표준 2.5BB 오픈 레이즈'
                          : getActionForCombo(selectedCell.combo) === 'three_bet'
                          ? '강력한 3-Bet 리레이즈 밸류 핸드'
                          : getActionForCombo(selectedCell.combo) === 'call'
                          ? '팟 오즈 기반 디펜스 콜'
                          : '기대값(-EV)이 낮아 안전한 폴드 권장'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-4 text-center">
                  좌측 매트릭스에서 원하는 핸드(예: AKs, 88, QTo)를 클릭하면 상세 분석이 표시됩니다.
                </div>
              )}
            </div>

            {/* Quick Strategy Cheat-Sheet */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>포지션별 핵심 원칙 (Rule of Thumb)</span>
              </div>
              <ul className="flex flex-col gap-1.5 text-slate-400 list-disc list-inside">
                <li>
                  <strong className="text-slate-200">포지션 우위:</strong> 뒤쪽 포지션일수록 더 넓은 핸드로 오픈할 수 있습니다.
                </li>
                <li>
                  <strong className="text-slate-200">수딧 커넥터:</strong> 76s, 87s, 98s 등은 스트레이트 및 플러시 완성 시 큰 팟을 이길 수 있어 컷오프/버튼에서 매우 유용합니다.
                </li>
                <li>
                  <strong className="text-slate-200">옵수딧 에이스 주의:</strong> A9o, A8o 등은 UTG에서 플레이하면 도미네이트되어 큰 손실을 초래합니다.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
