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
  ThumbsUp,
  Bell,
  MessageCircle,
  Store,
  MessageSquare,
  Archive,
  MoreHorizontal,
  Edit,
  Search,
  BellRing,
  FileText,
  ChevronDown,
  Lock,
  Smile
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';

import { SCENARIOS, Scenario, Message, SHIPPER_MANAGER_SCENARIO } from './scenarios';

type GameState = 'playing' | 'hacked' | 'win_reported' | 'fail_reported' | 'success_avoided' | 'fail_avoided' | 'win_action';

const BASE_INSTRUCTION = `Bạn là một AI mô phỏng tin nhắn trên ứng dụng Messenger.

[HÀNH VI CHUNG]:
- Viết cực kỳ ngắn gọn (TỐI ĐA 1 đến 2 câu). NGHIÊM CẤM viết dài dòng, giải thích lằng nhằng hay sến súa.
- Sử dụng ngôn ngữ đời thường, tự nhiên như người đang chat, có thể dùng teencode nhẹ nhàng nếu đóng vai bạn bè.
- Tuyệt đối xưng hô nhất quán từ đầu đến cuối (ví dụ: Shipper xưng "em" gọi khách là "anh/chị", bạn bè xưng "mày-tao", v.v... không được tự ý đổi vai).
- Tuyệt đối không nhắc đến bất kỳ từ khóa "bảo mật", "an toàn mạng", "hacker" hay "cảnh báo".
- KHÔNG gửi link trong tin nhắn đầu tiên của phiên chat hôm nay (phải rào trước đón sau).
`;

const LinkRenderer = ({ text, onLinkClick, onTransferClick }: { text: string, onLinkClick: () => void, onTransferClick: () => void }) => {
  // Regex to split by [QR], URLs with http/https, or bit.ly URLs
  const parts = text.split(/(\[QR\]|https?:\/\/[^\s]+|bit\.ly\/[^\s]+)/g);
  
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
        if (part.match(/^(https?:\/\/|bit\.ly\/)/)) {
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
  const [targetOtp, setTargetOtp] = useState<string | null>(null);
  const [showOtpNotification, setShowOtpNotification] = useState(false);
  const [pushNotification, setPushNotification] = useState<{message: string, actionId: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<Groq | null>(null);

  // Initialize randomized queue on mount
  useEffect(() => {
    const shuffled = getShuffledScenarios(SCENARIOS);
    setShuffledScenarios(shuffled);
    setCurrentScenario(shuffled[0]);
    setMessages(shuffled[0].initialChat);
  }, []);

  // OTP Generation & Notification Logic
  useEffect(() => {
    if (currentScenario && currentScenario.expectedAction === 'otp') {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setTargetOtp(newOtp);
      // Wait 3 seconds to show push notification
      const timer = setTimeout(() => setShowOtpNotification(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setTargetOtp(null);
      setShowOtpNotification(false);
    }
  }, [currentScenario]);

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
    if (currentScenario && messages.length === currentScenario.initialChat.length && !isLoading && gameState === 'playing') {
      handleAiResponse(messages);
    }
  }, [messages.length, currentScenario]);

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

    // OTP detection: check if user types a 6-digit number
    if (currentScenario.expectedAction === 'otp') {
      const otpMatch = inputText.match(/\d{6}/);
      if (otpMatch) {
        if (targetOtp && inputText.includes(targetOtp)) {
          setInputText('');
          if (!currentScenario.isHacker) {
            setMessages([...newMessages, {
              role: 'model',
              text: currentScenario.id === 'mom_otp_normal' ? 'Mẹ đăng nhập được rồi, cám ơn con nhé. Tối nay thích ăn gì mẹ nấu cho!' : 'Cám ơn em nhé, cô nhận được mã rồi.',
              timestamp: new Date()
            }]);
            setTimeout(() => handleAction('otp'), 1200);
          } else {
            handleAction('otp');
          }
          return;
        } else {
          setInputText('');
          const wrongMsgText = currentScenario.isHacker 
            ? 'Mã này sai rồi, hệ thống báo không đúng. Mày xem kỹ lại tin nhắn xem có nhầm không? Đọc lại mã chính xác cho tao đi!'
            : (currentScenario.id === 'mom_otp_normal' ? 'Mã này không đúng con ạ, con kiểm tra lại tin nhắn xem có nhầm số không nhé.' : 'Mã này không đúng em ạ, em kiểm tra lại xem có nhầm số không nhé.');
          setMessages([...newMessages, {
            role: 'model',
            text: wrongMsgText,
            timestamp: new Date()
          }]);
          return;
        }
      }
    }

    // Shipper Scam transition logic: Transition to manager after 2 refusal messages (total 5 user messages including history)
    if (currentScenario.id === 'shipper_scam' && newMessages.filter(m => m.role === 'user').length >= 5) {
      if (!shuffledScenarios.some(s => s.id === 'shipper_manager_scam')) {
        const newScenarios = [...shuffledScenarios];
        newScenarios.splice(currentIndex + 1, 0, SHIPPER_MANAGER_SCENARIO);
        setShuffledScenarios(newScenarios);
        setPushNotification({
          message: 'Bạn có một tin nhắn chờ từ Quản lý kho SPX',
          actionId: 'shipper_manager_scam'
        });
        setTimeout(() => setPushNotification(null), 5000);
      }
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
    <div className="h-screen w-full flex overflow-hidden text-[15px] bg-[#1e1e1e]">
      {/* Column 1: Nav Rail */}
      <div className="hidden lg:flex flex-col items-center py-4 w-[60px] bg-[#1e1e1e] border-r border-white/5 shrink-0 justify-between z-20">
        <div className="flex flex-col gap-4">
          <div className="p-2 bg-white/10 rounded-lg text-white cursor-pointer relative group">
            <MessageCircle size={24} fill="currentColor" />
            <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#1e1e1e]"></div>
          </div>
          <div className="p-2 text-gray-400 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"><Store size={24} /></div>
          <div className="p-2 text-gray-400 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"><MessageSquare size={24} /></div>
          <div className="p-2 text-gray-400 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"><Archive size={24} /></div>
        </div>
        <div className="w-9 h-9 rounded-full bg-gray-600 overflow-hidden cursor-pointer border border-white/10 relative">
          <img src="https://ui-avatars.com/api/?name=User&background=random" alt="User" />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#1e1e1e] rounded-full"></div>
        </div>
      </div>

      {/* Column 2: Chat List */}
      <div className="hidden md:flex flex-col w-[360px] bg-[#242526] border-r border-white/5 shrink-0 z-20">
        <div className="p-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white tracking-tight">Đoạn chat</h2>
          <div className="flex gap-2">
            <button className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-gray-200 transition-colors"><MoreHorizontal size={20}/></button>
            <button className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-gray-200 transition-colors"><Edit size={20}/></button>
          </div>
        </div>
        <div className="px-4 pb-2">
          <div className="bg-[#3a3b3c] rounded-full px-4 py-2 flex items-center gap-2">
            <Search size={18} className="text-gray-400" />
            <input type="text" placeholder="Tìm kiếm trên Messenger" className="bg-transparent border-none outline-none text-white w-full placeholder:text-gray-400 text-[15px]" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 mt-2">
          {shuffledScenarios.map((s, idx) => {
            const isCurrent = idx === currentIndex;
            const isCompleted = completedIndices.includes(idx);
            
            return (
              <div 
                key={s.id} 
                onClick={() => {
                  if (idx !== currentIndex && !isLoading) {
                    if (s.isMessageRequest) s.isMessageRequest = false;
                    setCurrentIndex(idx);
                    setCurrentScenario(s);
                    setMessages(s.initialChat);
                    setGameState('playing');
                    setPushNotification(null);
                  }
                }}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors mb-1",
                  isCurrent ? "bg-blue-500/10" : "hover:bg-white/5"
                )}
              >
                <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 relative">
                  <img src={s.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#242526] rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[15px] text-gray-100 truncate">{s.role}</h3>
                  <p className={cn("text-[13px] truncate", isCurrent ? "text-blue-400 font-medium" : "text-gray-400")}>
                    {isCurrent ? "Đang nhắn tin..." : (isCompleted ? "Đã gửi một file đính kèm." : "Bạn có tin nhắn chưa đọc.")}
                  </p>
                </div>
                {!isCompleted && !isCurrent && (
                  <div className={cn("w-3 h-3 rounded-full shrink-0 mr-2", s.isMessageRequest ? "bg-red-500" : "bg-blue-500")}></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Column 3: Main Chat */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#242526] relative z-10">
        {/* OTP Notification Toast */}
        <AnimatePresence>
          {showOtpNotification && targetOtp && gameState === 'playing' && (
            <motion.div 
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#3a3b3c] px-4 py-3 rounded-2xl shadow-xl border border-white/10 z-50 flex items-start gap-3 w-11/12 max-w-sm cursor-pointer hover:bg-[#4e4f50] transition-colors"
              onClick={() => setShowOtpNotification(false)}
            >
              <div className="bg-blue-500 text-white p-2 rounded-xl shrink-0 mt-0.5">
                <Bell size={20} fill="currentColor" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-0.5">
                  <p className="text-[13px] font-bold text-gray-100 uppercase tracking-wide">Tin nhắn hệ thống</p>
                  <p className="text-[11px] text-gray-400">Bây giờ</p>
                </div>
                <p className="text-[14px] text-gray-300 leading-tight">
                  Mã xác thực (OTP) của bạn là <span className="font-bold text-white text-[16px] mx-0.5">{targetOtp}</span>. Tuyệt đối KHÔNG chia sẻ mã này cho bất kỳ ai.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {pushNotification && gameState === 'playing' && (
            <motion.div 
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#3a3b3c] px-4 py-3 rounded-2xl shadow-xl border border-white/10 z-50 flex items-start gap-3 w-11/12 max-w-sm cursor-pointer hover:bg-[#4e4f50] transition-colors"
              onClick={() => {
                const targetIndex = shuffledScenarios.findIndex(s => s.id === pushNotification.actionId);
                if (targetIndex !== -1 && !isLoading) {
                  const s = shuffledScenarios[targetIndex];
                  if (s.isMessageRequest) s.isMessageRequest = false;
                  setCurrentIndex(targetIndex);
                  setCurrentScenario(s);
                  setMessages(s.initialChat);
                  setGameState('playing');
                  setPushNotification(null);
                }
              }}
            >
              <div className="w-10 h-10 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center shrink-0">
                <BellRing size={20} fill="currentColor" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-200 text-sm">TIN NHẮN CHỜ</h4>
                  <span className="text-[11px] text-gray-400">Bây giờ</span>
                </div>
                <p className="text-[13px] text-gray-300 mt-0.5 leading-snug">
                  {pushNotification.message}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!currentScenario ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-messenger border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="px-4 py-3 flex items-center justify-between bg-[#242526] border-b border-white/5 sticky top-0 z-20 shadow-sm">
              <div className="flex items-center gap-3">
                {/* Mobile back button (Hamburger) */}
                <button className="md:hidden p-2 -ml-2 text-messenger"><MessageCircle size={24}/></button>
                <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden relative">
                  <img src={currentScenario.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#242526] rounded-full"></div>
                </div>
                <div className="flex flex-col">
                  <h1 className="font-bold text-[17px] leading-tight text-gray-100">{currentScenario.role}</h1>
                  <p className="text-[12px] text-gray-400 font-medium">Đang hoạt động</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-messenger">
                <button className="hover:bg-white/10 p-2 rounded-full transition-colors"><Phone size={24} fill="currentColor" /></button>
                <button className="hover:bg-white/10 p-2 rounded-full transition-colors"><Video size={24} fill="currentColor" /></button>
                <div className="relative">
                  <button onClick={() => setShowMenu(!showMenu)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
                    <Info size={24} fill="currentColor" />
                  </button>
                  <AnimatePresence>
                    {showMenu && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          className="absolute right-0 top-12 w-48 bg-[#242526] rounded-2xl shadow-2xl border border-white/10 py-2 z-40"
                        >
                          <button onClick={() => handleReport('debug')} className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors text-sm font-medium text-gray-200">Báo lỗi</button>
                          <button onClick={() => handleReport('report')} className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors text-sm font-bold text-red-500">Báo cáo mạo danh</button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#242526]">
              {/* Sticky Note */}
              {currentScenario.note && gameState === 'playing' && (
                <div className="mx-auto mb-6 bg-[#3a3b3c] p-3 rounded-lg shadow-lg border border-white/10 w-fit max-w-sm text-center">
                  <div className="flex items-center justify-center gap-2 text-yellow-500 font-bold mb-1 text-sm">
                    <Info size={16} /> Lời nhắc
                  </div>
                  <p className="text-[13px] text-gray-300 leading-relaxed">{currentScenario.note}</p>
                </div>
              )}

              {messages.map((msg, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  {msg.role === 'model' && (
                    <img src={currentScenario.avatar} className="w-7 h-7 rounded-full mr-2 self-end mb-1" alt="avatar" />
                  )}
                  <div className={cn("max-w-[70%] px-3.5 py-2 rounded-[1.25rem] text-[15px] leading-relaxed", msg.role === 'user' ? "bubble-sent rounded-br-sm" : "bubble-received rounded-bl-sm")}>
                    <LinkRenderer text={msg.text} onLinkClick={handleLinkClick} onTransferClick={() => handleAction('transfer')} />
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <img src={currentScenario.avatar} className="w-7 h-7 rounded-full mr-2 self-end mb-1" alt="avatar" />
                  <div className="bubble-received px-4 py-3 rounded-2xl rounded-bl-sm">
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
            <footer className="p-3 bg-[#242526] sticky bottom-0 relative z-20">
              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-3 text-messenger mr-1">
                  <button className="hover:bg-white/10 rounded-full transition-colors"><PlusCircle size={24} fill="currentColor" /></button>
                  <button className="hover:bg-white/10 rounded-full transition-colors hidden sm:block"><Camera size={24} fill="currentColor" /></button>
                  <button onClick={() => handleAction('image')} className="hover:bg-white/10 rounded-full transition-colors"><ImageIcon size={24} fill="currentColor" /></button>
                  <button className="hover:bg-white/10 rounded-full transition-colors hidden sm:block"><Mic size={24} fill="currentColor" /></button>
                </div>
                
                <form onSubmit={handleSendMessage} className="flex-1 flex items-center">
                  <div className="flex-1 bg-[#3a3b3c] rounded-full px-4 py-2 flex items-center">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Aa"
                      className="w-full bg-transparent border-none focus:ring-0 text-[15px] placeholder:text-gray-400 text-gray-200 outline-none"
                      disabled={gameState !== 'playing'}
                    />
                    <button type="button" className="text-messenger ml-2 hover:bg-white/10 rounded-full"><Smile size={20} fill="currentColor" /></button>
                  </div>
                  {inputText.trim() ? (
                    <button type="submit" disabled={isLoading || gameState !== 'playing'} className="text-messenger ml-3 hover:bg-white/10 p-1 rounded-full transition-colors"><Send size={24} fill="currentColor" /></button>
                  ) : (
                    <button type="button" className="text-messenger ml-3 hover:bg-white/10 p-1 rounded-full transition-colors"><ThumbsUp size={24} fill="currentColor" /></button>
                  )}
                </form>
              </div>
            </footer>
          </>
        )}
      </div>

      {/* Column 4: Chat Info */}
      {currentScenario && (
        <div className="hidden xl:flex flex-col w-[360px] bg-[#242526] border-l border-white/5 shrink-0 overflow-y-auto">
          <div className="flex flex-col items-center py-6 px-4">
            <div className="w-20 h-20 rounded-full overflow-hidden mb-3 relative">
              <img src={currentScenario.avatar} alt="Avatar" className="w-full h-full object-cover" />
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-[#242526] rounded-full"></div>
            </div>
            <h2 className="text-xl font-bold text-white text-center">{currentScenario.role}</h2>
            <p className="text-[13px] text-gray-400 mt-1">Đang hoạt động</p>
            
            <div className="mt-4 flex items-center gap-1.5 text-gray-300 text-[12px] bg-[#3a3b3c]/50 px-3 py-1.5 rounded-full">
              <Lock size={12} fill="currentColor" /> Được mã hóa đầu cuối
            </div>

            <div className="flex gap-6 mt-6">
              <div className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className="w-9 h-9 rounded-full bg-[#3a3b3c] group-hover:bg-[#4e4f50] flex items-center justify-center text-white transition-colors">
                  <User size={18} fill="currentColor" />
                </div>
                <span className="text-[12px] text-gray-300">Trang cá nhân</span>
              </div>
              <div className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className="w-9 h-9 rounded-full bg-[#3a3b3c] group-hover:bg-[#4e4f50] flex items-center justify-center text-white transition-colors">
                  <BellRing size={18} fill="currentColor" />
                </div>
                <span className="text-[12px] text-gray-300">Tắt thông báo</span>
              </div>
              <div className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className="w-9 h-9 rounded-full bg-[#3a3b3c] group-hover:bg-[#4e4f50] flex items-center justify-center text-white transition-colors">
                  <Search size={18} />
                </div>
                <span className="text-[12px] text-gray-300">Tìm kiếm</span>
              </div>
            </div>
          </div>

          <div className="flex-1 px-2 pb-4">
            <div className="p-3 hover:bg-white/5 rounded-lg flex justify-between items-center cursor-pointer mb-1 transition-colors">
              <span className="font-medium text-[15px] text-gray-200">Thông tin về đoạn chat</span>
              <ChevronDown size={20} className="text-gray-400" />
            </div>
            <div className="p-3 hover:bg-white/5 rounded-lg flex justify-between items-center cursor-pointer mb-1 transition-colors">
              <span className="font-medium text-[15px] text-gray-200">Tùy chỉnh đoạn chat</span>
              <ChevronDown size={20} className="text-gray-400" />
            </div>
            <div className="p-3 hover:bg-white/5 rounded-lg flex justify-between items-center cursor-pointer mb-1 transition-colors">
              <span className="font-medium text-[15px] text-gray-200">File phương tiện và file</span>
              <ChevronDown size={20} className="text-gray-400" />
            </div>
            <div className="p-3 hover:bg-white/5 rounded-lg flex justify-between items-center cursor-pointer transition-colors">
              <span className="font-medium text-[15px] text-gray-200">Quyền riêng tư và hỗ trợ</span>
              <ChevronDown size={20} className="text-gray-400" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
