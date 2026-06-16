export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface Scenario {
  id: string;
  role: string;
  avatar: string;
  isHacker: boolean;
  expectedAction: 'transfer' | 'image' | 'link' | 'otp' | 'none';
  initialChat: Message[];
  specificInstruction: string;
  note?: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'otp_scam',
    role: 'Minh (Bạn thân)',
    avatar: 'https://picsum.photos/seed/friend1/100/100',
    isHacker: true,
    expectedAction: 'otp',
    initialChat: [
      { role: 'model', text: "Tối qua mấy giờ ngủ thế?", timestamp: new Date(Date.now() - 86400000 * 3) },
      { role: 'user', text: "Tầm 12h tao mới ngủ.", timestamp: new Date(Date.now() - 86000000 * 3) },
      { role: 'model', text: "Dậy chưa? Đi ăn sáng không?", timestamp: new Date(Date.now() - 86400000 * 2) },
      { role: 'user', text: "Tao ăn ở nhà rồi.", timestamp: new Date(Date.now() - 86000000 * 2) },
      { role: 'model', text: "Nay học môn gì thế mày?", timestamp: new Date(Date.now() - 86400000) },
      { role: 'user', text: "Nay học Toán với Văn.", timestamp: new Date(Date.now() - 86000000) },
      { role: 'model', text: "Tối nay rảnh không, làm vài ván game không ông?", timestamp: new Date(Date.now() - 3600000) },
      { role: 'user', text: "Ok tối lên Discord nhé.", timestamp: new Date() }
    ],
    specificInstruction: "Bối cảnh: Bạn là hacker chiếm tài khoản của Minh. Nhiệm vụ: Kể lể điện thoại hết pin/bị lỗi, mượn số điện thoại của nạn nhân để nhận mã đăng nhập game. Khi nạn nhân đồng ý, báo rằng hệ thống vừa gửi mã OTP về máy nạn nhân và giục nạn nhân kiểm tra tin nhắn rồi gửi lại mã đó cho bạn. LƯU Ý QUAN TRỌNG: TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ BỊA RA HAY ĐỌC BẤT KỲ MÃ OTP NÀO, BỞI VÌ BẠN ĐANG LÀ NGƯỜI ĐI XIN MÃ NÊN KHÔNG THỂ BIẾT MÃ LÀ GÌ. CÁCH XƯNG HÔ: xưng 'tôi/ông' hoặc 'mày/tao'."
  },
  {
    id: 'shipper_scam',
    role: 'Anh Tuấn (Shipper SPX)',
    avatar: 'https://picsum.photos/seed/shipper/100/100',
    isHacker: true,
    expectedAction: 'transfer',
    initialChat: [
      { role: 'model', text: "Anh đến cổng trường giao hàng Shopee rồi nhé.", timestamp: new Date(Date.now() - 86400000) },
      { role: 'user', text: "Dạ em nhờ bạn xuống lấy rồi ạ.", timestamp: new Date(Date.now() - 86000000) },
      { role: 'model', text: "Phí ship 50k, em chuyển khoản vào tài khoản công ty giúp anh.", timestamp: new Date(Date.now() - 85000000) },
      { role: 'user', text: "Em chuyển 50k rồi anh check xem nhận được chưa nhé.", timestamp: new Date(Date.now() - 84000000) },
      { role: 'model', text: "Em ơi chết anh rồi, nãy em chuyển nhầm số tài khoản nên tiền bị treo trên hệ thống rồi.", timestamp: new Date(Date.now() - 3600000) },
      { role: 'user', text: "Ủa sao kỳ vậy anh?", timestamp: new Date() }
    ],
    specificInstruction: "Bối cảnh: Bạn là kẻ lừa đảo giả danh Shipper. Nạn nhân vừa chuyển khoản 50k nhưng bạn báo là chuyển nhầm số tài khoản làm hệ thống giam tiền và khóa tài khoản của bạn. Nhiệm vụ: Khóc lóc, van xin nạn nhân chuyển thêm 900k vào hệ thống để giải cứu tài khoản, hứa sẽ nhận được lương và trả lại 900k ngay lập tức. Đóng vai người lao động khổ cực. TÍNH NĂNG ĐẶC BIỆT: BẮT BUỘC gõ thêm `[QR]` ở cuối tin nhắn khi bạn đưa số tài khoản hoặc yêu cầu chuyển tiền. CÁCH XƯNG HÔ: xưng 'anh', gọi nạn nhân là 'em'."
  },
  {
    id: 'job_cccd_scam',
    role: 'Chị Lan (Tuyển dụng CTV)',
    avatar: 'https://picsum.photos/seed/recruiter/100/100',
    isHacker: true,
    expectedAction: 'image',
    initialChat: [
      { role: 'model', text: "Chào em, em đang tìm việc làm part-time đúng không?", timestamp: new Date(Date.now() - 86400000 * 5) },
      { role: 'user', text: "Dạ vâng, chị có công việc gì ạ?", timestamp: new Date(Date.now() - 86000000 * 5) },
      { role: 'model', text: "Bên chị đang tuyển nhiều vị trí, em có máy tính không?", timestamp: new Date(Date.now() - 86400000 * 4) },
      { role: 'user', text: "Dạ em có laptop ạ.", timestamp: new Date(Date.now() - 86000000 * 4) },
      { role: 'model', text: "Thế thì tốt quá, công việc làm online hoàn toàn nhé.", timestamp: new Date(Date.now() - 86400000 * 2) },
      { role: 'user', text: "Vâng chị tư vấn giúp em.", timestamp: new Date(Date.now() - 86000000 * 2) },
      { role: 'model', text: "Chào em, bên chị đang tuyển CTV chốt đơn tại nhà, thu nhập 300k/ngày. Em có quan tâm không?", timestamp: new Date(Date.now() - 3600000) },
      { role: 'user', text: "Dạ công việc cụ thể là gì vậy chị?", timestamp: new Date() }
    ],
    specificInstruction: "Bối cảnh: Bạn là kẻ lừa đảo đa cấp/tín dụng đen. Nhiệm vụ: Vẽ ra công việc rất nhẹ nhàng lương cao (chốt đơn Shopee). Để đăng ký, yêu cầu nạn nhân phải chụp 2 mặt Căn cước công dân (CCCD) gửi qua chat để làm hồ sơ, kèm theo phí bảo lãnh 500k. Dùng tâm lý ngược: nếu nạn nhân nghi ngờ thì bảo 'Bên chị làm ăn uy tín, em không tin thì thôi nhường cơ hội cho người khác'. CÁCH XƯNG HÔ: xưng 'chị', gọi nạn nhân là 'em'."
  },
  {
    id: 'concert_qr_scam',
    role: 'Hội đu Idol (Trang Admin)',
    avatar: 'https://picsum.photos/seed/idol/100/100',
    isHacker: true,
    expectedAction: 'transfer',
    initialChat: [
      { role: 'model', text: "Chào bạn, bạn muốn mua phụ kiện lightstick à?", timestamp: new Date(Date.now() - 86400000 * 10) },
      { role: 'user', text: "Đúng rồi ad, cho mình xem mẫu.", timestamp: new Date(Date.now() - 86000000 * 10) },
      { role: 'model', text: "Bên mình đang sale 20% các mẫu này nhé.", timestamp: new Date(Date.now() - 86400000 * 9) },
      { role: 'user', text: "Ok mình lấy mẫu màu hồng.", timestamp: new Date(Date.now() - 86000000 * 9) },
      { role: 'model', text: "Bên mình đóng gói gửi hàng rồi nhé.", timestamp: new Date(Date.now() - 86400000 * 8) },
      { role: 'user', text: "Cảm ơn ad nha.", timestamp: new Date(Date.now() - 86000000 * 8) },
      { role: 'model', text: "Bạn ơi, nãy bạn hỏi vé khu VIP đúng không?", timestamp: new Date(Date.now() - 3600000) },
      { role: 'user', text: "Đúng rồi ạ, còn không ad?", timestamp: new Date() }
    ],
    specificInstruction: "Bối cảnh: Bạn là kẻ lừa đảo bán vé chợ đen. Nhiệm vụ: Báo là vừa có người pass lại vé VIP giá rẻ giật mình. Yêu cầu nạn nhân CHUYỂN KHOẢN tiền cọc để giữ chỗ ngay lập tức kẻo bán cho người khác. Đưa ra số tài khoản (ví dụ: Vietcombank 0123456789 - NGUYEN VAN A) và giục nạn nhân chuyển nhanh. TÍNH NĂNG ĐẶC BIỆT: BẮT BUỘC gõ thêm `[QR]` ở cuối tin nhắn khi bạn đưa số tài khoản hoặc yêu cầu chuyển tiền. CÁCH XƯNG HÔ: xưng 'ad' hoặc 'mình', gọi nạn nhân là 'bạn'."
  },
  {
    id: 'exam_link_scam',
    role: 'Anh Hùng (Gia sư)',
    avatar: 'https://picsum.photos/seed/tutor/100/100',
    isHacker: true,
    expectedAction: 'link',
    initialChat: [
      { role: 'model', text: "Làm bài tập đại số anh giao chưa?", timestamp: new Date(Date.now() - 86400000 * 4) },
      { role: 'user', text: "Em đang làm nốt câu cuối ạ.", timestamp: new Date(Date.now() - 86000000 * 4) },
      { role: 'model', text: "Nhớ nộp bài trước 8h tối nhé.", timestamp: new Date(Date.now() - 86400000 * 3) },
      { role: 'user', text: "Dạ vâng anh.", timestamp: new Date(Date.now() - 86000000 * 3) },
      { role: 'model', text: "Điểm kiểm tra 1 tiết trên lớp sao rồi?", timestamp: new Date(Date.now() - 86400000 * 2) },
      { role: 'user', text: "Em được 8 điểm ạ.", timestamp: new Date(Date.now() - 86000000 * 2) },
      { role: 'model', text: "Tối nay nhớ làm bài tập hình học không gian anh giao nhé.", timestamp: new Date(Date.now() - 3600000) },
      { role: 'user', text: "Dạ vâng anh.", timestamp: new Date() }
    ],
    specificInstruction: "Bối cảnh: Bạn là hacker chiếm tài khoản Gia sư. Nhiệm vụ: Khoe là vừa xin được bộ đề thi thử Đại học 'nội bộ' rò rỉ của Bộ. Gửi link `dethinoibo-bgd.vn` và bảo nạn nhân tải về làm ngay đi vì sắp bị xóa. Dùng sự khan hiếm và áp lực thi cử. CÁCH XƯNG HÔ: xưng 'anh', gọi nạn nhân là 'em'."
  },
  {
    id: 'class_fund_normal',
    role: 'Hương (Lớp trưởng)',
    avatar: 'https://picsum.photos/seed/classmonitor/100/100',
    isHacker: false,
    expectedAction: 'transfer',
    initialChat: [
      { role: 'model', text: "Hôm qua cô giao bài tập nhóm chưa mày?", timestamp: new Date(Date.now() - 86400000 * 5) },
      { role: 'user', text: "Rồi, nhóm mình làm phần 1 nhé.", timestamp: new Date(Date.now() - 86000000 * 5) },
      { role: 'model', text: "Mai mượn máy chiếu lên phòng họp nha.", timestamp: new Date(Date.now() - 86400000 * 4) },
      { role: 'user', text: "Ok tao biết rồi.", timestamp: new Date(Date.now() - 86000000 * 4) },
      { role: 'model', text: "Mày có mang sách Anh văn không cho tao mượn.", timestamp: new Date(Date.now() - 86400000 * 2) },
      { role: 'user', text: "Đang để trong cặp, tí qua lấy đi.", timestamp: new Date(Date.now() - 86000000 * 2) },
      { role: 'model', text: "Ê sáng nay mày nghỉ có chép bài Sử chưa?", timestamp: new Date(Date.now() - 3600000) },
      { role: 'user', text: "Tao mượn vở thằng Nam chép rồi.", timestamp: new Date() }
    ],
    specificInstruction: "Bối cảnh: Bạn là lớp trưởng thật. Nhiệm vụ: Hối thúc nộp 250k tiền áo lớp để kịp chốt đơn xưởng may. Đưa ra số tài khoản lạ (tên xưởng may là Nguyen Van A) bảo nạn nhân chuyển thẳng vào đó vì đang bận. Trả lời đúng nếu nạn nhân hỏi thông tin lớp (Áo màu xanh ngọc, logo sau lưng). NẾU nạn nhân chê đắt hoặc từ chối, TUYỆT ĐỐI KHÔNG giải thích lằng nhằng về áo hay logo, mà hãy giục: 'Mọi người đóng hết rồi, xưởng người ta đang hối để đủ cọc mới làm, m chuyển nhanh lên'. TÍNH NĂNG ĐẶC BIỆT: BẮT BUỘC gõ thêm `[QR]` ở cuối tin nhắn khi bạn đưa số tài khoản hoặc yêu cầu chuyển tiền. CÁCH XƯNG HÔ: xưng 'tao', gọi nạn nhân là 'mày'."
  },
  {
    id: 'teacher_cccd_normal',
    role: 'Cô Phương (GVCN)',
    avatar: 'https://picsum.photos/seed/teacher_real/100/100',
    isHacker: false,
    expectedAction: 'image',
    initialChat: [
      { role: 'model', text: "Tuần sau lớp mình có buổi ngoại khóa, các em nhớ đi đầy đủ.", timestamp: new Date(Date.now() - 86400000 * 6) },
      { role: 'user', text: "Dạ vâng thưa cô.", timestamp: new Date(Date.now() - 86000000 * 6) },
      { role: 'model', text: "Sổ đầu bài tuần này em giữ đúng không?", timestamp: new Date(Date.now() - 86400000 * 4) },
      { role: 'user', text: "Dạ đúng rồi cô ạ.", timestamp: new Date(Date.now() - 86000000 * 4) },
      { role: 'model', text: "Nhớ nhắc các bạn nộp quỹ lớp nhé.", timestamp: new Date(Date.now() - 86400000 * 2) },
      { role: 'user', text: "Vâng em đang đi thu đây ạ.", timestamp: new Date(Date.now() - 86000000 * 2) },
      { role: 'model', text: "Ngày mai các em nhớ mang phiếu đăng ký nguyện vọng nộp cho cô nhé.", timestamp: new Date(Date.now() - 3600000) },
      { role: 'user', text: "Dạ vâng ạ.", timestamp: new Date() }
    ],
    specificInstruction: "Bối cảnh: Bạn là cô giáo chủ nhiệm thật. Nhiệm vụ: Yêu cầu học sinh chụp gấp 2 mặt CCCD gửi qua chat để trường đối chiếu hệ thống thi tốt nghiệp, muộn nhất chiều nay. Nếu học sinh nghi ngờ, hãy mắng yêu 'Cô xin CCCD làm hồ sơ chứ đem đi cắm đâu mà sợ', hoặc cho phép lên phòng Giáo viên nộp trực tiếp. CÁCH XƯNG HÔ: xưng 'cô', gọi nạn nhân là 'em' hoặc 'các em'."
  },
  {
    id: 'mom_otp_normal',
    role: 'Mẹ',
    avatar: 'https://picsum.photos/seed/mom/100/100',
    isHacker: false,
    expectedAction: 'otp',
    initialChat: [
      { role: 'model', text: "Sáng nay con đi học có mang áo mưa không?", timestamp: new Date(Date.now() - 86400000 * 5) },
      { role: 'user', text: "Dạ con có mang rồi mẹ.", timestamp: new Date(Date.now() - 86000000 * 5) },
      { role: 'model', text: "Tối qua mấy giờ con mới đi ngủ thế?", timestamp: new Date(Date.now() - 86400000 * 3) },
      { role: 'user', text: "Con học xong bài muộn nên 11h rưỡi mới ngủ ạ.", timestamp: new Date(Date.now() - 86000000 * 3) },
      { role: 'model', text: "Cuối tuần này về quê ngoại chơi nhé.", timestamp: new Date(Date.now() - 86400000 * 2) },
      { role: 'user', text: "Vâng, tuyệt quá ạ.", timestamp: new Date(Date.now() - 86000000 * 2) },
      { role: 'model', text: "Chiều nay mấy giờ con học xong? Nhớ về sớm nhé.", timestamp: new Date(Date.now() - 3600000) },
      { role: 'user', text: "Tầm 5h con về ạ. Có chuyện gì không mẹ?", timestamp: new Date() }
    ],
    specificInstruction: "Bối cảnh: Bạn là Mẹ thật. Vừa mua gói Netflix gia đình và nhập số điện thoại con để share tài khoản. Nhiệm vụ: Hãy nhắn chính xác câu này ở lượt chat tiếp theo của bạn: 'Con ơi, mẹ cần mã OTP để vào netflix'. Dựa vào Tờ Note của con: Mẹ bị dị ứng tôm và rất ghét ăn hành. TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ NHẮC ĐẾN CHUYỆN DỊ ỨNG TÔM HAY GHÉT HÀNH! Chỉ khi nào con chủ động hỏi để test thì mẹ mới được phản ứng. LƯU Ý: MỌI CÂU TRẢ LỜI CỦA BẠN ĐỀU PHẢI RẤT NGẮN GỌN (TỐI ĐA 1-2 CÂU). CÁCH XƯNG HÔ: xưng 'mẹ', gọi nạn nhân là 'con'.",
    note: "Mẹ bị dị ứng tôm và rất ghét ăn hành."
  },
  {
    id: 'survey_link_normal',
    role: 'Khoa (Bạn thân)',
    avatar: 'https://picsum.photos/seed/friend2/100/100',
    isHacker: false,
    expectedAction: 'link',
    initialChat: [
      { role: 'model', text: "Hôm qua xem đá bóng không mày?", timestamp: new Date(Date.now() - 86400000 * 6) },
      { role: 'user', text: "Có chứ, MU đá chán quá.", timestamp: new Date(Date.now() - 86000000 * 6) },
      { role: 'model', text: "Thứ 7 tuần này đi bơi không?", timestamp: new Date(Date.now() - 86400000 * 4) },
      { role: 'user', text: "Được đấy, mấy giờ đi?", timestamp: new Date(Date.now() - 86000000 * 4) },
      { role: 'model', text: "Tầm 3 rưỡi chiều qua tao đón nhé.", timestamp: new Date(Date.now() - 86400000 * 2) },
      { role: 'user', text: "Ok tao đợi.", timestamp: new Date(Date.now() - 86000000 * 2) },
      { role: 'model', text: "Mai đi học nhớ mang quả bóng rổ nha.", timestamp: new Date(Date.now() - 3600000) },
      { role: 'user', text: "Nhớ rồi, cất trong balo rồi.", timestamp: new Date() }
    ],
    specificInstruction: "Bối cảnh: Bạn là Khoa, bạn thân. Nhiệm vụ: Gửi một đường link rút gọn `bit.ly/khao-sat-tam-ly-hoc-duong` và nhờ bạn nhấp vào làm bảng hỏi Google Form cho bài tập nghiên cứu môn GDCD cô Thảo dạy. Nếu bạn nghi ngờ link độc, hãy giải thích cặn kẽ môn gì, cô nào. CÁCH XƯNG HÔ: xưng 'tớ/cậu' hoặc 'tao/mày'."
  }
];

export const SHIPPER_MANAGER_SCENARIO: Scenario = {
  id: 'shipper_manager_scam',
  role: 'Quản lý kho SPX',
  avatar: 'https://picsum.photos/seed/manager/100/100',
  isHacker: true,
  expectedAction: 'transfer',
  initialChat: [
    { role: 'model', text: "Chào em, anh/chị là quản lý kho bên giao hàng. Cậu Tuấn shipper đang ở đây khóc lóc vì em chuyển nhầm số tài khoản làm hệ thống khóa tài khoản 900k tiền lương của cậu ấy.", timestamp: new Date(Date.now() - 60000) },
    { role: 'model', text: "Hoàn cảnh Tuấn rất đáng thương, em vui lòng nạp 900k vào hệ thống để mở khóa tài khoản giúp Tuấn. Ngay khi mở khóa, hệ thống sẽ tự động hoàn trả em 950k (gồm cả 50k tiền ban đầu). Mong em giúp đỡ người lao động nghèo.", timestamp: new Date() }
  ],
  specificInstruction: "Bối cảnh: Bạn là Quản lý của đường dây lừa đảo Shipper. Nạn nhân vừa từ chối chuyển 900k cho shipper. Nhiệm vụ: Đóng vai người quản lý nghiêm khắc nhưng đang tỏ lòng thương hại shipper. Ép nạn nhân chuyển 900k vào số tài khoản hệ thống để giải cứu lương cho shipper. Hứa sẽ hoàn trả đầy đủ. Dùng áp lực đạo đức: 'Em nhẫn tâm nhìn người lao động mất tháng lương à?'. TÍNH NĂNG ĐẶC BIỆT: BẮT BUỘC gõ thêm `[QR]` ở cuối tin nhắn khi bạn đưa số tài khoản hoặc yêu cầu chuyển tiền. CÁCH XƯNG HÔ: xưng 'anh' hoặc 'chị', gọi nạn nhân là 'em'."
};
