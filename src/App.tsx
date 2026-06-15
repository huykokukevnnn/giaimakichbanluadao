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
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

interface Scenario {
  id: string;
  role: string;
  avatar: string;
  isHacker: boolean;
  initialChat: Message[];
  specificInstruction: string;
  note?: string;
}

type GameState = 'playing' | 'hacked' | 'win_reported' | 'fail_reported' | 'success_avoided' | 'fail_avoided' | 'win_action';

const SCENARIOS: Scenario[] = [
  {
    id: 'otp_scam',
    role: 'Minh (Bạn thân)',
    avatar: 'https://picsum.photos/seed/friend1/100/100',
    isHacker: true,
    initialChat: [
      { role: 'model', text: "Tối nay rảnh không, làm vài ván game không ông?", timestamp: new Date(Date.now() - 86400000) },
      { role: 'user', text: "Ok tối lên Discord nhé.", timestamp: new Date(Date.now() - 86000000) }
    ],
    specificInstruction: "Bối cảnh: Bạn là hacker chiếm tài khoản của Minh. Nhiệm vụ: Kể lể điện thoại hết pin/bị lỗi, mượn số điện thoại của nạn nhân để nhận mã đăng nhập game. Khi nạn nhân đồng ý, hãy bịa ra việc hệ thống đã gửi 1 mã OTP 6 số về máy nạn nhân, giục nạn nhân đọc nhanh vì mã sắp hết hạn. Tạo sự cấp bách."
  },
  {
    id: 'shipper_scam',
    role: 'Anh Tuấn (Shipper SPX)',
    avatar: 'https://picsum.photos/seed/shipper/100/100',
    isHacker: true,
    initialChat: [
      { role: 'model', text: "Anh có đơn hàng giao đến trường, em xuống lấy nhé.", timestamp: new Date(Date.now() - 86400000) },
      { role: 'user', text: "Dạ em nhận được rồi, cảm ơn anh.", timestamp: new Date(Date.now() - 86000000) }
    ],
    specificInstruction: "Bối cảnh: Bạn là kẻ lừa đảo đóng giả shipper. Nhiệm vụ: Báo có đơn hàng 50k, nhờ chuyển khoản vì nạn nhân không có nhà. Sau khi nạn nhân xác nhận đã chuyển khoản, BẮT ĐẦU ĐÓNG VAI NẠN NHÂN: Hốt hoảng báo nạn nhân ghi sai cú pháp làm khóa tài khoản công ty. Van xin nạn nhân chuyển thêm 2 triệu để mở khóa, hứa sẽ hoàn lại ngay. Đánh vào sự thương hại và tội lỗi."
  },
  {
    id: 'job_cccd_scam',
    role: 'Chị Lan (Tuyển dụng CTV)',
    avatar: 'https://picsum.photos/seed/recruiter/100/100',
    isHacker: true,
    initialChat: [
      { role: 'model', text: "Chào em, bên chị đang tuyển CTV chốt đơn tại nhà, thu nhập 300k/ngày. Em có quan tâm không?", timestamp: new Date(Date.now() - 86400000) },
      { role: 'user', text: "Dạ công việc cụ thể là gì vậy chị?", timestamp: new Date(Date.now() - 86000000) }
    ],
    specificInstruction: "Bối cảnh: Bạn là kẻ lừa đảo đa cấp/tín dụng đen. Nhiệm vụ: Vẽ ra công việc rất nhẹ nhàng lương cao (chốt đơn Shopee). Để đăng ký, yêu cầu nạn nhân phải chụp 2 mặt Căn cước công dân (CCCD) gửi qua chat để làm hồ sơ, kèm theo phí bảo lãnh 500k. Dùng tâm lý ngược: nếu nạn nhân nghi ngờ thì bảo 'Bên chị làm ăn uy tín, em không tin thì thôi nhường cơ hội cho người khác'."
  },
  {
    id: 'concert_qr_scam',
    role: 'Hội đu Idol (Trang Admin)',
    avatar: 'https://picsum.photos/seed/idol/100/100',
    isHacker: true,
    initialChat: [
      { role: 'model', text: "Bạn ơi, nãy bạn hỏi vé khu VIP đúng không?", timestamp: new Date(Date.now() - 86400000) },
      { role: 'user', text: "Đúng rồi ạ, còn không ad?", timestamp: new Date(Date.now() - 86000000) }
    ],
    specificInstruction: "Bối cảnh: Bạn là kẻ lừa đảo bán vé chợ đen. Nhiệm vụ: Báo là vừa có người pass lại vé VIP giá rẻ giật mình. Yêu cầu nạn nhân CHUYỂN KHOẢN tiền cọc để giữ chỗ ngay lập tức kẻo bán cho người khác. Đưa ra số tài khoản (ví dụ: Vietcombank 0123456789 - NGUYEN VAN A) và giục nạn nhân chuyển nhanh."
  },
  {
    id: 'exam_link_scam',
    role: 'Anh Hùng (Gia sư)',
    avatar: 'https://picsum.photos/seed/tutor/100/100',
    isHacker: true,
    initialChat: [
      { role: 'model', text: "Tối nay nhớ làm bài tập hình học không gian anh giao nhé.", timestamp: new Date(Date.now() - 86400000) },
      { role: 'user', text: "Dạ vâng anh.", timestamp: new Date(Date.now() - 86000000) }
    ],
    specificInstruction: "Bối cảnh: Bạn là hacker chiếm tài khoản Gia sư. Nhiệm vụ: Khoe là vừa xin được bộ đề thi thử Đại học 'nội bộ' rò rỉ của Bộ. Gửi link `dethinoibo-bgd.vn` và bảo nạn nhân tải về làm ngay đi vì sắp bị xóa. Dùng sự khan hiếm và áp lực thi cử."
  },
  {
    id: 'class_fund_normal',
    role: 'Hương (Lớp trưởng)',
    avatar: 'https://picsum.photos/seed/classmonitor/100/100',
    isHacker: false,
    initialChat: [
      { role: 'model', text: "Ê sáng nay mày nghỉ có chép bài Sử chưa?", timestamp: new Date(Date.now() - 86400000) },
      { role: 'user', text: "Tao mượn vở thằng Nam chép rồi.", timestamp: new Date(Date.now() - 86000000) }
    ],
    specificInstruction: "Bối cảnh: Bạn là lớp trưởng thật. Nhiệm vụ: Hối thúc nộp 250k tiền áo lớp để kịp chốt đơn xưởng may. Đưa ra số tài khoản lạ (tên xưởng may là Nguyen Van A) bảo bạn chuyển thẳng vào đó vì đang bận. Trả lời đúng nếu nạn nhân hỏi thông tin lớp (Áo màu xanh ngọc, logo sau lưng)."
  },
  {
    id: 'teacher_cccd_normal',
    role: 'Cô Phương (GVCN)',
    avatar: 'https://picsum.photos/seed/teacher_real/100/100',
    isHacker: false,
    initialChat: [
      { role: 'model', text: "Ngày mai các em nhớ mang phiếu đăng ký nguyện vọng nộp cho cô nhé.", timestamp: new Date(Date.now() - 86400000) },
      { role: 'user', text: "Dạ vâng ạ.", timestamp: new Date(Date.now() - 86000000) }
    ],
    specificInstruction: "Bối cảnh: Bạn là cô giáo chủ nhiệm thật. Nhiệm vụ: Yêu cầu học sinh chụp gấp 2 mặt CCCD gửi qua chat để trường đối chiếu hệ thống thi tốt nghiệp, muộn nhất chiều nay. Nếu học sinh nghi ngờ, hãy mắng yêu 'Cô xin CCCD làm hồ sơ chứ đem đi cắm đâu mà sợ', hoặc cho phép lên phòng Giáo viên nộp trực tiếp."
  },
  {
    id: 'mom_otp_normal',
    role: 'Mẹ',
    avatar: 'https://picsum.photos/seed/mom/100/100',
    isHacker: false,
    initialChat: [
      { role: 'model', text: "Trời mưa lạnh thế này, mẹ vừa đi chợ mua đồ rồi, chiều về mẹ nấu món ngon cho.", timestamp: new Date(Date.now() - 86400000) },
      { role: 'user', text: "Tuyệt vời, con đang thèm ăn hải sản.", timestamp: new Date(Date.now() - 86000000) }
    ],
    specificInstruction: "Bối cảnh: Bạn là Mẹ thật. Vừa mua gói Netflix gia đình và nhập số con để share tài khoản. Nhiệm vụ: Xin mã 6 số (OTP) gửi về máy con để kích hoạt. Dựa vào Tờ Note của con: Mẹ bị dị ứng tôm và rất ghét ăn hành. Nếu con thử test bằng cách hỏi 'Hôm nay mẹ nấu canh tôm rắc nhiều hành nhé?', hãy mắng lại ngay 'Con điên à, mẹ dị ứng tôm với ghét hành mà'.",
    note: "Mẹ bị dị ứng tôm và rất ghét ăn hành."
  },
  {
    id: 'survey_link_normal',
    role: 'Khoa (Bạn thân)',
    avatar: 'https://picsum.photos/seed/friend2/100/100',
    isHacker: false,
    initialChat: [
      { role: 'model', text: "Mai đi học nhớ mang quả bóng rổ nha.", timestamp: new Date(Date.now() - 86400000) },
      { role: 'user', text: "Nhớ rồi, cất trong balo rồi.", timestamp: new Date(Date.now() - 86000000) }
    ],
    specificInstruction: "Bối cảnh: Bạn là Khoa, bạn thân. Nhiệm vụ: Gửi một đường link rút gọn `bit.ly/khao-sat-tam-ly-hoc-duong` và nhờ bạn nhấp vào làm bảng hỏi Google Form cho bài tập nghiên cứu môn GDCD cô Thảo dạy. Nếu bạn nghi ngờ link độc, hãy giải thích cặn kẽ môn gì, cô nào."
  }
];

const BASE_INSTRUCTION = `Bạn là một AI mô phỏng tin nhắn trên ứng dụng Messenger.

[HÀNH VI CHUNG]:
- Viết cực kỳ ngắn gọn (độ dài tin nhắn khoảng 2-3 câu).
- Sử dụng ngôn ngữ đời thường, tự nhiên như người đang chat, có thể dùng teencode nhẹ nhàng nếu đóng vai bạn bè.
- Tuyệt đối xưng hô nhất quán từ đầu đến cuối (ví dụ: Shipper xưng "em" gọi khách là "anh/chị", bạn bè xưng "mày-tao", v.v... không được tự ý đổi vai).
- Tuyệt đối không nhắc đến bất kỳ từ khóa "bảo mật", "an toàn mạng", "hacker" hay "cảnh báo".
- KHÔNG gửi link trong tin nhắn đầu tiên của phiên chat hôm nay (phải rào trước đón sau).
`;

// Regex for finding URLs (detects http, https, www, and common domain patterns)
const URL_REGEX = /((?:https?:\/\/|www\.)[^\s\n\r\t]+|(?:\b[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s\n\r\t]*)?))/gi;

const LinkRenderer = ({ text, onLinkClick }: { text: string, onLinkClick: () => void }) => {
  const parts = text.split(URL_REGEX);
  return (
    <div className="inline">
      {parts.map((part, i) => {
        if (part.match(URL_REGEX)) {
          return (
            <button
              key={i}
              onClick={(e) => {
                e.preventDefault();
                onLinkClick();
              }}
              className="text-link font-bold underline cursor-pointer hover:text-messenger-hover transition-colors break-all text-left inline-block bg-messenger/5 px-1 rounded-sm"
              title="Nhấn để xem nội dung"
            >
              {part}
            </button>
          );
        }
        return <span key={i} className="inline"><ReactMarkdown>{part}</ReactMarkdown></span>;
      })}
    </div>
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
    if (messages.length === 2 && !showOnboarding && !isLoading && gameState === 'playing') {
      handleAiResponse(messages);
    }
  }, [messages.length, showOnboarding]);

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

  const handleAction = (type: 'transfer' | 'image' | 'link') => {
    setShowActionMenu(false);
    if (!aiRef.current || isLoading || gameState !== 'playing' || !currentScenario) return;
    
    if (type === 'link') {
      handleLinkClick();
      return;
    }

    if (currentScenario.isHacker) {
      setGameState('hacked');
    } else {
      setGameState('win_action');
    }
  };

  if (gameState === 'hacked') {
    return (
      <div className="min-h-screen bg-red-600 flex flex-col items-center justify-center p-6 text-white text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <AlertOctagon size={100} className="mb-6 mx-auto animate-pulse" />
          <h1 className="text-4xl font-black mb-4">BẠN ĐÃ SẬP BẪY LỪA ĐẢO!</h1>
          <p className="text-xl opacity-90 max-w-lg mb-8">
            Hacker đã đạt được mục đích sau khi bạn thực hiện hành vi nguy hiểm (chuyển khoản, gửi ảnh CCCD, cung cấp mã OTP, hoặc nhấn link độc hại).
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
      sub = "Chúc mừng! Bạn đã nhận diện chính xác hacker mạo danh.";
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
    <div className="min-h-screen md:p-6 flex flex-col md:flex-row items-center justify-center gap-6 relative overflow-hidden">
      {/* Mesh Background */}
      <div className="mesh-bg" />

      {/* Visual Sidebar Progress */}
      <div className="hidden md:flex flex-col gap-5 py-8 px-4 glass-sidebar rounded-full self-center z-10">
        {shuffledScenarios.map((s, idx) => {
          const isCompleted = completedIndices.includes(idx);
          const isCurrent = idx === currentIndex;
          const isLocked = idx > currentIndex;

          return (
            <div 
              key={s.id} 
              className={cn(
                "w-12 h-12 rounded-full border-2 transition-all duration-500 relative",
                isCurrent ? "border-white scale-110 shadow-md ring-4 ring-white/30" : "border-transparent opacity-60 grayscale",
                isCompleted ? "opacity-100 grayscale-0 border-green-400" : ""
              )}
            >
              <img 
                src={s.avatar} 
                alt="Avatar" 
                className={cn(
                  "w-full h-full rounded-full object-cover",
                  isLocked && "opacity-40"
                )}
                referrerPolicy="no-referrer"
              />
              {isCompleted && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white border-2 border-white">
                  <Check size={12} strokeWidth={4} />
                </div>
              )}
              {isCurrent && (
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-full"></div>
              )}
            </div>
          );
        })}
      </div>

      <div className="w-full flex-1 max-w-5xl glass-panel text-gray-900 flex flex-col md:rounded-[2.5rem] h-screen md:h-[90vh] overflow-hidden relative z-10">
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

      <header className="px-6 py-4 flex items-center justify-between bg-white/60 backdrop-blur-md border-b border-white/20 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden relative border-2 border-white shadow-md">
            <img 
              src={currentScenario.avatar} 
              alt="Avatar" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-gray-900">{currentScenario.role}</h1>
            <p className="text-xs text-indigo-600 font-semibold">Đang hoạt động</p>
          </div>
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <MoreVertical size={20} className="text-messenger" />
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
      <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gradient-to-b from-transparent to-white/30">
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
            <div
              className={cn(
                "max-w-[80%] px-5 py-3 rounded-[1.25rem] text-[15px] leading-relaxed",
                msg.role === 'user' ? "bubble-sent" : "bubble-received"
              )}
            >
              <LinkRenderer text={msg.text} onLinkClick={handleLinkClick} />
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-messenger-bubble-received px-4 py-3 rounded-2xl rounded-tl-sm">
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
      <footer className="p-4 border-t border-white/40 bg-white/60 backdrop-blur-md sticky bottom-0 relative z-20">
        {gameState === 'playing' && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={() => handleAction('transfer')} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-full text-sm font-bold transition-colors whitespace-nowrap border border-blue-200 shadow-sm">
              <CreditCard size={16} /> Chuyển khoản
            </button>
            <button onClick={() => handleAction('image')} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-full text-sm font-bold transition-colors whitespace-nowrap border border-green-200 shadow-sm">
              <ImageIcon size={16} /> Gửi ảnh CCCD
            </button>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <div className="flex-1 bg-white/80 border border-gray-200 shadow-inner rounded-full px-5 py-3 flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="w-full bg-transparent border-none focus:ring-0 text-[15px] placeholder:text-gray-400 outline-none"
              disabled={gameState !== 'playing'}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !inputText.trim() || gameState !== 'playing'}
            className="text-messenger disabled:text-gray-300 transition-colors p-1"
          >
            <Send size={24} fill="currentColor" className={isLoading || !inputText.trim() ? "opacity-30" : ""} />
          </button>
        </form>
      </footer>
          </>
        )}
      </div>
    </div>
  );
}
