// =========================================================================
// 📌 [고정 식별자] 이 파일은 '2-1호기 (LifeWebLab)' 전용 스크립트입니다.
// ⚠️ [혼동 방지 및 영구 고정 규칙]
// 1. 이 파일은 '2-1호기'입니다. 본진 1호기, 2호기, 3호기, 4호기나 향후 서브호기와 절대 혼동 금지!
// 2. 카테고리는 대표님의 지시 전까지 'troubleshooting'으로 영구 고정한다. (임의 변경 절대 금지)
// 3. 이미지 경로는 'public/images/billing-photo'로 영구 고정한다.
// 4. 대표님과의 모든 설명, 질문, 대화 및 주석은 반드시 100% 한국어로만 진행한다.
// =========================================================================

import fs from 'fs';
import path from 'path';
// OpenAI Responses API: 별도 SDK 없이 Node.js 내장 fetch 사용

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
if (!DRY_RUN && !OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}
const POSTS_BASE_DIR = path.resolve('src/data/post');
const TOPICS_FILE = path.resolve('topics.txt');
const PHOTO_DIR = path.resolve('public/images/billing-photo');
const RETRY_QUEUE_FILE = path.resolve('.publish-retry-queue.json');

// =========================================================================
// [2-1호기 전용] public/images/billing-photo 로컬 이미지 자동 셔플
// =========================================================================
const IMAGE_EXTS = /\.(jpe?g|png|webp|gif|avif)$/i;

if (!fs.existsSync(PHOTO_DIR)) {
  fs.mkdirSync(PHOTO_DIR, { recursive: true });
}

const localFiles = fs.readdirSync(PHOTO_DIR).filter((file) => IMAGE_EXTS.test(file));
let localImages = localFiles.map((file) => encodeURI(`/images/billing-photo/${file}`));

if (localImages.length === 0) {
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

function getKstPublishDateIso(index, date = new Date()) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  const seed = year * 10000 + month * 100 + day;
  const hour = 8 + ((seed + index * 7) % 11);
  const minute = (seed * 3 + index * 13) % 60;
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute, 0)).toISOString();
}

function loadRetryQueue() {
  if (!fs.existsSync(RETRY_QUEUE_FILE)) return [];
  const parsed = JSON.parse(fs.readFileSync(RETRY_QUEUE_FILE, 'utf-8'));
  if (!Array.isArray(parsed)) throw new Error('.publish-retry-queue.json 형식이 배열이 아닙니다.');
  return parsed;
}

function saveRetryQueue(queue) {
  fs.writeFileSync(RETRY_QUEUE_FILE, JSON.stringify(queue, null, 2) + '\n', 'utf-8');
}

function validateGeneratedPost(text, langCode) {
  const errors = [];
  const fm = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/);
  if (!fm) return ['frontmatter 구분자 누락'];
  const meta = fm[1];
  const body = text.slice(fm[0].length).trim();
  for (const field of ['title', 'description', 'publishDate', 'image']) {
    if (!new RegExp('^' + field + ':\\s*\\S', 'm').test(meta)) errors.push(field + ' 누락');
  }
  if (!/^category:\s*['"]?troubleshooting['"]?\s*$/m.test(meta)) errors.push('category 오류');
  const readable = body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/[#*_`>]/g, '')
    .trim();
  const count = langCode === 'ko' ? [...readable.replace(/\s/g, '')].length : (readable.match(/\S+/g) || []).length;
  if (count < (langCode === 'ko' ? 1900 : 750) || count > (langCode === 'ko' ? 3100 : 1350))
    errors.push('본문 분량 범위 이탈: ' + count + (langCode === 'ko' ? '자' : '단어'));
  if (/^#\s+/m.test(body)) errors.push('본문 H1 중복');
  if (/\*\*\*\*|\*\*\*Q[1-3]/.test(body)) errors.push('볼드 마크다운 오류');
  const headings = body.match(/^##\s+[^\n]+/gm) || [];
  if (headings.length !== 5) errors.push('H2 섹션은 정확히 5개 필요');
  for (let n = 1; n <= 5; n++) {
    if (!headings[n - 1] || !headings[n - 1].startsWith('## ' + n + '. '))
      errors.push('H2 ' + n + '번 제목 순서 또는 번호 오류');
  }
  for (let n = 1; n <= 3; n++) {
    const questionMatches = body.match(new RegExp('\\*\\*Q' + n + '\\.\\*\\*', 'gi')) || [];
    const answerMatches = body.match(new RegExp('\\*\\*A' + n + '\\.\\*\\*', 'gi')) || [];
    if (questionMatches.length !== 1) errors.push('FAQ Q' + n + ' 누락 또는 중복');
    if (answerMatches.length !== 1) errors.push('FAQ A' + n + ' 누락 또는 중복');
  }
  const faqSection = body.split(/^## 5\. /m)[1] || '';
  for (let n = 1; n <= 3; n++) {
    const q = faqSection.indexOf('**Q' + n + '.**');
    const a = faqSection.indexOf('**A' + n + '.**');
    if (q < 0 || a < 0 || q >= a) errors.push('FAQ ' + n + '번 질문/답변 순서 오류');
    if (n < 3) {
      const nextQ = faqSection.indexOf('**Q' + (n + 1) + '.**');
      if (nextQ >= 0 && a >= nextQ) errors.push('FAQ ' + n + '번 답변 위치 오류');
    }
  }
  if ((body.match(/^```/gm) || []).length % 2 !== 0) errors.push('코드블록 닫힘 누락');
  if (/^#{2,6}[^ #\n]/m.test(body)) errors.push('제목 마크다운 공백 누락');
  if (/\*\*\*\*/.test(body)) errors.push('볼드 별표 중복');
  if (langCode !== 'ko' && /[가-힣]/.test(body)) errors.push('비한국어 본문에 한글 포함');
  return errors;
}

// =========================================================================
// [2-1호기 전용] 12개국 100% 현지어 섹션 제목 및 치환 딕셔너리 (영구 고정)
// =========================================================================
const I18N_SECTIONS = {
  ko: {
    s1: '1. 결제·송금 돌발 오류와 긴급 점검 상황',
    s2: '2. 결제 거절 및 처리 실패의 핵심 원인 분석',
    s3: '3. 1분 만에 해결하는 단계별 실무 조치 매뉴얼',
    s4: '4. 계정 동결 및 수수료 폭탄 방지를 위한 실무 체크리스트',
    s5: '5. 자주 묻는 질문 (FAQ)',
    tags: ['해외결제', '인보이스', '송금오류', '비즈니스정산'],
  },
  en: {
    s1: '1. Urgent Payment and Transfer Emergency',
    s2: '2. Root Cause Analysis of Gateway Failures',
    s3: '3. Step-by-Step Resolution Manual',
    s4: '4. Practical Checklist to Avoid Account Holds',
    s5: '5. Frequently Asked Questions (FAQ)',
    tags: ['Global Payment', 'Invoicing', 'Payment Gateway', 'Fintech Fix'],
  },
  ja: {
    s1: '1. 海外決済・送金エラーと緊急トラブル',
    s2: '2. 決済拒否および処理失敗の根本原因',
    s3: '3. 1分で完了する実践的なトラブルシューティング手順',
    s4: '4. アカウント凍結を防ぐ実務チェックリスト',
    s5: '5. よくある質問 (FAQ)',
    tags: ['海外決済', '請求書トラブル', '送金エラー', '越境ビジネス'],
  },
  de: {
    s1: '1. Dringender Zahlungs- und Überweisungsnotfall',
    s2: '2. Ursachenanalyse von Transaktionsfehlern',
    s3: '3. Schritt-für-Schritt-Anleitung zur Fehlerbehebung',
    s4: '4. Praxis-Checkliste zur Vermeidung von Kontensperren',
    s5: '5. Häufig gestellte Fragen (FAQ)',
    tags: ['Zahlungsabwicklung', 'B2B-Rechnung', 'Fintech', 'Transaktionsfehler'],
  },
  fr: {
    s1: "1. Situation d'urgence sur les paiements et virements",
    s2: '2. Analyse des causes principales des rejets de paiement',
    s3: '3. Manuel pratique de dépannage étape par étape',
    s4: '4. Liste de contrôle pour éviter les blocages de compte',
    s5: '5. Foire Aux Questions (FAQ)',
    tags: ['Paiement International', 'Facturation B2B', 'Passerelle de Paiement', 'Gestion Litiges'],
  },
  es: {
    s1: '1. Emergencia crítica en transferencias y cobros',
    s2: '2. Análisis de causas raíz de rechazos de pago',
    s3: '3. Manual paso a paso para resolver incidencias',
    s4: '4. Lista de verificación para prevenir retenciones de fondos',
    s5: '5. Preguntas Frecuentes (FAQ)',
    tags: ['Pagos Internacionales', 'Facturación B2B', 'Pasarela de Pago', 'Gestión de Cobros'],
  },
  it: {
    s1: '1. Emergenza improvvisa su pagamenti e bonifici',
    s2: '2. Analisi approfondita dei rifiuti di pagamento',
    s3: '3. Guida pratica di risoluzione passo dopo passo',
    s4: '4. Checklist essenziale per evitare blocchi del conto',
    s5: '5. Domande Frequenti (FAQ)',
    tags: ['Pagamenti Globali', 'Fatturazione Elettronica', 'Gateway Pagamento', 'Risoluzione Errori'],
  },
  pt: {
    s1: '1. Emergência com pagamentos e transferências globais',
    s2: '2. Análise da causa raiz de recusas de pagamento',
    s3: '3. Manual prático passo a passo de resolução',
    s4: '4. Checklist essencial para evitar retenções de saldo',
    s5: '5. Perguntas Frecuentes (FAQ)',
    tags: ['Pagamentos Globais', 'Faturamento B2B', 'Gateway de Pagamento', 'Finanças'],
  },
  nl: {
    s1: '1. Noodsituatie bij internationale betalingen',
    s2: '2. Grondige analyse van mislukte betalingstransacties',
    s3: '3. Stapsgewijze handleiding voor het direct oplossen',
    s4: '4. Checklist om rekeningblokkades te voorkomen',
    s5: '5. Veelgestelde Vragen (FAQ)',
    tags: ['Internationale Betalingen', 'Facturatie', 'Payment Gateway', 'Financiële Tips'],
  },
  pl: {
    s1: '1. Awaryjna sytuacja z płatnościami zagranicznymi',
    s2: '2. Analiza przyczyn odrzuceń płatności i błędów',
    s3: '3. Praktyczny przewodnik rozwiązywania problemów',
    s4: '4. Lista kontrolna zapobiegająca blokadom konta',
    s5: '5. Najczęściej zadawane pytania (FAQ)',
    tags: ['Płatności Globalne', 'Fakturowanie B2B', 'Bramki Płatności', 'Rozliczenia'],
  },
  id: {
    s1: '1. Situasi Darurat Transaksi Pembayaran dan Transfer',
    s2: '2. Analisis Akar Masalah Penolakan Gateway Pembayaran',
    s3: '3. Panduan Langkah demi Langkah Penanganan Masalah',
    s4: '4. Lembar Periksa Mencegah Penahanan Dana Akun',
    s5: '5. Pertanyaan yang Sering Diajukan (FAQ)',
    tags: ['Pembayaran Global', 'Faktur Bisnis', 'Gateway Pembayaran', 'Fintech'],
  },
  vi: {
    s1: '1. Sự cố khẩn cấp khi thanh toán và chuyển tiền',
    s2: '2. Phân tích nguyên nhân lỗi từ chối thanh toán',
    s3: '3. Quy trình thực tế từng bước xử lý lỗi cổng thanh toán',
    s4: '4. Danh sách kiểm tra ngăn ngừa đóng băng tài khoản',
    s5: '5. Các câu hỏi thường gặp (FAQ)',
    tags: ['Thanh Toán Quốc Tế', 'Hóa Đơn B2B', 'Cổng Thanh Toán', 'Xử Lý Sự Cố'],
  },
};

// =========================================================================
// 🛡️ [2-1호기 자가 검수 및 치유 엔진: Self-Healing Inspector]
// =========================================================================
function inspectAndHealMarkdown(body) {
  let healed = body.trim();
  const auditLogs = [];

  // 1. 제목의 의미를 보존합니다. 모델이 작성한 구체적인 제목을 고정 문구로 덮어쓰지 않습니다.
  // 잘못된 번호나 누락은 validateGeneratedPost에서 감지하여 재생성을 요구합니다.
  healed = healed.replace(/^(#{1,6}\\s+)\\*\\*(.*?)\\*\\*/gm, '$1$2');

  // 누락된 제목을 빈 섹션으로 채우지 않습니다. 검증 단계에서 재생성을 요구합니다.

  // 2. [Q&A 치명적 뭉개짐 검수 & 치유]
  // 질문(Q)과 답변(A) 사이에 줄바꿈이 없거나 1줄만 떨어진 것을 감지하여 빈 줄 2개(\n\n)로 완벽 분리
  const rawQnACount = (healed.match(/Q[1-3]\./gi) || []).length;
  if (rawQnACount > 0) {
    healed = healed.replace(/\s*(?:\*\*)?(Q[1-3]\.)(?:\*\*)?\s*/gi, '\n\n**$1** ');
    healed = healed.replace(/\s*(?:\*\*)?(A[1-3]\.)(?:\*\*)?\s*/gi, '\n\n**$1** ');

    // 이중 볼드 정돈 (** **Q1.** ** -> **Q1.**)
    healed = healed.replace(/\*\*\s*\*\*(Q[1-3]\.|A[1-3]\.)\*\*\s*\*\*/gi, '**$1**');
    healed = healed.replace(/\*\*(Q[1-3]\.|A[1-3]\.)\*\*/gi, '**$1**');
    auditLogs.push('Q&A 문단 강제 2열 분리 치유');
  }

  // 3. [볼드 공백 교정] ** 키워드 ** -> **키워드**
  if (/\*\*\s+[^*]+?\s+\*\*/.test(healed)) {
    healed = healed
      .replace(/\*\*\s+([^*]+?)\s+\*\*/g, '**$1**')
      .replace(/\*\*\s+([^*]+?)\*\*/g, '**$1**')
      .replace(/\*\*([^*]+?)\s+\*\*/g, '**$1**');
    auditLogs.push('볼드 안쪽 공백 정돈');
  }

  // 4. [특수문자 및 LaTeX 치환]
  healed = healed
    .replace(/\\times/g, 'x')
    .replace(/\\circ/g, '°')
    .replace(/\\approx/g, '≈')
    .replace(/\$([A-Za-z0-9_-]+)\$/g, '`$1`');

  // 5. [연속 빈 줄 정돈]
  healed = healed.replace(/\n{3,}/g, '\n\n').trim();

  if (auditLogs.length > 0) {
    console.log(`   🩺 [자가 치유 완료]: ${auditLogs.join(' | ')}`);
  }

  return healed;
}

// =========================================================================
// topics.txt 로드
// =========================================================================
if (!fs.existsSync(TOPICS_FILE)) {
  console.error('❌ topics.txt 파일이 존재하지 않습니다.');
  process.exit(1);
}

const fileContent = fs.readFileSync(TOPICS_FILE, 'utf-8');
const lines = fileContent
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l.length > 0);

if (lines.length === 0) {
  console.log('⚠️ topics.txt에 남은 주제가 없습니다. 생성을 건너뜁니다.');
  process.exit(0);
}

const currentTopic = lines[0];
console.log(`📌 오늘 처리할 주제 [2-1호기 LifeWebLab]: "${currentTopic}"`);

const TROUBLESHOOTING_SCENARIOS_30 = [
  '해외 바이어로부터 거액의 인보이스 결제 완료 알림 직후 결제 게이트웨이 대시보드에 결제 거절(Declined) 경고가 뜬 순간',
  '월말 정산일 당일, 사내 외주 인력 대량 송금을 실행하려다 계정 일시 점검 및 동결 알림을 마주한 아침',
  '미국 클라이언트와의 계약서 작성 중 W-8BEN 양식 작성 오류로 불필요한 원천징수 30%가 차감 적용된다는 통보를 받은 순간',
  '수개월간 준비한 글로벌 비즈니스 런칭 당일, 첫 유료 고객들의 해외 카드 결제가 3D Secure 인증 에러로 튕겨나가는 시점',
  '비즈니스 계정에 보관 중이던 운영 자금이 예고 없는 21일 보류(Hold)로 묶여버린 긴박한 오후',
  '해외에서 송금을 받았으나 중계은행 수수료와 환율 마진으로 수수료만 과도하게 차감된 내역을 확인한 순간',
  '유럽 파트너사에 발행한 B2B 인보이스가 부가세(VAT Reverse Charge) 표기 누락으로 회계팀에서 반려된 타이밍',
  '온라인 결제창에서 고객 결제 시도 중 일부가 사기 의심으로 오탐 차단되어 매출 손실이 실시간으로 발생하는 상황',
  '해외 결제 계좌에서 국내 계좌로 인출 신청을 넣었으나 영문 명의 불일치로 반송되어 자금 흐름이 막힌 새벽',
  '해외 비즈니스 툴 정기 결제를 위해 등록해 둔 카드가 일일 한도 초과로 결제 실패 메일이 연속 수신된 순간',
  '플랫폼 규정 변경으로 납세자 번호(Foreign TIN) 재검증을 요구하며 일시적으로 정산 출금이 정지된 상황',
  '글로벌 마켓플레이스 판매 대금이 입금되었으나 비정상적인 수수료가 중복 차감된 내역을 확인한 날',
  '프로젝트 납품 후 대금 지급일이 지났음에도 바이어 측에서 인보이스 재발행을 요청하며 결제를 미루는 상황',
  '환율 급변동 시기에 환전 타이밍을 놓쳐 대규모 환차손을 보게 된 긴박한 시점',
  '전자상거래 결제 시 다통화 반올림(Rounding) 오류로 고객 결제 승인이 실패하는 기술적 에러 발생 시',
  '외국인 계약자로서 파트너사에 제출한 세무 서류가 분류 코드 오류로 반려되어 계약 진행이 막힌 순간',
  '해외 비즈니스 계좌에서 진행한 송금이 중계은행에서 추적(MT103) 불가 상태로 수일째 지연되는 상황',
  '보안 위험 점수 필터링 설정 실수로 정상 고객의 결제가 무더기로 차단된 상황',
  '해외 직거래 클라이언트가 사전 협의 없이 차지백(Chargeback)을 걸어 대금 환수 위기에 처한 시점',
  '외주 대금을 지급하려다 이중 결제 웹훅 버그가 발생해 동일 금액이 두 번 인출된 아찔한 순간',
  '신고 기간 직전, 해외 다통화 계좌(달러, 유로, 엔화) 입출금 내역의 원화 환산 정리가 꼬여버린 상황',
  '해외 결제사로부터 갑작스러운 신원 확인(KYC) 추가 서류 제출 요청을 받고 기한 내 미제출 시 계정 중단 위기에 놓인 순간',
  '공동 프로젝트 수익을 분배하는 과정에서 해외 송금 수수료로 인해 실수령액 불일치 문제가 생긴 날',
  '미국 클라이언트가 W-9 양식을 요구해 비거주자로서 합법적으로 W-8BEN 제출 절차를 안내해야 하는 상황',
  '구독 고객의 카드 유효기간 만료로 인한 연체율이 급증해 스마트 결제 재시도 설정이 시급한 시점',
  '바이어에게 보낸 인보이스의 결제 기한 문구가 모호하여 수개월째 미수금으로 묶여 현금 흐름에 비상이 걸린 순간',
  '출장지에서 긴급한 업무 비용을 결제하려다 비즈니스 가상 카드가 해외 IP 부정 사용 의심으로 차단된 상황',
  '글로벌 상업용 카드로 현지 결제를 시도했으나 칩 리딩 오류 및 통화 변환 수수료 폭탄을 맞은 직후',
  '가상 터미널을 통한 수기 결제 시도 중 보안 코드 오류로 클라이언트와 통화 도중 거래가 중단된 타이밍',
  '계약서 내 중도 해지 보상금(Kill Fee) 조항이 누락되어 프로젝트 중단 후 정산 분쟁에 처한 상황',
];

const TARGET_LANGS = [
  {
    code: 'ko',
    name: 'Korean',
    persona: '글로벌 결제 및 비즈니스 인보이스 오류를 정확하게 해결해 주는 10년 차 핀테크 실무자',
    osUi: '대시보드, 결제 수단, 인보이스, 계정 설정',
    localeContext: '서울/수도권 글로벌 스타트업 오피스',
  },
  {
    code: 'en',
    name: 'English',
    persona: 'Veteran cross-border fintech specialist and payment gateway troubleshooter',
    osUi: 'Dashboard, Payment Methods, Billing, Invoices',
    localeContext: 'Silicon Valley tech startup / New York finance office',
  },
  {
    code: 'ja',
    name: 'Japanese',
    persona: '海外決済・送金トラブルを現場目線で解決するベテラン実務担当者',
    osUi: 'ダッシュボード, 支払い方法, 請求書, アカウント設定',
    localeContext: '東京・丸の内の越境ビジネスオフィス',
  },
  {
    code: 'de',
    name: 'German',
    persona: 'Erfahrener Fintech-Praktiker für grenzüberschreitende Zahlungen',
    osUi: 'Dashboard, Zahlungsmethoden, Rechnungen, Kontoeinstellungen',
    localeContext: 'Frankfurter Finanzdistrikt',
  },
  {
    code: 'fr',
    name: 'French',
    persona: 'Expert en résolution de litiges de paiement international et facturation B2B',
    osUi: 'Tableau de bord, Modes de paiement, Factures, Paramètres',
    localeContext: "Centres d'affaires à Paris",
  },
  {
    code: 'es',
    name: 'Spanish',
    persona: 'Especialista en cobros internacionales, pasarelas de pago y facturación',
    osUi: 'Panel de control, Métodos de pago, Facturación, Configuración',
    localeContext: 'Distrito corporativo en Madrid',
  },
  {
    code: 'it',
    name: 'Italian',
    persona: 'Consulente senior per pagamenti internazionali e fatturazione B2B',
    osUi: 'Dashboard, Metodi di pagamento, Fatture, Impostazioni',
    localeContext: 'Centri direzionali di Milano',
  },
  {
    code: 'pt',
    name: 'Portuguese',
    persona: 'Especialista prático em pagamentos globais e desbloqueio de contas',
    osUi: 'Painel, Formas de Pagamento, Faturas, Configurações',
    localeContext: 'Avenida Paulista em São Paulo',
  },
  {
    code: 'nl',
    name: 'Dutch',
    persona: 'Ervaren fintech troubleshooter voor internationale betalingsproblemen',
    osUi: 'Dashboard, Betaalmethoden, Facturen, Accountinstellingen',
    localeContext: 'Zuidas zakendistrict in Amsterdam',
  },
  {
    code: 'pl',
    name: 'Polish',
    persona: 'Doświadczony praktyk fintech i systemów rozliczeń B2B',
    osUi: 'Pulpit, Metody płatności, Faktury, Ustawienia konta',
    localeContext: 'Warszawskie centrum biznesowe',
  },
  {
    code: 'id',
    name: 'Indonesian',
    persona: 'Praktisi penanganan masalah pembayaran gateway dan transfer dana',
    osUi: 'Dasbor, Metode Pembayaran, Tagihan / Faktur, Pengaturan',
    localeContext: 'Kawasan SCBD Jakarta',
  },
  {
    code: 'vi',
    name: 'Vietnamese',
    persona: 'Chuyên gia xử lý sự cố cổng thanh toán quốc tế và dòng tiền',
    osUi: 'Bảng điều khiển, Phương thức thanh toán, Hóa đơn, Cài đặt',
    localeContext: 'Quận 1, TP. Hồ Chí Minh',
  },
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function fetchWithRetry(prompt, maxRetries = 3, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + OPENAI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-6-luna',
          input: prompt,
          max_output_tokens: 6144,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error('OpenAI HTTP ' + response.status + ': ' + JSON.stringify(data.error || {}).slice(0, 400));
      if (data.status === 'incomplete')
        throw new Error('AI 응답이 잘렸습니다: ' + JSON.stringify(data.incomplete_details || {}));
      const output = (data.output || [])
        .flatMap((item) => item.content || [])
        .filter((part) => part.type === 'output_text')
        .map((part) => part.text || '')
        .join('\n')
        .trim();
      if (!output) throw new Error('AI 본문이 비어 있습니다.');
      return output;
    } catch (error) {
      console.warn('⚠️ [호출 재시도 ' + attempt + '/' + maxRetries + ']: ' + error.message);
      if (attempt === maxRetries) throw error;
      await delay(delayMs * attempt);
    }
  }
}

async function generateSinglePost(lang, index, topic, slug, publishDateBase = new Date()) {
  const selectedScenario =
    TROUBLESHOOTING_SCENARIOS_30[Math.floor(Math.random() * TROUBLESHOOTING_SCENARIOS_30.length)];
  const i18n = I18N_SECTIONS[lang.code] || I18N_SECTIONS.ko;

  console.log(`\n🚀 [${index + 1}/12] ${lang.name} (${lang.code}) 2-1호기 애드센스 표준 포스팅 생성 중...`);

  const { coverUrl, bodyUrl } = getPostImages(index);
  const pubDateIso = getKstPublishDateIso(index, publishDateBase);

  // 🎯 [프롬프트: 2,400~2,600자 정량화 및 Q&A 빈 줄 2개 규격 명확화]
  const prompt = `
You are a ${lang.persona}.
Write a high-quality, practical troubleshooting guide natively in ${lang.name}.
Target Culture: "${lang.localeContext}"
Optional illustrative situation (use ONLY if directly relevant to the topic; never present as a real case): "${selectedScenario}"
Topic: "${topic}"

[ADSENSE QUALITY & LENGTH REQUIREMENT]
- For Korean (ko): Write exactly around 2,400 - 2,600 characters (do NOT exceed 3,000 characters).
- For other languages: Write exactly 900 - 1,100 words.
- Tone: Highly informative, professional, practical workplace advice.
- Never invent first-hand experience, credentials, tested results, customer stories, provider settings, financial regulations or tax rules.
- Give concrete actionable steps; when provider policies differ, clearly state the limitation.
- Avoid repetition and include a concise conclusion in section 4.\n- Answer the exact user search intent in the topic; do not force unrelated banking, tax, or payment examples.\n- Give a symptom-to-cause-to-check-to-fix sequence with specific, verifiable UI steps where applicable.\n- Distinguish confirmed facts from possibilities; never promise guaranteed resolution, approval, refunds, or outcomes.\n- Do not pad the article to hit a length target: add useful edge cases, decision criteria and safe next steps instead.

[STRUCTURE - STRICT 5 H2 HEADINGS]
Use these exact H2 headings:

## ${i18n.s1}
Write 2 informative paragraphs identifying the exact symptoms and immediate safe checks for "${topic}". Use the optional situation only when genuinely relevant; no fabricated urgency or panic.

## ${i18n.s2}
Write 2 analytical paragraphs explaining plausible causes specifically relevant to "${topic}". Do not list unrelated gateway, tax, or banking causes.

## ${i18n.s3}
Provide 3 concrete, ordered resolution steps for "${topic}". Use UI labels from "${lang.osUi}" only when they are accurate and applicable; otherwise explain how to find the correct provider-specific setting.

## ${i18n.s4}
Write 2 paragraphs of topic-specific precautions, failure checks, escalation criteria, and realistic next steps.

## ${i18n.s5}
Provide exactly 3 practical Q&A items. You MUST put an empty line between Question and Answer:

**Q1.** Question text

**A1.** Detailed answer (3-4 sentences).

**Q2.** Question text

**A2.** Detailed answer (3-4 sentences).

**Q3.** Question text

**A3.** Detailed answer (3-4 sentences).

[FORMATTING RULES]
1. Never put asterisks (**) inside H2 headings.
2. Bold keywords with strict syntax: **keyword** (no space inside asterisks).
3. Put error codes or settings in inline backticks (e.g. \`W-8BEN\`, \`3DS2\`).
${lang.code !== 'ko' ? `- Absolutely NO Korean characters in non-Korean posts.` : ''}

[Strict Output Format]
Return ONLY raw Markdown starting directly with frontmatter:
---
title: "Native Clear Title in ${lang.name}"
description: "Native concise description in ${lang.name} under 160 characters"
publishDate: ${pubDateIso}
image: "${coverUrl}"
category: "troubleshooting"
tags: ${JSON.stringify(i18n.tags)}
---
`;

  try {
    let rawText = await fetchWithRetry(prompt, 1, 3000);
    let text = rawText.trim();
    if (text.startsWith('```markdown')) text = text.replace(/^```markdown\n/, '').replace(/\n```$/, '');
    if (text.startsWith('```')) text = text.replace(/^```\n/, '').replace(/\n```$/, '');

    const fmMatch = text.match(/^---[\s\S]*?---\n*/);
    if (fmMatch) {
      let frontmatter = fmMatch[0].trim();
      let body = text.slice(fmMatch[0].length).trim();
      body = body.replace(/^#\s+[^\n]+\n+/, '');

      // ⚠️ 2-1호기 카테고리 'troubleshooting' 영구 보존 강제 검증
      frontmatter = frontmatter
        .replace(/category:\s*["'][^"']*["']/i, "category: 'troubleshooting'")
        .replace(/category:\s*[^\n\r]+/i, "category: 'troubleshooting'");

      // 🩺 [자가 검수 및 치유 엔진 실행]
      body = inspectAndHealMarkdown(body);

      if (lang.code === 'ko') {
        console.log(`   📏 [2-1호기 본문 생성 길이] ${body.length}자 (목표: 2,400~2,600자)`);
      }

      // 본문 중간 이미지 배치 (2번 섹션 직전)
      const middleImageMarkdown = `\n\n![Troubleshooting Guide](${bodyUrl})\n\n`;
      if (body.includes('## 2.')) {
        body = body.replace(/(##\s*2\.[^\n]+)/, `${middleImageMarkdown}$1`);
      } else {
        body = `${middleImageMarkdown}${body}`;
      }

      text = `${frontmatter}\n\n${body}\n`;
    } else {
      throw new Error('발행 전 검수 실패: frontmatter 형식이 없습니다.');
    }

    const validationErrors = validateGeneratedPost(text, lang.code);
    if (validationErrors.length) throw new Error('발행 전 검수 실패: ' + validationErrors.join(', '));

    const targetDir = path.join(POSTS_BASE_DIR, lang.code);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, `${slug}.md`);
    fs.writeFileSync(filePath, text, 'utf-8');
    console.log(`   ✅ [성공] 2-1호기 저장 완료: src/data/post/${lang.code}/${slug}.md`);
    return true;
  } catch (error) {
    console.error(`❌ [최종 실패] ${lang.name} 생성 실패:`, error.message);
    return false;
  }
}

async function run() {
  if (DRY_RUN) {
    console.log('DRY RUN: API 호출 및 글 발행 없이 기본 검수 함수를 확인합니다.');
    const sample =
      '---\ntitle: test\ndescription: test\npublishDate: 2026-10-28\nimage: /test.jpg\ncategory: troubleshooting\n---\n\n## 1. Test\nShort';
    if (!validateGeneratedPost(sample, 'ko').some((x) => x.includes('분량')))
      throw new Error('분량 검수 자체 테스트 실패');
    console.log('PASS: 짧은 글 발행 차단 검수');
    const fullSample =
      '---\ntitle: test\ndescription: test\npublishDate: 2026-10-28\nimage: /test.jpg\ncategory: troubleshooting\n---\n\n' +
      [1, 2, 3, 4, 5].map((n) => '## ' + n + '. Test\n\n' + '설명 문장입니다. '.repeat(65)).join('\n\n') +
      '\n\n**Q1.** 질문\n\n**A1.** 답변\n\n**Q2.** 질문\n\n**A2.** 답변\n\n**Q3.** 질문\n\n**A3.** 답변';
    const validErrors = validateGeneratedPost(fullSample, 'ko');
    if (validErrors.length) throw new Error('정상 FAQ 테스트 실패: ' + validErrors.join(', '));
    const duplicateFaq = fullSample.replace('**Q3.** 질문', '**Q2.** 질문');
    const faqErrors = validateGeneratedPost(duplicateFaq, 'ko');
    if (!faqErrors.some((x) => x.includes('Q2')) || !faqErrors.some((x) => x.includes('Q3')))
      throw new Error('FAQ 중복/누락 검수 테스트 실패');
    console.log('PASS: FAQ 3쌍 정상 및 중복/누락 차단 검수');
    const wrongOrder = fullSample.replace('## 2. Test', '## 4. Test');
    if (!validateGeneratedPost(wrongOrder, 'ko').some((x) => x.includes('제목 순서')))
      throw new Error('H2 순서 검수 테스트 실패');
    console.log('PASS: H2 번호 및 순서 오류 차단 검수');
    const misplacedFaq = fullSample.replace('**Q1.** 질문\n\n**A1.** 답변', '**A1.** 답변\n\n**Q1.** 질문');
    if (!validateGeneratedPost(misplacedFaq, 'ko').some((x) => x.includes('질문/답변 순서')))
      throw new Error('FAQ 답변 선행 오류 검수 테스트 실패');
    console.log('PASS: FAQ 답변이 질문보다 앞서는 오류 차단 검수');
    return;
  }
  console.log('==================================================');
  console.log('LifeWebLab: 발행 전 검수 및 실패 언어 복구 시작');
  console.log('==================================================');

  const queue = loadRetryQueue();
  const knownCodes = new Set(TARGET_LANGS.map((lang) => lang.code));

  // 이전 실행에서 실패한 언어만 재시도합니다. 성공한 언어 파일은 재생성하지 않습니다.
  for (let q = 0; q < queue.length; q++) {
    const job = queue[q];
    job.failedCodes = [...new Set((job.failedCodes || []).filter((code) => knownCodes.has(code)))];
    const stillFailed = [];
    for (const code of job.failedCodes) {
      const idx = TARGET_LANGS.findIndex((lang) => lang.code === code);
      let ok = false;
      for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
        console.log('이전 실패 복구 ' + code + ': 시도 ' + attempt + '/3');
        ok = await generateSinglePost(TARGET_LANGS[idx], idx, job.topic, job.slug, new Date(job.queuedAt));
        if (!ok && attempt < 3) await delay(2500 * attempt);
      }
      if (!ok) stillFailed.push(code);
      job.failedCodes = stillFailed.concat(job.failedCodes.slice(job.failedCodes.indexOf(code) + 1));
      saveRetryQueue(queue);
      await delay(1000);
    }
    job.failedCodes = stillFailed;
    if (!job.failedCodes.length) {
      console.log('이전 실패 주제 복구 완료: ' + job.topic);
      queue.splice(q, 1);
      q--;
      saveRetryQueue(queue);
    }
  }

  if (!fs.existsSync(TOPICS_FILE)) throw new Error('topics.txt 파일이 존재하지 않습니다.');
  const topicLines = fs
    .readFileSync(TOPICS_FILE, 'utf-8')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (!topicLines.length) {
    saveRetryQueue(queue);
    console.log('새 주제가 없습니다. 실패 복구 큐만 처리했습니다.');
    return;
  }

  const topic = topicLines[0];
  const slug = 'post-' + Date.now().toString(36);
  console.log('오늘의 새 주제: ' + topic);
  let successCount = 0;
  const failedCodes = [];

  for (let i = 0; i < TARGET_LANGS.length; i++) {
    let ok = false;
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      if (attempt > 1) console.log(TARGET_LANGS[i].code + ' 재시도 ' + (attempt - 1) + '/2');
      ok = await generateSinglePost(TARGET_LANGS[i], i, topic, slug);
      if (!ok && attempt < 3) await delay(2500 * attempt);
    }
    if (ok) successCount++;
    else failedCodes.push(TARGET_LANGS[i].code);
    await delay(1500);
  }

  if (successCount > 0) {
    topicLines.shift();
    fs.writeFileSync(TOPICS_FILE, topicLines.join('\n') + (topicLines.length ? '\n' : ''), 'utf-8');
    if (failedCodes.length) {
      queue.push({ topic: topic, slug: slug, failedCodes: failedCodes, queuedAt: new Date().toISOString() });
      console.warn(
        successCount + '/12개 언어 성공. 실패 언어 ' + failedCodes.join(', ') + '는 다음 실행 때 다시 시도합니다.'
      );
    } else {
      console.log('12개 언어 모두 검수 통과');
    }
    saveRetryQueue(queue);
    console.log('남은 새 주제: ' + topicLines.length + '개 | 대기 중인 복구 작업: ' + queue.length + '개');
  } else {
    saveRetryQueue(queue);
    console.error('모든 언어가 실패했습니다. topics.txt의 주제를 보존합니다.');
    process.exitCode = 1;
  }
}
run();
