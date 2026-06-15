/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Groq from 'groq-sdk';
import { 
  Send, 
  User, 
  MoreVertical,
  AlertOctagon,
  ShieldAlert,
  ChevronRight,
  Info,
  Plus,
  Image as ImageIcon,
  CreditCard,
  StickyNote,
  Check,
  Phone,
  Video,
  PlusCircle,
  Camera,
  Mic,
  ThumbsUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';

import { SCENARIOS, Scenario, Message, SHIPPER_MANAGER_SCENARIO } from './scenarios';

type GameState = 'playing' | 'hacked' | 'win_reported' | 'fail_reported' | 'success_avoided' | 'fail_avoided' | 'win_action';

const BASE_INSTRUCTION = `Bạn là một AI mô phỏng tin nhắn trên ứng dụng Messenger.

[HÀNH VI CHUNG]:
- Viết cực kỳ ngắn gọn (độ dài tin nhắn khoảng 2-3 câu).
- Sử dụng ngôn ngữ đời thường, tự nhiên như người đang chat, có thể dùng teencode nhẹ nhàng nếu đóng vai bạn bè.
- Tuyệt đối xưng hô nhất quán từ đầu đến cuối (ví dụ: Shipper xưng "em" gọi khách là "anh/chị", bạn bè xưng "mày-tao", v.v... không được tự ý đổi vai).
- Tuyệt đối không nhắc đến bất kỳ từ khóa "bảo mật", "an toàn mạng", "hacker" hay "cảnh báo".
- KHÔNG gửi link trong tin nhắn đầu tiên của phiên chat hôm nay (phải rào trước đón sau).
`;

const LinkRenderer = ({ text, onLinkClick, onTransferClick }: { text: string, onLinkClick: () => void, onTransferClick: () => void }) => {
  // Regex to split by [QR] or URLs
  const parts = text.split(/(\[QR\]|https?:\/\/[^\s]+)/g);
  
  return (
    <>
      {parts.map((part, i) => {
        if (part === '[QR]') {
          return (
            <div key={i} className="my-3 flex flex-col items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100 max-w-xs">
              <img src="/QRGIALAP.png" alt="QR Code" className="w-full h-auto rounded-lg mb-3 border border-gray-200" />
              <button 
                onClick={onTransferClick}
                className="w-full py-2.5 bg-messenger text-white font-bold rounded-lg hover:bg-messenger-hover transition-colors"
              >
                Chuyển khoản
              </button>
            </div>
          );
        }
        if (part.match(/^https?:\/\//)) {
          return (
            <a 
              key={i} 
              href="#" 
              onClick={(e) => { e.preventDefault(); onLinkClick(); }}
              className="text-messenger underline font-medium hover:text-messenger-hover break-all"
            >
              {part}
            </a>
          );
        }
        return <span key={i} className="inline"><ReactMarkdown>{part}</ReactMarkdown></span>;
      })}
    </>
  );
};
const getShuffledScenarios = (scenarios: Scenario[]): Scenario[] => {
  let result: Scenario[] = [];
  let remaining = [...scenarios];

  // Attempt to build a valid sequence
  const solve = (current: Scenario[], items: Scenario[]): Scenario[] | null => {
    if (items.length === 0) return current;

    // Shuffle the remaining items to introduce randomness each time
    const shuffledItems = [...items].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffledItems.length; i++) {
      const item = shuffledItems[i];
      const lastTwo = current.slice(-2);
      
      // Check constraint: max 2 consecutive same isHacker type
      const isViolation = lastTwo.length === 2 && 
                         lastTwo[0].isHacker === item.isHacker && 
                         lastTwo[1].isHacker === item.isHacker;

      if (!isViolation) {
        const nextItems = items.filter((_, idx) => items[idx].id !== item.id);
        const solved = solve([...current, item], nextItems);
        if (solved) return solved;
      }
    }
    return null;
  };

  // Run the solver. Since the dataset is small (7 items), recursion is safe and fast.
  const solved = solve([], remaining);
  return solved || remaining.sort(() => Math.random() - 0.5); // Fallback to simple shuffle if no perfect solution found
};

export default function App() {
  const [shuffledScenarios, setShuffledScenarios] = useState<Scenario[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedIndices, setCompletedIndices] = useState<number[]>([]);
  
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [gameState, setGameState] = useState<GameState>('playing');
  const [showMenu, setShowMenu] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<Groq | null>(null);

  // Initialize randomized queue on mount
  useEffect(() => {
    const shuffled = getShuffledScenarios(SCENARIOS);
    setShuffledScenarios(shuffled);
    setCurrentScenario(shuffled[0]);
    setMessages(shuffled[0].initialChat);
  }, []);

  const resetToNextScenario = () => {
    if (currentIndex >= shuffledScenarios.length - 1) {
      // Finished all scenarios, reset with new shuffle
      const reshuffled = getShuffledScenarios(SCENARIOS);
      setShuffledScenarios(reshuffled);
      setCurrentIndex(0);
      setCompletedIndices([]);
      setCurrentScenario(reshuffled[0]);
      setMessages(reshuffled[0].initialChat);
    } else {
      const nextIdx = currentIndex + 1;
      setCompletedIndices(prev => [...prev, currentIndex]);
      setCurrentIndex(nextIdx);
      const nextScenario = shuffledScenarios[nextIdx];
      setCurrentScenario(nextScenario);
      setMessages(nextScenario.initialChat);
    }
    setGameState('playing');
    setInputText('');
    setShowMenu(false);
    setShowActionMenu(false);
  };

  useEffect(() => {
    if (!aiRef.current) {
      aiRef.current = new Groq({ 
        apiKey: process.env.GROQ_API_KEY || '', 
        dangerouslyAllowBrowser: true 
      });
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAiResponse = async (currentMessages: Message[]) => {
    if (!aiRef.current || isLoading || gameState !== 'playing' || !currentScenario) return;
    
    setIsLoading(true);
    try {
      const fullInstruction = `${BASE_INSTRUCTION}\n\n[VAI TRÒ]: ${currentScenario.role}\n${currentScenario.specificInstruction}`;
      
      const history: any[] = currentMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      const chatCompletion = await aiRef.current.chat.completions.create({
        messages: [
          { role: 'system', content: fullInstruction },
          ...history
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.7,
        max_tokens: 150
      });

      let outputText = chatCompletion.choices[0]?.message?.content || '';

      if (outputText) {
        setMessages(prev => [...prev, {
          role: 'model',
          text: outputText,
          timestamp: new Date()
        }]);
      }
    } catch (error: any) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        role: 'model',
        text: `[Lỗi Hệ Thống]: ${error.message || error.toString()}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger initial AI response if we just started
  useEffect(() => {
    if (currentScenario && messages.length === currentScenario.initialChat.length && !showOnboarding && !isLoading && gameState === 'playing') {
      handleAiResponse(messages);
    }
  }, [messages.length, showOnboarding, currentScenario]);

  // Logic 10 câu chat
  useEffect(() => {
    if (!currentScenario) return;
    const modelMessagesCount = messages.filter(m => m.role === 'model').length;
    if (modelMessagesCount >= 10 && gameState === 'playing') {
      if (currentScenario.isHacker) {
        setGameState('success_avoided');
      } else {
        // Normal person but hasn't clicked link yet -> Failure according to user request
        setGameState('fail_avoided');
      }
    }
  }, [messages, gameState, currentScenario]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading || !aiRef.current || gameState !== 'playing' || !currentScenario) return;

    const userMessage: Message = {
      role: 'user',
      text: inputText,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];

    // OTP detection: if user types a 6-digit number and expected action is OTP
    if (inputText.trim().match(/^\d{6}$/) && currentScenario.expectedAction === 'otp') {
      setInputText('');
      handleAction('otp');
      return;
    }

    // Shipper Scam transition logic: Transition to manager after 2 refusal messages (total 5 user messages including history)
    if (currentScenario.id === 'shipper_scam' && newMessages.filter(m => m.role === 'user').length >= 5) {
      const newScenarios = [...shuffledScenarios];
      newScenarios.splice(currentIndex + 1, 0, SHIPPER_MANAGER_SCENARIO);
      setShuffledScenarios(newScenarios);
      setCurrentIndex(currentIndex + 1);
      setMessages(SHIPPER_MANAGER_SCENARIO.initialChat);
      setInputText('');
      return;
    }

    setMessages(newMessages);
    setInputText('');
    
    handleAiResponse(newMessages);
  };

  const handleReport = (type: 'debug' | 'report') => {
    setShowMenu(false);
    if (!currentScenario) return;
    if (type === 'debug') {
      alert("Cảm ơn bạn đã phản hồi");
    } else {
      if (currentScenario.isHacker) {
        setGameState('win_reported');
      } else {
        setGameState('fail_reported');
      }
    }
  };

  const handleLinkClick = () => {
    if (gameState === 'playing' && currentScenario) {
      if (currentScenario.isHacker) {
        setGameState('hacked');
      } else {
        // User clicked a link from a "real" person - show success screen
        setGameState('success_avoided');
      }
    }
  };

  const handleAction = (type: 'transfer' | 'image' | 'link' | 'otp') => {
    setShowActionMenu(false);
    if (!aiRef.current || isLoading || gameState !== 'playing' || !currentScenario) return;

    if (type === currentScenario.expectedAction) {
      if (currentScenario.isHacker) {
        setGameState('hacked');
      } else {
        setGameState('win_action');
      }
      return;
    }

    // Wrong action selected
    let text = "";
    if (type === 'transfer') {
      text = "[HÀNH ĐỘNG] Bạn đã chuyển khoản.";
    } else if (type === 'image') {
      text = "[HÀNH ĐỘNG] Bạn đã gửi 1 bức ảnh chụp rõ nét 2 mặt CCCD.";
    } else if (type === 'otp') {
      text = "[HÀNH ĐỘNG] Bạn đã cung cấp mã OTP 6 số.";
    } else if (type === 'link') {
      text = "[HÀNH ĐỘNG] Bạn đã nhấp vào đường link.";
    }

    const userMessage: Message = {
      role: 'user',
      text: text,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    handleAiResponse(newMessages);
  };

  if (gameState === 'hacked') {
    return (
      <div className="min-h-screen bg-red-600 flex flex-col items-center justify-center p-6 text-white text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <AlertOctagon size={100} className="mb-6 mx-auto animate-pulse" />
          <h1 className="text-4xl font-black mb-4">BẠN ĐÃ SẬP BẪY LỪA ĐẢO!</h1>
          <p className="text-xl opacity-90 max-w-lg mb-8">
            Kẻ lừa đảo đã đạt được mục đích sau khi bạn thực hiện hành vi nguy hiểm (chuyển khoản, gửi ảnh CCCD, cung cấp mã OTP, hoặc nhấn link độc hại).
          </p>
          <button 
            onClick={resetToNextScenario}
            className="px-8 py-3 bg-white text-red-600 rounded-full font-bold shadow-xl hover:bg-gray-100 transition-all"
          >
            Thử lại và cẩn thận hơn
          </button>
        </motion.div>
      </div>
    );
  }

  // End Screens
  const renderEndScreen = () => {
    let title = "";
    let sub = "";
    let colorClass = "bg-green-600";
    let icon = <ShieldAlert size={100} />;

    if (gameState === 'win_reported') {
      title = "Chiến thắng!";
      sub = "Chúc mừng! Bạn đã nhận diện chính xác kẻ lừa đảo.";
    } else if (gameState === 'win_action') {
      title = "Hoàn thành xuất sắc!";
      sub = "Bạn đã thực hiện đúng yêu cầu của người thân/bạn bè thật.";
    } else if (gameState === 'fail_reported') {
      title = "Thất bại!";
      sub = "Bạn đã nghi ngờ nhầm người thân/bạn bè.";
      colorClass = "bg-orange-600";
    } else if (gameState === 'success_avoided') {
      title = "Chúc mừng!";
      sub = "Bạn đã rất tỉnh táo khi không bị dẫn dụ";
    } else if (gameState === 'fail_avoided') {
      title = "Thất bại!";
      sub = "Đây là người thân thật, bạn đã không tin tưởng khi họ gửi thông tin.";
      colorClass = "bg-red-500";
    }

    if (!title || !currentScenario) return null;

    return (
      <div className={cn("min-h-screen flex flex-col items-center justify-center p-6 text-white text-center", colorClass)}>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="mb-6 flex justify-center">{icon}</div>
          <h1 className="text-4xl font-black mb-4 uppercase tracking-tight">{title}</h1>
          <p className="text-xl opacity-90 max-w-lg mb-8">{sub}</p>
          <button 
            onClick={resetToNextScenario}
            className="px-8 py-3 bg-white text-gray-900 rounded-full font-bold shadow-xl hover:bg-gray-100 transition-all"
          >
            Chơi tiếp màn tiếp theo
          </button>
        </motion.div>
      </div>
    );
  };

  const endScreen = renderEndScreen();
  if (endScreen) return endScreen;

  return (
    <div className="h-screen w-full flex bg-white relative overflow-hidden">
      {/* Visual Sidebar Progress */}
      <div className="hidden md:flex flex-col gap-4 py-6 px-4 bg-gray-50 border-r border-gray-200 z-10 overflow-y-auto w-24 items-center">
        {shuffledScenarios.map((s, idx) => {
          const isCompleted = completedIndices.includes(idx);
          const isCurrent = idx === currentIndex;
          const isLocked = idx > currentIndex;

          return (
            <div 
              key={s.id} 
              className={cn(
                "w-12 h-12 rounded-full border-2 transition-all duration-300 relative shrink-0 cursor-pointer hover:scale-105",
                isCurrent ? "border-messenger scale-110 shadow-sm" : "border-transparent opacity-60",
                isCompleted ? "opacity-100 border-green-500" : ""
              )}
            >
              <img 
                src={s.avatar} 
                alt="Avatar" 
                className={cn(
                  "w-full h-full rounded-full object-cover",
                  isLocked && "opacity-40 grayscale"
                )}
                referrerPolicy="no-referrer"
              />
              {isCompleted && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white border-2 border-white">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="w-full flex-1 bg-white text-gray-900 flex flex-col h-screen overflow-hidden relative z-10">
        {!currentScenario ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-messenger border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>


      {/* Onboarding Pop-up */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-messenger rounded-2xl flex items-center justify-center mx-auto mb-6 text-white">
                <Send size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-4">Chào mừng bạn đến với Messenger</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Hãy trò chuyện để kiểm tra xem đối phương có phải là người thật hay không. 
                Nếu thấy nghi ngờ tài khoản bị mạo danh, hãy nhấn vào dấu <span className="font-bold">"..."</span> và chọn <span className="font-bold">"Báo cáo"</span>. 
                <br/><br/>
                Chúc bạn an toàn!
              </p>
              <button 
                onClick={() => setShowOnboarding(false)}
                className="w-full py-4 bg-messenger text-white rounded-2xl font-bold hover:bg-messenger-hover transition-all active:scale-95"
              >
                Bắt đầu
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="px-4 py-3 flex items-center justify-between bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden relative">
            <img 
              src={currentScenario.avatar} 
              alt="Avatar" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-[17px] leading-tight text-gray-900">{currentScenario.role}</h1>
            <p className="text-[13px] text-gray-500">Đang hoạt động</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-messenger">
          <button className="hover:bg-gray-100 p-2 rounded-full transition-colors">
            <Phone size={24} fill="currentColor" />
          </button>
          <button className="hover:bg-gray-100 p-2 rounded-full transition-colors">
            <Video size={24} fill="currentColor" />
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="hover:bg-gray-100 p-2 rounded-full transition-colors"
            >
              <Info size={24} />
            </button>
          
            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-40"
                  >
                    <button 
                      onClick={() => handleReport('debug')}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      Báo lỗi
                    </button>
                    <button 
                      onClick={() => handleReport('report')}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-sm font-bold text-red-600"
                    >
                      Báo cáo mạo danh
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Sticky Note */}
      {currentScenario.note && gameState === 'playing' && (
        <div className="absolute top-20 right-4 bg-yellow-100/95 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-yellow-300 z-10 w-56 rotate-2 hover:rotate-0 transition-transform cursor-default">
          <div className="flex items-center gap-2 text-yellow-800 font-bold mb-1 text-sm border-b border-yellow-200/50 pb-1">
            <StickyNote size={14} /> Ghi chú ngoài luồng
          </div>
          <p className="text-xs text-yellow-900 leading-relaxed font-medium mt-1">
            {currentScenario.note}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex w-full",
              msg.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === 'model' && (
              <img src={currentScenario.avatar} className="w-7 h-7 rounded-full mr-2 self-end mb-1" alt="avatar" />
            )}
            <div
              className={cn(
                "max-w-[70%] px-3.5 py-2 rounded-2xl text-[15px] leading-relaxed",
                msg.role === 'user' ? "bg-messenger text-white rounded-br-sm" : "bg-gray-100 text-gray-900 rounded-bl-sm"
              )}
            >
              <LinkRenderer text={msg.text} onLinkClick={handleLinkClick} onTransferClick={() => handleAction('transfer')} />
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <img src={currentScenario.avatar} className="w-7 h-7 rounded-full mr-2 self-end mb-1" alt="avatar" />
            <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      <footer className="p-3 bg-white sticky bottom-0 relative z-20">
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-3 text-messenger mr-1">
            <button className="hover:bg-gray-100 rounded-full transition-colors">
              <PlusCircle size={24} fill="currentColor" className="text-messenger" />
            </button>
            <button className="hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
              <Camera size={24} fill="currentColor" className="text-messenger" />
            </button>
            <button 
              onClick={() => handleAction('image')} 
              className="hover:bg-gray-100 rounded-full transition-colors"
              title="Gửi ảnh"
            >
              <ImageIcon size={24} fill="currentColor" className="text-messenger" />
            </button>
            <button className="hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
              <Mic size={24} fill="currentColor" className="text-messenger" />
            </button>
          </div>
          
          <form onSubmit={handleSendMessage} className="flex-1 flex items-center">
            <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Aa"
                className="w-full bg-transparent border-none focus:ring-0 text-[15px] placeholder:text-gray-500 outline-none"
                disabled={gameState !== 'playing'}
              />
            </div>
            {inputText.trim() ? (
              <button
                type="submit"
                disabled={isLoading || gameState !== 'playing'}
                className="text-messenger ml-3 hover:bg-gray-100 p-1 rounded-full transition-colors"
              >
                <Send size={24} fill="currentColor" />
              </button>
            ) : (
              <button
                type="button"
                className="text-messenger ml-3 hover:bg-gray-100 p-1 rounded-full transition-colors"
              >
                <ThumbsUp size={24} fill="currentColor" />
              </button>
            )}
          </form>
        </div>
      </footer>
          </>
        )}
      </div>
    </div>
  );
}
