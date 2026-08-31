import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles, Trash2, HelpCircle, MessageSquare, ArrowRight, CornerDownLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { generateClientChatReply } from '../lib/gtoSolver';
import { Card } from '../types/poker';
import { PlayingCard } from './PlayingCard';

interface LiveGameContext {
  heroCards?: Card[];
  communityCards?: Card[];
  potSize?: number;
  currentBet?: number;
  toCall?: number;
  position?: string;
  street?: string;
  heroChips?: number;
  winRate?: number;
  handStrengthDesc?: string;
  aimingHandSummary?: string;
  outsCount?: number;
}

interface CoachChatModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  gameContext?: LiveGameContext;
  useFourColor?: boolean;
}

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  source?: string;
}

const QUICK_PROMPTS = [
  '현재 내 상황에서 최선의 액션과 근거는?',
  '플랍 C-Bet 사이즈와 빈도는 어떻게 정하나요?',
  '팟 오즈와 4/2의 법칙 계산법을 쉽게 설명해줘',
  'SPR(Stack-to-Pot Ratio) 개념과 활용법은?',
  '어그레시브한 상대(LAG) 상대법은?',
  '프리플랍 3-Bet 레인지 구성 원리는?',
];

export const CoachChatModal: React.FC<CoachChatModalProps> = ({
  isOpen = true,
  onClose,
  gameContext,
  useFourColor = true,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      content:
        '안녕하세요! 저는 텍사스 홀덤 전문 **AI 포커 코치(Poker Master)**입니다. Gemini 3.7 / 2.5 Flash 모델과 실시간 GTO 솔버 지식을 바탕으로 플레이 중인 판세를 분석하고 질문에 답변해 드립니다. 왼쪽 테이블을 플레이하시면서 무엇이든 실시간으로 질문해보세요!',
      timestamp: Date.now(),
      source: 'Gemini Flash API',
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/poker/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          chatHistory: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          gameContext,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [
          ...prev,
          {
            role: 'model',
            content: data.reply || generateClientChatReply(text),
            timestamp: Date.now(),
            source: data.source || 'Gemini Flash API',
          },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'model',
            content: generateClientChatReply(text),
            timestamp: Date.now(),
            source: 'GTO Solver Knowledge Base',
          },
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          content: generateClientChatReply(text),
          timestamp: Date.now(),
          source: 'GTO Solver Knowledge Base',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormattedText = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 text-xs leading-relaxed break-words">
        {lines.map((line, lIdx) => {
          if (line.startsWith('### ')) {
            return (
              <h4 key={lIdx} className="font-extrabold text-sm text-amber-300 mt-2 mb-1">
                {line.replace('### ', '')}
              </h4>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h3 key={lIdx} className="font-extrabold text-base text-amber-300 mt-2 mb-1">
                {line.replace('## ', '')}
              </h3>
            );
          }
          if (line.startsWith('- ') || line.startsWith('* ')) {
            const itemText = line.substring(2);
            return (
              <div key={lIdx} className="flex items-start gap-1.5 ml-1">
                <span className="text-amber-400 font-bold">•</span>
                <span>{formatBoldText(itemText)}</span>
              </div>
            );
          }
          if (/^\d+\.\s/.test(line)) {
            const match = line.match(/^(\d+)\.\s(.*)$/);
            return (
              <div key={lIdx} className="flex items-start gap-1.5 ml-1">
                <span className="font-bold text-amber-400 font-mono">{match ? match[1] : '•'}.</span>
                <span>{formatBoldText(match ? match[2] : line)}</span>
              </div>
            );
          }
          if (!line.trim()) {
            return <div key={lIdx} className="h-1" />;
          }
          return <p key={lIdx}>{formatBoldText(line)}</p>;
        })}
      </div>
    );
  };

  const formatBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pIdx} className="text-amber-300 font-extrabold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  if (!isOpen) return null;

  const hasLiveHand = gameContext && gameContext.heroCards && gameContext.heroCards.length === 2;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
      className="w-full h-full min-h-[580px] max-h-[calc(100vh-100px)] bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col text-slate-100 overflow-hidden"
    >
      {/* Header Bar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow-lg">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-black text-slate-100">AI 포커 코치 실시간 Q&A</h3>
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full font-mono border border-emerald-500/40 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Gemini API
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400">
              게임 화면과 동시에 실시간 전략 질의응답
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              setMessages([
                {
                  role: 'model',
                  content: '대화가 초기화되었습니다. 새로운 질문을 입력해주세요!',
                  timestamp: Date.now(),
                  source: 'Gemini Flash API',
                },
              ])
            }
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            title="대화 초기화"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="코치 창 닫기"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Live Hand Snapshot Mini-Banner (if in active game) */}
      {hasLiveHand && (
        <div className="p-2.5 sm:p-3 bg-slate-950/70 border-b border-indigo-500/20 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {gameContext.heroCards?.map((c, i) => (
                <PlayingCard key={i} card={c} size="xs" useFourColor={useFourColor} animate={false} />
              ))}
            </div>
            <div className="flex flex-col text-[11px]">
              <div className="font-bold text-slate-200 flex items-center gap-1">
                <span className="text-amber-400 font-mono">[{gameContext.position}]</span>
                <span className="truncate max-w-[120px] sm:max-w-[150px]">{gameContext.handStrengthDesc || '핸드 진행 중'}</span>
              </div>
              <span className="text-slate-400 font-mono text-[10px]">
                에쿼티 {gameContext.winRate}% | 팟 ${gameContext.potSize?.toLocaleString()}
                {gameContext.toCall && gameContext.toCall > 0 ? ` | 콜 $${gameContext.toCall}` : ''}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSendMessage('현재 내 핸드와 판세에서 최선의 액션과 근거를 알려줘')}
            disabled={isLoading}
            className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 text-white text-[10px] sm:text-[11px] font-bold shrink-0 transition flex items-center gap-1 shadow cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>현재 판세 질문</span>
          </button>
        </div>
      )}

      {/* Quick Questions Horizontal Carousel */}
      <div className="px-3 py-2 bg-slate-950/50 border-b border-slate-800/80 overflow-x-auto flex items-center gap-1.5 shrink-0 scrollbar-none">
        <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0 flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-amber-400" />
          추천 질문:
        </span>
        {QUICK_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[10px] sm:text-[11px] border border-slate-700 whitespace-nowrap transition disabled:opacity-50 cursor-pointer shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Body */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-3">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 ${
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gradient-to-tr from-amber-500 to-indigo-600 text-white'
              }`}
            >
              {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            <div
              className={`max-w-[88%] p-3 sm:p-3.5 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-950/85 border border-slate-800 text-slate-200 rounded-tl-none shadow-lg'
              }`}
            >
              {renderFormattedText(msg.content)}

              {msg.role === 'model' && msg.source && (
                <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                    <span>{msg.source}</span>
                  </span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            </div>
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl rounded-tl-none text-xs text-slate-300 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>AI 포커 코치가 최적 전략을 분석 중입니다...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 sm:p-3.5 border-t border-slate-800 bg-slate-950/90 flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="포커 질문, 현재 핸드 액션 질문 등을 입력하세요..."
            disabled={isLoading}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 sm:py-2.5 text-xs text-slate-100 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition"
          />
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="p-2 sm:p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition shadow cursor-pointer shrink-0"
            title="전송"
          >
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
