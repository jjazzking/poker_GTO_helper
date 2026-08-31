import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles, Trash2, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { generateClientChatReply } from '../lib/gtoSolver';

interface CoachChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

const QUICK_PROMPTS = [
  '플랍 C-Bet 사이즈와 빈도는 어떻게 정하나요?',
  '팟 오즈와 4/2의 법칙 계산법을 쉽게 설명해줘',
  'SPR(Stack-to-Pot Ratio) 개념과 활용법은?',
  '어그레시브한 상대(LAG) 공략법은?',
  '프리플랍 3-Bet 레인지 구성 원리는?',
];

export const CoachChatModal: React.FC<CoachChatModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      content:
        '안녕하세요! 저는 당신의 AI 홀덤 코치 **포커 마스터(Poker Master)**입니다. 포커 수학, GTO 전략, 프리플랍 레인지, 보드 텍스처 분석 등 궁금한 점을 무엇이든 편하게 질문해주세요!',
      timestamp: Date.now(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

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
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [
          ...prev,
          { role: 'model', content: data.reply || generateClientChatReply(text), timestamp: Date.now() },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'model', content: generateClientChatReply(text), timestamp: Date.now() },
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'model', content: generateClientChatReply(text), timestamp: Date.now() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-2xl h-[620px] max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <span>AI 포커 코치 1:1 Q&A</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded font-mono border border-indigo-500/30">
                  Gemini 3.7
                </span>
              </h3>
              <p className="text-xs text-slate-400">포커 이론, 수학, 전략 질문 실시간 답변</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setMessages([
                  {
                    role: 'model',
                    content: '대화가 초기화되었습니다. 새로운 질문을 입력해주세요!',
                    timestamp: Date.now(),
                  },
                ])
              }
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
              title="대화 초기화"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Questions Bar */}
        <div className="px-4 py-2 bg-slate-950/50 border-b border-slate-800/80 overflow-x-auto flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 font-semibold uppercase shrink-0 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-amber-400" />
            추천 질문:
          </span>
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700/80 whitespace-nowrap transition disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gradient-to-tr from-amber-500 to-indigo-600 text-white'
                }`}
              >
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[82%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none whitespace-pre-wrap'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              </div>
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl rounded-tl-none text-xs text-slate-400 flex items-center gap-1.5">
                <span>포커 마스터가 전략을 작성하는 중...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2">
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
            placeholder="포커 전략, 수학, 핸드 상황에 대해 물어보세요..."
            disabled={isLoading}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500 transition"
          />
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition shadow"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
