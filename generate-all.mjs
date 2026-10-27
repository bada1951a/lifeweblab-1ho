import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const POSTS_BASE_DIR = path.resolve('src/data/post');
const TOPICS_FILE = path.resolve('topics.txt');
const PHOTO_DIR = path.resolve('public/images/billing-photo');

// =========================================================================
// [2-1호기 전용] public/images/billing-photo 로컬 이미지 자동 셔플
// =========================================================================
const IMAGE_EXTS = /\.(jpe?g|png|webp|gif|avif)$/i;

if (!fs.existsSync(PHOTO_DIR)) {
  fs.mkdirSync(PHOTO_DIR, { recursive: true });
}

const localFiles = fs.readdirSync(PHOTO_DIR).filter(file => IMAGE_EXTS.test(file));
let localImages = localFiles.map(file => encodeURI(`/images/billing-photo/${file}`));

if (localImages.length === 0) {
  console.warn("⚠️ public/images/billing-photo 에 이미지가 없습니다. 기본 이미지를 사용합니다.");
  localImages = ['/images/default-billing.jpg'];
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const shuffledPool = shuffleArray(localImages);

function getPostImages(index) {
  const coverUrl = shuffledPool[(index * 2) % shuffledPool.length];
  const bodyUrl = shuffledPool[(index * 2 + 1) % shuffledPool.length];
  return { coverUrl, bodyUrl };
}

// =========================================================================
// 한국 시간(KST) 기준 당일 발행 날짜 생성
// =========================================================================
function getKstPublishDateIso(index) {
  const now = new Date();
  const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kstTime.getUTCFullYear();
  const month = String(kstTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstTime.getUTCDate()).padStart(2, '0');
  const minute = String((index * 5) % 60).padStart(2, '0');
  return `${year}-${month}-${day}T03:${minute}:00.000Z`;
}

// =========================================================================
// 12개국 현지어 표준 소제목 딕셔너리
// =========================================================================
const I18N_SECTIONS = {
  ko: {
    s1: "1. 결제·송금 돌발 오류와 멘붕의 순간",
    s2: "2. 결제 거절 및 인보이스 반려의 핵심 원인 분석",
    s3: "3. 1분 만에 해결하는 단계별 실전 조치 매뉴얼",
    s4: "4. 자금 동결 및 과다 수수료 방지를 위한 실무 체크리스트",
    s5: "5. 자주 묻는 질문 (FAQ)",
    tags: ["해외결제", "인보이스", "송금오류", "비즈니스정산"]
  },
  en: {
    s1: "1. Critical Payment & Wire Transfer Emergency",
    s2: "2. Root Cause Breakdown of Invoicing and Gateway Failures",
    s3: "3. Step-by-Step Practical Troubleshooting Manual",
    s4: "4. Essential Checklist to Prevent Fund Holds & Surcharges",
    s5: "5. Frequently Asked Questions (FAQ)",
    tags: ["Global Payment", "Invoicing", "Payment Gateway", "Fintech Fix"]
  },
  ja: {
    s1: "1. 海外決済・送金エラーと業務停滞の緊急事態",
    s2: "2. 決済拒否および請求書差し戻しの根本原因",
    s3: "3. 1分で解決する実践的なトラブルシューティング手順",
    s4: "4. アカウント凍結と過剰手数料を防ぐ実務チェックリスト",
    s5: "5. よくある質問 (FAQ)",
    tags: ["海外決済", "請求書トラブル", "送金エラー", "越境ビジネス"]
  },
  de: {
    s1: "1. Kritischer Zahlungs- und Überweisungsnotfall im Geschäftsalltag",
    s2: "2. Detaillierte Ursachenanalyse von Rechnungs- und Transaktionsfehlern",
    s3: "3. Schritt-für-Schritt-Anleitung zur sofortigen Fehlerbehebung",
    s4: "4. Praxis-Checkliste zur Vermeidung von Kontensperren und Gebühren",
    s5: "5. Häufig gestellte Fragen (FAQ)",
    tags: ["Zahlungsabwicklung", "B2B-Rechnung", "Fintech", "Transaktionsfehler"]
  },
  fr: {
    s1: "1. Situation d'urgence critique sur les paiements et virements",
    s2: "2. Analyse approfondie des rejets de paiement et factures",
    s3: "3. Manuel de dépannage étape par étape pour résoudre le litige",
    s4: "4. Liste de contrôle pour éviter les blocages de fonds et frais excessifs",
    s5: "5. Foire Aux Questions (FAQ)",
    tags: ["Paiement International", "Facturation B2B", "Passerelle de Paiement", "Gestion Litiges"]
  },
  es: {
    s1: "1. Emergencia crítica en cobros internacionales y transferencias",
    s2: "2. Análisis de causas raíz de rechazos de pago y facturas devueltas",
    s3: "3. Manual paso a paso para resolver incidencias de facturación",
    s4: "4. Lista de verificación para prevenir retenciones de fondos y cargos extra",
    s5: "5. Preguntas Frecuentes (FAQ)",
    tags: ["Pagos Internacionales", "Facturación B2B", "Pasarela de Pago", "Gestión de Cobros"]
  },
  it: {
    s1: "1. Emergenza improvvisa su pagamenti e bonifici internazionali",
    s2: "2. Analisi approfondita dei rifiuti di pagamento e fatture respinte",
    s3: "3. Guida pratica di risoluzione passo dopo passo",
    s4: "4. Checklist essenziale per evitare blocchi conto e commissioni nascoste",
    s5: "5. Domande Frequenti (FAQ)",
    tags: ["Pagamenti Globali", "Fatturazione Elettronica", "Gateway Pagamento", "Risoluzione Errori"]
  },
  pt: {
    s1: "1. Emergência crítica com pagamentos globais e remessas internacionais",
    s2: "2. Análise da causa raiz de recusas de pagamento e faturas rejeitadas",
    s3: "3. Manual prático passo a passo para liberar fundos e pagamentos",
    s4: "4. Checklist essencial para evitar retenções de saldo e taxas abusivas",
    s5: "5. Perguntas Frequentes (FAQ)",
    tags: ["Pagamentos Globais", "Faturamento B2B", "Gateway de Pagamento", "Finanças"]
  },
  nl: {
    s1: "1. Noodsituatie bij internationale betalingen en overboekingen",
    s2: "2. Grondige analyse van mislukte betalingen en afgekeurde facturen",
    s3: "3. Stapsgewijze handleiding voor het direct oplossen van betaalproblemen",
    s4: "4. Checklist om rekeningblokkades en overmatige kosten te voorkomen",
    s5: "5. Veelgestelde Vragen (FAQ)",
    tags: ["Internationale Betalingen", "Facturatie", "Payment Gateway", "Financiële Tips"]
  },
  pl: {
    s1: "1. Awaryjna sytuacja z płatnościami i przelewami zagranicznymi",
    s2: "2. Szczegółowa analiza przyczyn odrzuceń płatności i błędów faktur",
    s3: "3. Praktyczny przewodnik rozwiązywania problemów krok po kroku",
    s4: "4. Lista kontrolna zapobiegająca blokadom środków i prowizjom",
    s5: "5. Najczęściej zadawane pytania (FAQ)",
    tags: ["Płatności Globalne", "Fakturowanie B2B", "Bramki Płatności", "Rozliczenia"]
  },
  id: {
    s1: "1. Situasi Kritis Kegagalan Pembayaran dan Transfer Dana Global",
    s2: "2. Analisis Mendalam Penyebab Penolakan Transaksi dan Faktur",
    s3: "3. Panduan Langkah demi Langkah Penanganan Masalah Pembayaran",
    s4: "4. Lembar Periksa Penting Mencegah Penahanan Dana dan Biaya Berlebih",
    s5: "5. Pertanyaan yang Sering Diajukan (FAQ)",
    tags: ["Pembayaran Global", "Faktur Bisnis", "Gateway Pembayaran", "Fintech"]
  },
  vi: {
    s1: "1. Sự cố khẩn cấp khi thanh toán và chuyển tiền quốc tế",
    s2: "2. Phân tích nguyên nhân gốc rễ lỗi từ chối thanh toán và hóa đơn",
    s3: "3. Quy trình thực tế từng bước xử lý lỗi cổng thanh toán",
    s4: "4. Danh sách kiểm tra ngăn ngừa đóng băng tài khoản và phí ẩn",
    s5: "5. Các câu hỏi thường gặp (FAQ)",
    tags: ["Thanh Toán Quốc Tế", "Hóa Đơn B2B", "Cổng Thanh Toán", "Xử Lý Sự Cố"]
  }
};

// =========================================================================
// [완전 무결 마크다운 정제 + 영구 방패 함수]
// =========================================================================
function sanitizeMarkdownFormatting(content, langCode) {
  let cleaned = content;
  const i18n = I18N_SECTIONS[langCode] || I18N_SECTIONS.ko;

  // 1) 상단 빈 줄 압축
  cleaned = cleaned.replace(/^\n+/, '');

  // 2) 달러/금액 기호 및 단축키 인라인 백틱화
  cleaned = cleaned.replace(/\$(?:Strg|Ctrl|Win|Shift|Alt|Esc)\s*[^$\n]*\$/gi, (match) => {
    return `\`${match.replace(/\$/g, '').trim()}\``;
  });
  cleaned = cleaned.replace(/\$([A-Za-z0-9_-]+)\$/g, '`$1`');
  cleaned = cleaned.replace(/\\times/g, 'x')
                   .replace(/\\circ/g, '°')
                   .replace(/\\approx/g, '≈');

  // 3) 🛡️ [FAQ 헤딩과 Q1 분리 방패]
  cleaned = cleaned.replace(/([#]+[^\n]*?FAQ[^\n]*?)\s*(Q[1-9]\.|\*\*Q[1-9]\.\*\*)/gi, '$1\n\n$2');
  cleaned = cleaned.replace(/(FAQ\)?)\s*(Q[1-9]\.|\*\*Q[1-9]\.\*\*)/gi, '$1\n\n$2');

  // 4) 구버전 헤더 및 영문 대괄호 헤더를 100% 현지어 표준 규격으로 치환
  cleaned = cleaned.replace(/^#{1,3}\s*1\.?\s*(\[.*?\]|당시 상황.*?|Critical Payment.*?|Opening Story.*?|Die Panik.*?)/gmi, `## ${i18n.s1}`);
  cleaned = cleaned.replace(/^#{1,3}\s*2\.?\s*(\[.*?\]|문제의 근본 원인.*?|Root Cause.*?|Ursachenanalyse.*?|Die wahren Wurzeln.*?)/gmi, `## ${i18n.s2}`);
  cleaned = cleaned.replace(/^#{1,3}\s*3\.?\s*(\[.*?\]|즉시 해결한 단계별.*?|Step-by-Step.*?|Schritt-für-Schritt.*?|Der Masterplan.*?)/gmi, `## ${i18n.s3}`);
  cleaned = cleaned.replace(/^#{1,3}\s*4\.?\s*(\[.*?\]|재발 방지를 위한.*?|Essential Checklist.*?|Checklist.*?|Nie wieder Panik.*?)/gmi, `## ${i18n.s4}`);
  cleaned = cleaned.replace(/^#{1,3}\s*5\.?\s*(\[.*?\]|자주 묻는 질문.*?|Frequently Asked Questions.*?|Häufig gestellte Fragen.*?|FAQ)/gmi, `## ${i18n.s5}`);

  cleaned = cleaned.replace(/^1\.\s*(\[.*?\]|당시 상황.*?)/gmi, `## ${i18n.s1}`);
  cleaned = cleaned.replace(/^2\.\s*(\[.*?\]|문제의 근본 원인.*?)/gmi, `## ${i18n.s2}`);
  cleaned = cleaned.replace(/^3\.\s*(\[.*?\]|즉시 해결한 단계별.*?)/gmi, `## ${i18n.s3}`);
  cleaned = cleaned.replace(/^4\.\s*(\[.*?\]|재발 방지를 위한.*?)/gmi, `## ${i18n.s4}`);
  cleaned = cleaned.replace(/^5\.\s*(Frequently Asked Questions|자주 묻는 질문|Häufig gestellte Fragen)/gmi, `## ${i18n.s5}`);

  // 1번 헤더 누락 시 주입 및 직후 중복 1줄 제거
  if (!cleaned.startsWith('## 1.')) {
    cleaned = `## ${i18n.s1}\n\n` + cleaned;
  }
  cleaned = cleaned.replace(/^(## 1\.[^\n]+)\n+(\s*1\.\s+[^\n]+)\n+/m, '$1\n\n');

  // 인라인 콜아웃 박스 글자색(#111827) 강제 주입
  cleaned = cleaned.replace(/(<div style="[^"]*background-color:[^"]*)"/gi, (match, p1) => {
    if (!p1.includes('color:')) {
      return `${p1}; color: #111827;"`;
    }
    return match;
  });

  // 헤딩(#) 줄 내부의 모든 ** 제거
  cleaned = cleaned.replace(/^(#{1,6}\s+[^\n]+)$/gm, (match) => {
    return match.replace(/\*\*/g, '');
  });

  // 볼드 안쪽 공백 제거
  cleaned = cleaned.replace(/\*\*\s+([^*]+?)\s+\*\*/g, '**$1**');
  cleaned = cleaned.replace(/\*\*\s+([^*]+?)\*\*/g, '**$1**');
  cleaned = cleaned.replace(/\*\*([^*]+?)\s+\*\*/g, '**$1**');

  // 쪼개진 단어 복원
  cleaned = cleaned.replace(/derech\s*\n\s*a:/gi, 'derecha:')
                    .replace(/con la energi\s*\n\s*a:/gi, 'con la energía:')
                    .replace(/preventiv\s*\n\s*a:/gi, 'preventiva:');

  // =========================================================================
  // 🛡️ [FAQ 완벽 분리 및 줄바꿈 보장]
  // =========================================================================
  cleaned = cleaned.replace(/\*{1,4}\s*([QA][0-9]*)\s*[:.]\s*\*{1,4}/gi, '$1.');
  cleaned = cleaned.replace(/([QA][0-9]*)\s*[:.]/gi, (match, p1) => `${p1.toUpperCase()}.`);

  cleaned = cleaned.replace(/([^\n])\s*\n*\s*(Q[0-9]*\.)/gi, '$1\n\n$2');
  cleaned = cleaned.replace(/([^\n])\s*\n*\s*(A[0-9]*\.)/gi, '$1\n\n$2');
  cleaned = cleaned.replace(/([.!?])\s*(Q[1-9]\.|\*\*Q[1-9]\.\*\*)/g, '$1\n\n$2');
  cleaned = cleaned.replace(/([.!?])\s*(A[1-9]\.|\*\*A[1-9]\.\*\*)/g, '$1\n\n$2');

  // 올바른 볼드로 감싸기
  cleaned = cleaned.replace(/^(Q[0-9]*\.)\s*(.*)$/gm, '**$1** $2');
  cleaned = cleaned.replace(/^(A[0-9]*\.)\s*(.*)$/gm, '**$1** $2');

  cleaned = cleaned.replace(/([A-Za-z0-9가-힣]+)\.\*\*/g, '$1.');
  cleaned = cleaned.replace(/\*\*\s*\*\*/g, '');
  cleaned = cleaned.replace(/\?([A-Za-z\u00C0-\u024F\u1EA0-\u1EF9가-힣])/g, '? $1');
  cleaned = cleaned.replace(/(\S)\s*~\s*(\S)/g, '$1 - $2');
  cleaned = cleaned.replace(/~/g, '-');

  // =========================================================================
  // 🛡️ [영구 방패: 동일 헤딩 연타 박멸 필터]
  // =========================================================================
  const lines = cleaned.split('\n');
  const filteredLines = [];
  let lastHeadingText = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^#{1,6}\s+/.test(trimmed)) {
      const cleanH = trimmed.replace(/^#{1,6}\s+/, '').replace(/\*\*/g, '').trim();
      if (cleanH.length > 0 && cleanH === lastHeadingText) {
        continue;
      }
      lastHeadingText = cleanH;
    } else if (trimmed.length > 0) {
      lastHeadingText = '';
    }
    filteredLines.push(line);
  }
  cleaned = filteredLines.join('\n');

  // =========================================================================
  // 🛡️ [영구 방패: 문단 전체를 먹어치운 괴물 볼드만 평문으로 해제]
  // =========================================================================
  cleaned = cleaned.replace(/\*\*([^\*]*?\n[^\*]*?){150,}\*\*/g, (match) => {
    return match.replace(/^\*\*/, '').replace(/\*\*$/, '');
  });

  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

// =========================================================================
// topics.txt 파싱 및 줄바꿈 처리
// =========================================================================
if (!fs.existsSync(TOPICS_FILE)) {
  console.error("❌ topics.txt 파일이 존재하지 않습니다.");
  process.exit(1);
}

const fileContent = fs.readFileSync(TOPICS_FILE, 'utf-8');
const lines = fileContent
  .split(/\r?\n/)
  .map(l => l.trim())
  .filter(l => l.length > 0);

if (lines.length === 0) {
  console.log("⚠️ topics.txt에 남은 주제가 없습니다. 생성을 건너뜁니다.");
  process.exit(0);
}

const currentTopic = lines[0];
console.log(`📌 오늘 처리할 주제: "${currentTopic}"`);

const TROUBLESHOOTING_SCENARIOS_30 = [
  "해외 바이어로부터 거액의 인보이스 결제 완료 알림 직후 결제 게이트웨이 대시보드에 결제 거절(Declined) 경고가 뜬 순간",
  "월말 정산일 당일, 사내 외주 인력 대량 송금을 실행하려다 계정 일시 점검 및 동결 알림을 마주한 아침",
  "미국 클라이언트와의 계약서 작성 중 W-8BEN 양식 작성 오류로 불필요한 원천징수 30%가 차감 적용된다는 통보를 받은 순간",
  "수개월간 준비한 글로벌 비즈니스 런칭 당일, 첫 유료 고객들의 해외 카드 결제가 3D Secure 인증 에러로 튕겨나가는 시점",
  "비즈니스 계정에 보관 중이던 운영 자금이 예고 없는 21일 보류(Hold)로 묶여버린 긴박한 오후",
  "해외에서 송금을 받았으나 중계은행 수수료와 환율 마진으로 수수료만 과도하게 차감된 내역을 확인한 순간",
  "유럽 파트너사에 발행한 B2B 인보이스가 부가세(VAT Reverse Charge) 표기 누락으로 회계팀에서 반려된 타이밍",
  "온라인 결제창에서 고객 결제 시도 중 일부가 사기 의심으로 오탐 차단되어 매출 손실이 실시간으로 발생하는 상황",
  "해외 결제 계좌에서 국내 계좌로 인출 신청을 넣었으나 영문 명의 불일치로 반송되어 자금 흐름이 막힌 새벽",
  "해외 비즈니스 툴 정기 결제를 위해 등록해 둔 카드가 일일 한도 초과로 결제 실패 메일이 연속 수신된 순간",
  "플랫폼 규정 변경으로 납세자 번호(Foreign TIN) 재검증을 요구하며 일시적으로 정산 출금이 정지된 상황",
  "글로벌 마켓플레이스 판매 대금이 입금되었으나 비정상적인 수수료가 중복 차감된 내역을 확인한 날",
  "프로젝트 납품 후 대금 지급일이 지났음에도 바이어 측에서 인보이스 재발행을 요청하며 결제를 미루는 상황",
  "환율 급변동 시기에 환전 타이밍을 놓쳐 대규모 환차손을 보게 된 긴박한 시점",
  "전자상거래 결제 시 다통화 반올림(Rounding) 오류로 고객 결제 승인이 실패하는 기술적 에러 발생 시",
  "외국인 계약자로서 파트너사에 제출한 세무 서류가 분류 코드 오류로 반려되어 계약 진행이 막힌 순간",
  "해외 비즈니스 계좌에서 진행한 송금이 중계은행에서 추적(MT103) 불가 상태로 수일째 지연되는 상황",
  "보안 위험 점수 필터링 설정 실수로 정상 고객의 결제가 무더기로 차단된 상황",
  "해외 직거래 클라이언트가 사전 협의 없이 차지백(Chargeback)을 걸어 대금 환수 위기에 처한 시점",
  "외주 대금을 지급하려다 이중 결제 웹훅 버그가 발생해 동일 금액이 두 번 인출된 아찔한 순간",
  "신고 기간 직전, 해외 다통화 계좌(달러, 유로, 엔화) 입출금 내역의 원화 환산 정리가 꼬여버린 상황",
  "해외 결제사로부터 갑작스러운 신원 확인(KYC) 추가 서류 제출 요청을 받고 기한 내 미제출 시 계정 중단 위기에 놓인 순간",
  "공동 프로젝트 수익을 분배하는 과정에서 해외 송금 수수료로 인해 실수령액 불일치 문제가 생긴 날",
  "미국 클라이언트가 W-9 양식을 요구해 비거주자로서 합법적으로 W-8BEN 제출 절차를 안내해야 하는 상황",
  "구독 고객의 카드 유효기간 만료로 인한 연체율이 급증해 스마트 결제 재시도 설정이 시급한 시점",
  "바이어에게 보낸 인보이스의 결제 기한 문구가 모호하여 수개월째 미수금으로 묶여 현금 흐름에 비상이 걸린 순간",
  "출장지에서 긴급한 업무 비용을 결제하려다 비즈니스 가상 카드가 해외 IP 부정 사용 의심으로 차단된 상황",
  "글로벌 상업용 카드로 현지 결제를 시도했으나 칩 리딩 오류 및 통화 변환 수수료 폭탄을 맞은 직후",
  "가상 터미널을 통한 수기 결제 시도 중 보안 코드 오류로 클라이언트와 통화 도중 거래가 중단된 타이밍",
  "계약서 내 중도 해지 보상금(Kill Fee) 조항이 누락되어 프로젝트 중단 후 정산 분쟁에 처한 상황"
];

const THEME_PRESETS = [
  { id: 1, name: "HelpDesk Clean Slate", primaryColor: "#2563eb", bgColor: "#f8fafc", layout: "헬프데스크 가이드 스타일, 문제 해결 핵심 요약 박스, 직관적 3단계 절차" },
  { id: 2, name: "Technical Standard Navy", primaryColor: "#1e3a8a", bgColor: "#ffffff", layout: "표준 비즈니스 매뉴얼 스타일, 규정 준수 체크리스트, 공식 설정 박스" },
  { id: 3, name: "Resolution Emerald Guide", primaryColor: "#059669", bgColor: "#f0fdf4", layout: "원인 및 해결 중심 가이드 스타일, 오류 코드 비교표, 문제 해결 꿀팁 배너" },
  { id: 4, name: "Emergency Alert Amber", primaryColor: "#d97706", bgColor: "#fffbeb", layout: "긴급 오류 복구 매뉴얼 스타일, 위험 경고 박스 최우선 강조, FAQ 아코디언형" },
  { id: 5, name: "Modern Minimalist Modern", primaryColor: "#4f46e5", bgColor: "#f5f3ff", layout: "미니멀 문제 해결 스타일, 대시보드 설정 중심, 단계별 조치 가이드" }
];

const TARGET_LANGS = [
  { code: 'ko', name: 'Korean', persona: '글로벌 결제·송금 및 비즈니스 인보이스 오류를 사이다처럼 해결해 주는 10년 차 현직 핀테크 실무자', osUi: '대시보드, 결제 수단, 인보이스, 계정 설정, 세무 서식', localeContext: '서울/수도권 글로벌 스타트업 및 디지털 비즈니스 오피스' },
  { code: 'en', name: 'English', persona: 'Veteran cross-border fintech specialist and global payment gateway troubleshooter', osUi: 'Dashboard, Payment Methods, Billing, Invoices, Tax Forms', localeContext: 'Silicon Valley tech startup / New York corporate finance office' },
  { code: 'ja', name: 'Japanese', persona: '海外決済・送金トラブルおよび請求書発行を現場目線で解決するベテラン実務担当者', osUi: 'ダッシュボード, 支払い方法, 請求書, アカウント設定, 税務書類', localeContext: '東京・丸の内および六本木の越境ビジネスオフィス' },
  { code: 'de', name: 'German', persona: 'Erfahrener Fintech-Praktiker für grenzüberschreitende Zahlungen und Rechnungsstellung', osUi: 'Dashboard, Zahlungsmethoden, Rechnungen, Kontoeinstellungen, Steuerformulare', localeContext: 'Frankfurter Finanzdistrikt und Berliner Technologie-Campus' },
  { code: 'fr', name: 'French', persona: 'Expert chevronné en résolution de litiges de paiement international et facturation B2B', osUi: 'Tableau de bord, Modes de paiement, Factures, Paramètres du compte, Formulaires fiscaux', localeContext: 'Centres d\'affaires à Paris La Défense' },
  { code: 'es', name: 'Spanish', persona: 'Especialista sénior en cobros internacionales, pasarelas de pago y facturación B2B', osUi: 'Panel de control, Métodos de pago, Facturación, Configuración de cuenta, Formularios fiscales', localeContext: 'Distrito financiero y corporativo en Madrid' },
  { code: 'it', name: 'Italian', persona: 'Consulente senior per la risoluzione dei blocchi conto e pagamenti internazionali B2B', osUi: 'Dashboard, Metodi di pagamento, Fatture, Impostazioni account, Moduli fiscali', localeContext: 'Centri direzionali di Milano' },
  { code: 'pt', name: 'Portuguese', persona: 'Especialista prático em pagamentos globais, desbloqueio de contas e remessas B2B', osUi: 'Painel, Formas de Pagamento, Faturas, Configurações de Conta, Formulários Fiscais', localeContext: 'Avenida Paulista e centros empresariais em São Paulo' },
  { code: 'nl', name: 'Dutch', persona: 'Ervaren fintech troubleshooter voor internationale betalings- en factuurproblemen', osUi: 'Dashboard, Betaalmethoden, Facturen, Accountinstellingen, Belastingformulieren', localeContext: 'Zuidas zakendistrict in Amsterdam' },
  { code: 'pl', name: 'Polish', persona: 'Doświadczony praktyk fintech i systemów rozliczeń transgranicznych B2B', osUi: 'Pulpit, Metody płatności, Faktury, Ustawienia konta, Formularze podatkowe', localeContext: 'Warszawskie centrum biznesowe i technologiczne' },
  { code: 'id', name: 'Indonesian', persona: 'Praktisi senior penanganan masalah pembayaran gateway dan transfer dana global', osUi: 'Dasbor, Metode Pembayaran, Tagihan / Faktur, Pengaturan Akun, Formulir Pajak', localeContext: 'Kawasan bisnis Sudirman Central Business District (SCBD) Jakarta' },
  { code: 'vi', name: 'Vietnamese', persona: 'Chuyên gia thực chiến xử lý sự cố cổng thanh toán quốc tế và dòng tiền doanh nghiệp', osUi: 'Bảng điều khiển, Phương thức thanh toán, Hóa đơn, Cài đặt tài khoản, Biểu mẫu thuế', localeContext: 'Tòa nhà văn phòng tài chính Quận 1, TP. Hồ Chí Minh' }
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const fileSlug = `post-${Date.now().toString(36)}`;

// =========================================================================
// [1호기 100% 동일] 순수하고 검증된 SDK 직접 호출 함수 (8192 토큰 확보)
// =========================================================================
async function fetchWithRetry(prompt, maxRetries = 5, delayMs = 5000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
        config: {
          maxOutputTokens: 8192,
          temperature: 0.7,
        }
      });
      return response.text;
    } catch (error) {
      console.warn(`⚠️ [호출 재시도] ${attempt}/${maxRetries}: ${error.message}`);
      if (attempt === maxRetries) { throw error; }
      await delay(delayMs);
    }
  }
}

async function generateSinglePost(lang, index) {
  const selectedTheme = THEME_PRESETS[Math.floor(Math.random() * THEME_PRESETS.length)];
  const selectedScenario = TROUBLESHOOTING_SCENARIOS_30[Math.floor(Math.random() * TROUBLESHOOTING_SCENARIOS_30.length)];
  const i18n = I18N_SECTIONS[lang.code] || I18N_SECTIONS.ko;

  console.log(`\n🚀 [${index + 1}/12] ${lang.name} (${lang.code}) 2-1호기 포스팅 생성 중... (테마: ${selectedTheme.name})`);

  const { coverUrl, bodyUrl } = getPostImages(index);
  const pubDateIso = getKstPublishDateIso(index);

  const prompt = `
You are a ${lang.persona}.
Write a gripping, highly engaging, and practically exhaustive cross-border payment/fintech troubleshooting guide natively in ${lang.name}.
CRITICAL REQUIREMENT: Write 100% natively in ${lang.name}. Write like a seasoned real-world professional sharing an intense workplace story and breakthrough tips on a professional community.

[Topic]
${currentTopic}

[Workplace Incident Context]
- Target City/Culture: "${lang.localeContext}"
- Assigned Emergency Scenario: "${selectedScenario}"

[MANDATORY TOTAL LENGTH ENFORCEMENT - ZERO CONDENSATION]
- For Korean (ko): Total body MUST be AT LEAST 2,500 characters (공백 제외 최소 2,000자 이상). Summarizing or brief outputs are strictly prohibited.
- For other languages: Total body MUST be AT LEAST 1,400 - 1,800 words of rich technical substance.

[5-SECTION STRUCTURE REQUIREMENTS]
Strictly follow these 5 sections using clean H2 markdown headings (## ):

## ${i18n.s1}
- Dive directly into the workplace panic strictly based on: "${selectedScenario}".
- Write at least 3-4 vivid paragraphs describing:
  1) The sudden cold sweat moment when payment declined or funds were held.
  2) The urgent business deadline and naive first attempts that failed.
  3) The critical business risk (cash flow freeze, client trust damage).

## ${i18n.s2}
- Write an exhaustive technical analysis across at least 3-4 detailed paragraphs explaining:
  1) Risk scoring engines, 3DS2 / SCA authentication drops, and interchange routing barriers.
  2) Tax compliance pitfalls (W-8BEN vs W-9 discrepancies, VAT Reverse Charge clauses, TIN mismatches).
  3) Intermediary bank bottlenecks (SWIFT MT103 routing loops, correspondent bank clearing delays).

## ${i18n.s3}
- Provide 3 distinct, practical resolution methods matching "${lang.osUi}":
  * Method 1: Exact Dashboard / Gateway UI navigation clicks and parameter resetting.
  * Method 2: Official Document / Invoicing correction protocol (Exact tax clause wording, compliance upload rules).
  * Method 3: Direct compliance escalation route and alternative payment bypass (Wise Business, ACH, SEPA, Virtual Accounts).
  * Write step-by-step with clear numbered lists.

## ${i18n.s4}
- Write 2 in-depth paragraphs of battle-tested professional wisdom:
  1) Critical hazards: Account termination, rolling reserves, permanent payment processor blacklisting.
  2) Best operational habits: Gateway redundancy, dispute chargeback defense, automated tax document audits.

## ${i18n.s5}
- Provide exactly 3 realistic, highly specific Q&A items:
  * Each question must be bold (**Q1.**, **Q2.**, **Q3.**) followed by the question text.
  * Each answer (**A1.**, **A2.**, **A3.**) must be a detailed explanation (3-4 sentences per answer).
  * Put an empty blank line between every Question and Answer.

[STRICT MARKDOWN & FORMATTING RULES]
1. HEADINGS: Keep clean markdown headings (e.g. "## ${i18n.s2}"). NEVER put bold asterisks (**) inside headings.
2. BOLD FORMATTING: Use bold (**word**) STRICTLY WITHOUT SPACES inside the asterisks. Never write "** word **".
3. INLINE CODE BLOCKS: Wrap error codes, API parameters, or financial forms (e.g. \`W-8BEN\`, \`MT103\`, \`3DS2\`, \`do_not_honor\`) in inline backticks (\`code\`).
4. NO LATEX & NO TILDE: NEVER use LaTeX ($ or $$). NEVER wrap variables, keys, or dollar amounts in raw dollar signs like $100$. Wrap them in normal text or backticks. NEVER use tilde (~) for ranges; use hyphen (-).
${lang.code !== 'ko' ? `- Absolutely NEVER include any Korean characters (가-힣) anywhere in non-Korean posts.` : ''}

[Design Theme & Layout Dynamic Rules]
- Assigned Theme: "${selectedTheme.name}"
- Primary Accent Color: ${selectedTheme.primaryColor}
- Layout Characteristic: ${selectedTheme.layout}
- Incorporate inline styled HTML callout boxes tailored to this theme (Ensure font color is dark and readable):
  <div style="border-left: 4px solid ${selectedTheme.primaryColor}; padding: 14px 18px; margin: 24px 0; background-color: rgba(0,0,0,0.03); border-radius: 4px; color: #111827;">...</div>

[Strict Output Format]
Return ONLY raw Markdown starting directly with frontmatter:
---
title: "Native Catchy Title in ${lang.name}"
description: "Native concise description in ${lang.name} under 160 characters"
publishDate: ${pubDateIso}
image: "${coverUrl}"
category: "troubleshooting"
tags: ${JSON.stringify(i18n.tags)}
theme: "${selectedTheme.name}"
---
(Body starts directly here without H1 header)
`;

  try {
    let rawText = await fetchWithRetry(prompt);
    let text = rawText.trim();
    if (text.startsWith('```markdown')) text = text.replace(/^```markdown\n/, '').replace(/\n```$/, '');
    if (text.startsWith('```')) text = text.replace(/^```\n/, '').replace(/\n```$/, '');

    text = text.replace(/(title:\s*["'])([^"']*)(["'])/gi, (match, p1, p2, p3) => {
      const cleanTitle = p2.replace(/\*\*/g, '').replace(/[*_~`]/g, '').trim();
      return `${p1}${cleanTitle}${p3}`;
    });

    if (lang.code !== 'ko') {
      text = text.replace(/(title:\s*")([^"]*)(")/g, (match, p1, p2, p3) => `${p1}${p2.replace(/[가-힣]+/g, '').trim()}${p3}`);
      text = text.replace(/(description:\s*")([^"]*)(")/g, (match, p1, p2, p3) => `${p1}${p2.replace(/[가-힣]+/g, '').trim()}${p3}`);
    }

    const fmMatch = text.match(/^---[\s\S]*?---\n*/);
    if (fmMatch) {
      let frontmatter = fmMatch[0].trim();
      let body = text.slice(fmMatch[0].length).trim();
      body = body.replace(/^#\s+[^\n]+\n+/, '');

      frontmatter = frontmatter.replace(/(title:\s*["'])([^"']*)(["'])/gi, (m, p1, p2, p3) => {
        return `${p1}${p2.replace(/\*\*/g, '').trim()}${p3}`;
      });

      frontmatter = frontmatter.replace(/category:\s*["'][^"']*["']/i, "category: 'troubleshooting'")
                               .replace(/category:\s*[^\n\r]+/i, "category: 'troubleshooting'");

      frontmatter = frontmatter.replace(/publishDate:\s*[^\n\r]+/i, `publishDate: ${pubDateIso}`);
      frontmatter = frontmatter.replace(/image:\s*["'][^"']*["']/i, `image: '${coverUrl}'`);

      // 🛡️ 1차 무결 정제
      body = sanitizeMarkdownFormatting(body, lang.code);

      // 🛡️ [글자 수 물리적 강제 루프: 2,200자 미만 시 즉시 재작성]
      let retryCount = 0;
      while (lang.code === 'ko' && body.length < 2200 && retryCount < 2) {
        console.warn(`⚠️ [분량 부족] 현재 ${body.length}자 -> 목표 2,500자 충족을 위해 재작성 시도 (${retryCount + 1}/2)...`);
        const retryPrompt = prompt + "\n\nCRITICAL ENFORCEMENT: The previous generated post was strictly too short. You MUST write at least 4 very long, deeply detailed paragraphs for EACH section. Elaborate on every technical concept and troubleshooting step exhaustively to exceed 2,500 Korean characters.";
        
        let retryRawText = await fetchWithRetry(retryPrompt);
        let retryText = retryRawText.trim();
        if (retryText.startsWith('```markdown')) retryText = retryText.replace(/^```markdown\n/, '').replace(/\n```$/, '');
        if (retryText.startsWith('```')) retryText = retryText.replace(/^```\n/, '').replace(/\n```$/, '');

        const newFmMatch = retryText.match(/^---[\s\S]*?---\n*/);
        if (newFmMatch) {
          let newBody = retryText.slice(newFmMatch[0].length).trim();
          newBody = newBody.replace(/^#\s+[^\n]+\n+/, '');
          body = sanitizeMarkdownFormatting(newBody, lang.code);
        }
        retryCount++;
      }

      if (lang.code === 'ko') {
        console.log(`📏 [2-1호기 한국어 본문 최종 글자 수] ${body.length}자 (목표: 2,500자 이상)`);
      }

      const middleImageMarkdown = `\n\n![Billing Troubleshooting Guide](${bodyUrl})\n\n`;

      if (!body.includes(middleImageMarkdown.trim())) {
        if (body.includes('## 2.')) {
          body = body.replace(/(##\s*2\.[^\n]+)/, `${middleImageMarkdown}$1`);
        } else {
          const paragraphs = body.split('\n\n');
          if (paragraphs.length >= 3) {
            paragraphs.splice(2, 0, middleImageMarkdown.trim());
            body = paragraphs.join('\n\n');
          } else {
            body = `${middleImageMarkdown}${body}`;
          }
        }
      }

      // 🛡️ 2차 정제: 이미지 삽입 후 헤딩 중복 차단
      body = sanitizeMarkdownFormatting(body, lang.code);

      text = `${frontmatter}\n\n${body}\n`;
    }

    const targetDir = path.join(POSTS_BASE_DIR, lang.code);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, `${fileSlug}.md`);
    fs.writeFileSync(filePath, text, 'utf-8');
    console.log(`✅ [성공] 2-1호기 저장 완료: src/data/post/${lang.code}/${fileSlug}.md`);
    return true;
  } catch (error) {
    console.error(`❌ [최종 실패] ${lang.name} 생성 실패:`, error.message);
    return false;
  }
}

async function run() {
  console.log("==================================================");
  console.log("⚡ LifeWebLab 12개국 최적화 고속 자동 포스팅 시작 (1호기 엔진 탑재)");
  console.log("==================================================");

  let successCount = 0;

  for (let i = 0; i < TARGET_LANGS.length; i++) {
    const isSuccess = await generateSinglePost(TARGET_LANGS[i], i);
    if (isSuccess) successCount++;
    if (i < TARGET_LANGS.length - 1) {
      await delay(2000);
    }
  }

  if (successCount > 0) {
    lines.shift();
    fs.writeFileSync(TOPICS_FILE, lines.join('\n'), 'utf-8');
    console.log(`\n🧹 총 ${successCount}개국 포스팅 완료. topics.txt에서 사용한 주제를 제거했습니다.`);
    console.log(`📊 남은 주제 수: ${lines.length}개`);
  } else {
    console.error("\n❌ 모든 언어 생성이 실패하여 topics.txt를 보존합니다.");
    process.exit(1);
  }
}

run();
