import React from 'react';
import { AppViewMode } from '../types/poker';
import { LayoutGrid, Users, User, BookOpen, Grid, MessageSquareText, BarChart3, Volume2, VolumeX, Palette, Sparkles, Coins } from 'lucide-react';

interface NavbarProps {
  currentView: AppViewMode;
  onSelectView: (view: AppViewMode) => void;
  soundMuted: boolean;
  onToggleSound: () => void;
  useFourColor: boolean;
  onToggleFourColor: () => void;
  onOpenStats: () => void;
  heroChips: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  soundMuted,
  onToggleSound,
  useFourColor,
  onToggleFourColor,
  onOpenStats,
  heroChips,
}) => {
  const navItems: { id: AppViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'table', label: '6-Max 실전 테이블', icon: <Users className="w-4 h-4" /> },
    { id: 'headsup', label: '1:1 헤즈업 대전', icon: <User className="w-4 h-4" /> },
    { id: 'drills', label: '포커 드릴 & 퀴즈', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'range_chart', label: '프리플랍 차트', icon: <Grid className="w-4 h-4" /> },
    { id: 'coach_chat', label: 'AI 코치 Q&A', icon: <MessageSquareText className="w-4 h-4" /> },
  ];

  return (
    <header className="w-full bg-slate-900/95 border-b border-slate-800 backdrop-blur-xl sticky top-0 z-40 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-lg font-black text-sm">
            ♠A
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-extrabold text-white tracking-tight">
                AI 텍사스 홀덤 트레이너
              </h1>
              <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 rounded border border-amber-400/30">
                PRO GTO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              다양한 성향의 AI 봇과 실시간 에쿼티 & 코칭 시스템
            </p>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 overflow-x-auto max-w-full">
          {navItems.map(item => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Tools & Balance */}
        <div className="flex items-center gap-2">
          {/* User Chips Counter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs font-bold text-amber-400 shadow-inner">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>${heroChips.toLocaleString()}</span>
          </div>

          {/* 4-Color Deck Toggle */}
          <button
            type="button"
            onClick={onToggleFourColor}
            className={`p-2 rounded-xl border text-xs font-medium transition ${
              useFourColor
                ? 'bg-slate-800 text-emerald-400 border-slate-700'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
            title={useFourColor ? '4색 덱 사용중 (흑/적/청/녹)' : '2색 덱 사용중 (흑/적)'}
          >
            <Palette className="w-4 h-4" />
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={onToggleSound}
            className={`p-2 rounded-xl border text-xs font-medium transition ${
              !soundMuted
                ? 'bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
            title={soundMuted ? '음소거 해제' : '음소거'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Stats Modal Trigger */}
          <button
            type="button"
            onClick={onOpenStats}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition"
            title="세션 통계 & 릭 분석"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
