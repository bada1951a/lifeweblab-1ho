import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

// =========================================================================
// [핵심 설정] Gemini 고정 모델 및 API 키 검증
// =========================================================================
const GEMINI_MODEL = 'gemini-3.5-flash-lite';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Astro content 컬렉션 표준 경로
const POSTS_BASE_DIR = path.resolve('src/content/post');
const TOPICS_FILE = path.resolve('topics.txt');
const PHOTO_DIR = path.resolve('public/images/billing-photo');

// =========================================================================
// [사진 61장 순환 로직] 날짜 기반 오프셋으로 연속 중복 원천 방지
// =========================================================================
const IMAGE_EXTS = /\.(jpe?g|png|webp|gif|avif)$/i;

if (!fs.existsSync(PHOTO_DIR)) {
  fs.mkdirSync(PHOTO_DIR, { recursive: true });
}

// 파일명 순서대로 고정 정렬하여 일관된 순환 풀 구성
const localFiles = fs.readdirSync(PHOTO_DIR).filter(file => IMAGE_EXTS.test(file)).sort();
let localImages = localFiles.map(file => encodeURI(`/images/billing-photo/${file}`));

if (localImages.length === 0) {
  console.warn("⚠️ public/images/billing-photo 에 이미지가 없습니다. 기본 이미지를 사용합니다.");
  localImages = ['/images/default-billing.jpg'];
}

function getPostImages(index) {
  // 오늘 날짜(한국 시간 KST) 기준 고유 일자 시드 계산
  const now = new Date();
  const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kstTime.getUTCFullYear();
  const month = kstTime.getUTCMonth() + 1;
  const day = kstTime.getUTCDate();

  // 매일 11칸씩 크게 건너뛰어 어제와 오늘 대표 사진이 겹치는 현상 완벽 차단
  const daySeed = (year * 372) + (month * 31) + day;
  const baseOffset = (daySeed * 11) % localImages.length;

  const coverUrl = localImages[(baseOffset + (index * 2)) % localImages.length];
  const bodyUrl = localImages[(baseOffset + (index * 2) + 1) % localImages.length];
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
// 마크다운 최소 정제 함수 (소제목과 줄바꿈은 절대 건드리지 않음)
// =========================================================================
function sanitizeMarkdownFormatting(content) {
  let cleaned = content;

  // LaTeX 수식 기호 치환
  cleaned = cleaned.replace(/\$([^$]+)\$/g, '$1')
                   .replace(/\\times/g, 'x')
                   .replace(/\\circ/g, '°')
                   .replace(/\\approx/g, '≈');

  // 물결표(~) 범위 기호를 안전한 하이픈(-)으로 치환
  cleaned = cleaned.replace(/(\S)\s*~\s*(\S)/g, '$1 - $2');
  cleaned = cleaned.replace(/~/g, '-');

  // 문단 사이 3개 이상 과도한 줄바꿈만 2개로 압축 (문단 분리는 완벽 보존)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned;
}

if (!fs.existsSync(TOPICS_FILE)) {
  console.error("❌ topics.txt 파일이 존재하지 않습니다.");
  process.exit(1);
}

const fileContent = fs.readFileSync(TOPICS_FILE, 'utf-8');
const lines = fileContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

if (lines.length === 0) {
  console.log("⚠️ topics.txt에 남은 주제가 없습니다. 생성을 건너뜁니다.");
  process.exit(0);
}

const currentTopic = lines[0];
console.log(`📌 오늘 처리할 주제: "${currentTopic}"`);

// 글로벌 결제 / 송금 / 인보이스 / 세무 위기 시나리오 30선
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
  { code: 'ko', name: 'Korean', persona: '글로벌 결제·송금 및 비즈니스 인보이스 오류 해결 실무 전문가', osUi: '대시보드, 결제 수단, 인보이스, 계정 설정, 세무 서식', localeContext: '서울/수도권 글로벌 스타트업 및 디지털 비즈니스 오피스' },
  { code: 'en', name: 'English', persona: 'Global payment gateway and cross-border invoicing troubleshooter', osUi: 'Dashboard, Payment Methods, Billing, Invoices, Tax Forms', localeContext: 'Silicon Valley tech startup / New York corporate finance office' },
  { code: 'ja', name: 'Japanese', persona: '海外決済・送金トラブルおよび請求書発行サポート専門家', osUi: 'ダッシュボード, 支払い方法, 請求書, アカウント設定, 税務書類', localeContext: '東京・丸の内および六本木の越境ビジネスオフィス' },
  { code: 'de', name: 'German', persona: 'Spezialist für internationale Zahlungsprobleme und B2B-Rechnungsstellung', osUi: 'Dashboard, Zahlungsmethoden, Rechnungen, Kontoeinstellungen, Steuerformulare', localeContext: 'Frankfurter Finanzdistrikt und Berliner Technologie-Campus' },
  { code: 'fr', name: 'French', persona: 'Spécialiste du dépannage des passerelles de paiement et de la facturation internationale', osUi: 'Tableau de bord, Modes de paiement, Factures, Paramètres du compte, Formulaires fiscaux', localeContext: 'Centres d\'affaires à Paris La Défense' },
  { code: 'es', name: 'Spanish', persona: 'Especialista en resolución de errores de cobros internacionales y facturación B2B', osUi: 'Panel de control, Métodos de pago, Facturación, Configuración de cuenta, Formularios fiscales', localeContext: 'Distrito financiero y corporativo en Madrid' },
  { code: 'it', name: 'Italian', persona: 'Consulente per la risoluzione dei problemi di pagamento e fatturazione B2B transfrontaliera', osUi: 'Dashboard, Metodi di pagamento, Fatture, Impostazioni account, Moduli fiscali', localeContext: 'Centri direzionali di Milano' },
  { code: 'pt', name: 'Portuguese', persona: 'Especialista em suporte a pagamentos globais, câmbio e faturamento internacional', osUi: 'Painel, Formas de Pagamento, Faturas, Configurações de Conta, Formulários Fiscais', localeContext: 'Avenida Paulista e centros empresariais em São Paulo' },
  { code: 'nl', name: 'Dutch', persona: 'Specialist in het oplossen van internationale betalings- en factuurproblemen', osUi: 'Dashboard, Betaalmethoden, Facturen, Accountinstellingen, Belastingformulieren', localeContext: 'Zuidas zakendistrict in Amsterdam' },
  { code: 'pl', name: 'Polish', persona: 'Inżynier wsparcia ds. globalnych systemów płatności i fakturowania transgranicznego', osUi: 'Pulpit, Metody płatności, Faktury, Ustawienia konta, Formularze podatkowe', localeContext: 'Warszawskie centrum biznesowe i technologiczne' },
  { code: 'id', name: 'Indonesian', persona: 'Spesialis penanganan masalah pembayaran global dan transfer dana internasional', osUi: 'Dasbor, Metode Pembayaran, Tagihan / Faktur, Pengaturan Akun, Formulir Pajak', localeContext: 'Kawasan bisnis Sudirman Central Business District (SCBD) Jakarta' },
  { code: 'vi', name: 'Vietnamese', persona: 'Chuyên gia xử lý sự cố cổng thanh toán quốc tế 및 xuất hóa đơn xuyên biên giới', osUi: 'Bảng điều khiển, Phương thức thanh toán, Hóa đơn, Cài đặt tài khoản, Biểu mẫu thuế', localeContext: 'Tòa nhà văn phòng tài chính Quận 1, TP. Hồ Chí Minh' }
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const fileSlug = `post-${Date.now().toString(36)}`;

async function fetchWithRetry(prompt, maxRetries = 5, delayMs = 5000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.warn(`⚠️ [호출 재시도] ${attempt}/${maxRetries} (모델: ${GEMINI_MODEL}): ${error.message}`);
      if (attempt === maxRetries) { throw error; }
      await delay(delayMs);
    }
  }
}

async function generateSinglePost(lang, index) {
  const selectedTheme = THEME_PRESETS[Math.floor(Math.random() * THEME_PRESETS.length)];
  const selectedScenario = TROUBLESHOOTING_SCENARIOS_30[Math.floor(Math.random() * TROUBLESHOOTING_SCENARIOS_30.length)];

  console.log(`\n🚀 [${index + 1}/12] ${lang.name} (${lang.code}) 문제 해결 포스팅 생성 중... (테마: ${selectedTheme.name})`);

  const { coverUrl, bodyUrl } = getPostImages(index);
  const pubDateIso = getKstPublishDateIso(index);

  const prompt = `
당신은 ${lang.persona}입니다.
반드시 ${lang.name} 언어로만 작성하세요. 번역투가 아닌, 현지 직장 동료에게 본인의 실무 경험담(썰)을 생생하게 들려주는 1인칭 구어체로 작성해야 합니다.

[작성 주제]
${currentTopic}

[실무 현장 배경 및 돌발 상황]
- 대상 도시/문화권: ${lang.localeContext}
- 발생한 긴급 시나리오: "${selectedScenario}"

[언어 규칙 - 절대 엄수 (CRITICAL)]
${lang.code !== 'ko' ? `
- [매우 중요] 한국어(한글)를 단 한 글자도 포함하지 마세요. 제목, 요약, 태그, 본문, 모든 소제목(##), 강조 박스 문구, FAQ(Q/A)까지 100% ${lang.name} 언어로만 작성해야 합니다.
- 한국어 예시 문구(예: '당시 상황과 겪었던 혼란', '핵심 포인트', 'FAQ' 등)를 그대로 쓰지 말고, 반드시 ${lang.name}로 완벽히 번역하여 적용하세요.
` : `
- 자연스러운 한국어 직장인 실무 구어체로 작성하세요.
`}

[필수 마크다운 구조 및 줄바꿈 규칙 - 절대 생략 금지]
1. 반드시 마크다운 소제목(## 및 ###)을 빠짐없이 사용하여 본문의 시각적 뼈대를 구축하세요. (단, 소제목 제목도 100% ${lang.name} 번역 필수)
2. 모든 문단 사이에는 반드시 빈 줄을 1개 삽입하여 완벽한 줄바꿈(엔터 2번, \\n\\n)을 적용하세요. 문단이 뭉쳐서 벽돌처럼 출력되면 안 됩니다.
3. 소제목 바로 앞과 뒤에도 반드시 빈 줄(\\n\\n)을 넣어 여백을 확보하세요.
4. 기술 파라미터나 에러 코드, 메뉴명은 작은따옴표 백틱(\`code\`)으로 감싸세요.
5. 테마 스타일의 강조 박스를 본문 중간에 2개 이상 배치하세요 (${lang.name} 번역 적용):
   <div style="border-left: 4px solid ${selectedTheme.primaryColor}; background: #f8fafc; padding: 16px 20px; margin: 28px 0; border-radius: 8px; color: #111827; font-size: 0.96rem;">
     <strong>[${lang.code === 'ko' ? '핵심 포인트' : 'Key Point'}]:</strong> ${lang.name}로 작성된 실무 핵심 조치 요약
   </div>

[본문 필수 구성 순서 (AdSense 고품질 E-E-A-T)]
1. 도입부 (H1, H2 소제목 없이 바로 이야기 시작):
   - "${selectedScenario}" 상황이 터진 당일 아침의 다급했던 현장 분위기를 1인칭 썰로 흥미진진하게 시작.
2. ## 1. [${lang.name}로 번역된 '당시 상황과 겪었던 혼란']:
   - 문제를 처음 맞닥뜨렸을 때의 당혹감, 고객센터나 문서를 뒤지며 겪은 시행착오를 구체적으로 서술.
3. ## 2. [${lang.name}로 번역된 '문제의 근본 원인 분석']:
   - 왜 이런 일이 발생했는지 3가지 현실적인 원인을 각각 ### 소제목으로 나누어 분석.
4. ## 3. [${lang.name}로 번역된 '즉시 해결한 단계별 조치 매뉴얼']:
   - "${lang.osUi}" 메뉴를 직접 조작하듯 클릭 경로와 해결 방법을 Step 1, Step 2, Step 3으로 상세히 가이드.
5. ## 4. [${lang.name}로 번역된 '재발 방지를 위한 실무 체크리스트']:
   - 앞으로 똑같은 사고를 원천 방지하기 위해 정기적으로 확인해야 할 핵심 수칙.
6. ## 5. [${lang.name}로 번역된 '자주 묻는 질문 FAQ']:
   - 실무자들이 실제로 가장 곤란해하는 고가치 질문 3개를 엄선하여 Q1, A1 형식으로 작성. (각 Q와 A 사이, 질문들 사이마다 빈 줄 필수).

[분량 규격]
- 한국어(ko): 공백 포함 최소 2,500자 이상의 깊이 있고 풍부한 본문.
- 기타 언어: 1,200 ~ 1,500 단어 이상의 충실한 실무 해설.

[출력 형식]
반드시 아래 프론트매터로 시작하세요:
---
title: "${lang.name} 언어로 작성된 실무적이고 매력적인 제목"
description: "${lang.name} 언어로 작성된 150자 이내의 명확한 요약문"
publishDate: ${pubDateIso}
image: "${coverUrl}"
category: "troubleshooting"
tags: ["Troubleshooting", "Payment Issues", "Invoicing", "Business Guide"]
theme: "${selectedTheme.name}"
---
`;

  try {
    let rawText = await fetchWithRetry(prompt);
    let text = rawText.trim();
    if (text.startsWith('```markdown')) text = text.replace(/^```markdown\n/, '').replace(/\n```$/, '');
    if (text.startsWith('```')) text = text.replace(/^```\n/, '').replace(/\n```$/, '');

    if (lang.code !== 'ko') {
      text = text.replace(/(title:\s*")([^"]*)(")/g, (match, p1, p2, p3) => `${p1}${p2.replace(/[가-힣]+/g, '').trim()}${p3}`);
      text = text.replace(/(description:\s*")([^"]*)(")/g, (match, p1, p2, p3) => `${p1}${p2.replace(/[가-힣]+/g, '').trim()}${p3}`);
    }

    const fmMatch = text.match(/^---[\s\S]*?---\n*/);
    if (fmMatch) {
      let frontmatter = fmMatch[0];
      let body = text.slice(frontmatter.length).trim();
      body = body.replace(/^#\s+[^\n]+\n+/, '');

      frontmatter = frontmatter.replace(/category:\s*["'][^"']*["']/i, "category: 'troubleshooting'")
                             .replace(/category:\s*[^\n\r]+/i, "category: 'troubleshooting'");

      frontmatter = frontmatter.replace(/publishDate:\s*[^\n\r]+/i, `publishDate: ${pubDateIso}`);
      frontmatter = frontmatter.replace(/image:\s*["'][^"']*["']/i, `image: '${coverUrl}'`);

      // 텍스트 수식/특수문자만 정리하고 줄바꿈/소제목은 완벽 보존
      body = sanitizeMarkdownFormatting(body);

      // 본문 중간 삽입 이미지: 레이아웃 넘침 방지 인라인 스타일 적용
      const middleImageMarkdown = `\n\n<div style="text-align: center; margin: 36px 0;"><img src="${bodyUrl}" alt="Troubleshooting Guide" style="max-width: 100%; max-height: 460px; width: auto; height: auto; border-radius: 14px; object-fit: cover; display: inline-block; box-shadow: 0 4px 18px rgba(0,0,0,0.08);" loading="lazy" /></div>\n\n`;

      if (body.includes('## 2.')) {
        body = body.replace(/(## 2\.[^\n]+)/, `${middleImageMarkdown}$1`);
      } else {
        const paragraphs = body.split('\n\n');
        if (paragraphs.length >= 3) {
          paragraphs.splice(2, 0, middleImageMarkdown.trim());
          body = paragraphs.join('\n\n');
        } else {
          body = `${middleImageMarkdown}${body}`;
        }
      }

      text = `${frontmatter}\n${body}\n`;
    }

    const targetDir = path.join(POSTS_BASE_DIR, lang.code);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, `${fileSlug}.md`);
    fs.writeFileSync(filePath, text, 'utf-8');
    console.log(`✅ [성공] 저장 완료: src/content/post/${lang.code}/${fileSlug}.md`);
    return true;
  } catch (error) {
    console.error(`❌ [최종 실패] ${lang.name} 생성 실패:`, error.message);
    return false;
  }
}

async function run() {
  console.log("==================================================");
  console.log(`⚡ LifeWebLab 12개국 고품질 문제해결 자동 포스팅 시작 (모델: ${GEMINI_MODEL})`);
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
