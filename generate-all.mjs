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
import crypto from 'node:crypto';
import {
  PROMPT_RECIPE_VERSION,
  buildWordCountCorrectionGuidance,
  findReusablePostLocales,
  createTopicFileSlug,
  decidePublishLocales,
  reconcilePromptCheckpoint,
} from './src/utils/generation-recipe.js';
import { buildNarrativeVoiceInstructions } from './src/utils/narrative-prompt.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
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

function getKstPublishDateIso(date = new Date()) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth();
  const day = kst.getUTCDate();
  return new Date(Date.UTC(year, month, day, 10, 40, 0)).toISOString();
}

function checkpointKey(salt) {
  return crypto.scryptSync(OPENAI_API_KEY, salt, 32);
}

function loadRetryQueue() {
  if (!fs.existsSync(RETRY_QUEUE_FILE)) return [];
  const envelope = JSON.parse(fs.readFileSync(RETRY_QUEUE_FILE, 'utf-8'));
  if (Array.isArray(envelope)) {
    if (envelope.length)
      throw new Error(
        '암호화되지 않은 기존 체크포인트가 있습니다. 공개 저장소에 원고를 쓰지 않도록 수동 확인이 필요합니다.'
      );
    return [];
  }
  if (envelope.version !== 1 || envelope.algorithm !== 'aes-256-gcm') {
    throw new Error('.publish-retry-queue.json 암호화 형식이 올바르지 않습니다.');
  }
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      checkpointKey(Buffer.from(envelope.salt, 'base64')),
      Buffer.from(envelope.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf-8');
    const queue = JSON.parse(plaintext);
    if (!Array.isArray(queue)) throw new Error('payload is not an array');
    return queue;
  } catch {
    throw new Error('암호화 체크포인트를 복호화할 수 없습니다. OPENAI_API_KEY가 변경되었거나 데이터가 손상되었습니다.');
  }
}

function saveRetryQueue(queue) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', checkpointKey(salt), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(queue), 'utf-8'), cipher.final()]);
  const envelope = {
    version: 1,
    algorithm: 'aes-256-gcm',
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
  fs.writeFileSync(RETRY_QUEUE_FILE, JSON.stringify(envelope, null, 2) + '\n', 'utf-8');
}

function setWorkflowOutput(status) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `status=${status}\n`, 'utf-8');
}

function validateGeneratedPost(text, langCode) {
  const errors = [];
  const fm = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/);
  if (!fm) return ['frontmatter 구분자 누락'];
  const meta = fm[1];
  const body = text.slice(fm[0].length).trim();
  const contentBody = body
    .replace(/^##\s.*$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/[*`]/g, '')
    .trim();
  const readField = (name) => {
    const match = meta.match(new RegExp('^' + name + ':\\s*(.*)$', 'm'));
    return match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
  };

  for (const field of ['title', 'description', 'publishDate', 'image']) {
    if (!readField(field)) errors.push(field + ' 누락');
  }
  if (readField('title').length > 120) errors.push('title 120자 초과');
  if (readField('description').length > 160) errors.push('description 160자 초과');
  if (!Number.isFinite(Date.parse(readField('publishDate')))) errors.push('publishDate 형식 오류');
  if (!/^\/images\//.test(readField('image')) && !/^https?:\/\//i.test(readField('image')))
    errors.push('image 경로 형식 오류');
  if (!/^category:\s*['"]?troubleshooting['"]?\s*$/m.test(meta)) errors.push('category 오류');

  if (langCode === 'ko') {
    if (contentBody.length < 2400) errors.push('한국어 본문 2,400자 미만');
    if (contentBody.length > 3000) errors.push('한국어 본문 3,000자 초과');
  } else {
    let wordCount;
    try {
      const segmenter = new Intl.Segmenter(langCode, { granularity: 'word' });
      wordCount = [...segmenter.segment(contentBody)].filter((segment) => segment.isWordLike).length;
    } catch {
      wordCount = (contentBody.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) || []).length;
    }
    if (wordCount < 900) errors.push('본문 900단어 미만');
    if (wordCount > 1100) errors.push('본문 1,100단어 초과');
  }

  const headings = [...body.matchAll(/^##\s+(\d+)[.)]\s+.+$/gm)].map((match) => Number(match[1]));
  const allH2 = [...body.matchAll(/^##\s+/gm)];
  if (allH2.length !== 5 || headings.join(',') !== '1,2,3,4,5') errors.push('H2 제목이 1~5번 순서로 정확히 5개가 아님');

  const questions = [...body.matchAll(/^\*\*Q([1-3])\.\*\*\s*\S.*$/gm)].map((match) => Number(match[1]));
  const answers = [...body.matchAll(/^\*\*A([1-3])\.\*\*\s*\S.*$/gm)].map((match) => Number(match[1]));
  if (questions.join(',') !== '1,2,3') errors.push('FAQ 질문이 Q1~Q3 정확히 3개가 아님');
  if (answers.join(',') !== '1,2,3') errors.push('FAQ 답변이 A1~A3 정확히 3개가 아님');
  for (let n = 1; n <= 3; n++) {
    const pairPattern = new RegExp('\\*\\*Q' + n + '\\.\\*\\*[^\\n]*\\n\\n\\*\\*A' + n + '\\.\\*\\*');
    if (!pairPattern.test(body)) errors.push('Q' + n + '/A' + n + ' 사이 빈 줄 누락');
  }

  if (!/!\[[^\]]*\]\((?:https?:\/\/|\/images\/)[^)]+\)/.test(body)) errors.push('본문 중간 이미지 누락');
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
function inspectAndHealMarkdown(body, langCode) {
  let healed = body.trim();
  void langCode;
  const auditLogs = [];

  // 1. [헤딩 검수] 볼드를 정리하고 번호만 표준화해 원고별 제목을 보존
  healed = healed.replace(/^(#{1,6}\s+)\*\*(.*?)\*\*/gm, '$1$2');
  healed = healed.replace(/^#{1,6}\s*1[.\s]+([^\n]+)/m, (_match, title) => `## 1. ${title.trim()}`);
  healed = healed.replace(/^#{1,6}\s*2[.\s]+([^\n]+)/m, (_match, title) => `## 2. ${title.trim()}`);
  healed = healed.replace(/^#{1,6}\s*3[.\s]+([^\n]+)/m, (_match, title) => `## 3. ${title.trim()}`);
  healed = healed.replace(/^#{1,6}\s*4[.\s]+([^\n]+)/m, (_match, title) => `## 4. ${title.trim()}`);
  healed = healed.replace(/^#{1,6}\s*5[.\s]+([^\n]+)/m, (_match, title) => `## 5. ${title.trim()}`);

  // 2. Q&A 표식을 정돈하고 질문-답변 사이에 정확히 빈 줄 하나 둡니다.
  const rawQnACount = (healed.match(/Q[1-3]\./gi) || []).length;
  if (rawQnACount > 0) {
    const faqLines = healed.split(/\r?\n/).map((line) =>
      line
        .replace(/^[ \t]*\*\*Q([1-3])\.\*\*[ \t]*/, '**Q$1.** ')
        .replace(/^[ \t]*Q([1-3])\.[ \t]*/, '**Q$1.** ')
        .replace(/^[ \t]*\*\*A([1-3])\.\*\*[ \t]*/, '**A$1.** ')
        .replace(/^[ \t]*A([1-3])\.[ \t]*/, '**A$1.** ')
    );
    const normalizedFaq = [];
    for (const line of faqLines) {
      if (/^\*\*A[1-3]\.\*\*/.test(line)) {
        while (normalizedFaq.length && normalizedFaq[normalizedFaq.length - 1] === '') normalizedFaq.pop();
        if (/^\*\*Q[1-3]\.\*\*/.test(normalizedFaq[normalizedFaq.length - 1] || '')) normalizedFaq.push('');
      }
      normalizedFaq.push(line);
    }
    healed = normalizedFaq.join('\n').replace(/\n{3,}/g, '\n\n');
    auditLogs.push('Q&A 질문과 답변을 빈 줄로 분리해 표식을 정돈했습니다.');
  }

  // 3. [볼드 공백 교정] ** 키워드 ** -> **키워드**
  if (
    /\*\*[ \\t]+[^*\\n]+[ \\t]+\*\*/.test(healed) ||
    /\*\*[ \\t]+[^*\\n]+\*\*/.test(healed) ||
    /\*\*[^*\\n]+[ \\t]+\*\*/.test(healed)
  ) {
    healed = healed
      .replace(/\*\*[ \\t]+([^*\\n]+?)[ \\t]+\*\*/g, '**$1**')
      .replace(/\*\*[ \\t]+([^*\\n]+?)\*\*/g, '**$1**')
      .replace(/\*\*([^*\\n]+?)[ \\t]+\*\*/g, '**$1**');
    auditLogs.push('볼드 안쪽 공백 정돈');
  }

  // 4. [특수문자 및 LaTeX 치환]
  healed = healed
    .replace(/\\times/g, 'x')
    .replace(/\\circ/g, '°')
    .replace(/\\approx/g, '≈')
    .replace(/\$([A-Za-z0-9_-]+)\$/g, '`$1`')
    .replace(/~/g, '-');

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

const TARGET_LANGS = [
  {
    code: 'ko',
    name: 'Korean',
    osUi: '대시보드, 결제 수단, 인보이스, 계정 설정',
    localeContext: 'Korean-language readers in South Korea',
  },
  {
    code: 'en',
    name: 'English',
    osUi: 'Dashboard, Payment Methods, Billing, Invoices',
    localeContext: 'English-language readers in the United States',
  },
  {
    code: 'ja',
    name: 'Japanese',
    osUi: 'ダッシュボード, 支払い方法, 請求書, アカウント設定',
    localeContext: 'Japanese-language readers in Japan',
  },
  {
    code: 'de',
    name: 'German',
    osUi: 'Dashboard, Zahlungsmethoden, Rechnungen, Kontoeinstellungen',
    localeContext: 'German-language readers in Germany',
  },
  {
    code: 'fr',
    name: 'French',
    osUi: 'Tableau de bord, Modes de paiement, Factures, Paramètres',
    localeContext: 'French-language readers in France',
  },
  {
    code: 'es',
    name: 'Spanish',
    osUi: 'Panel de control, Métodos de pago, Facturación, Configuración',
    localeContext: 'Spanish-language readers in Spain',
  },
  {
    code: 'it',
    name: 'Italian',
    osUi: 'Dashboard, Metodi di pagamento, Fatture, Impostazioni',
    localeContext: 'Italian-language readers in Italy',
  },
  {
    code: 'pt',
    name: 'Portuguese',
    osUi: 'Painel, Formas de Pagamento, Faturas, Configurações',
    localeContext: 'Portuguese-language readers in Brazil',
  },
  {
    code: 'nl',
    name: 'Dutch',
    osUi: 'Dashboard, Betaalmethoden, Facturen, Accountinstellingen',
    localeContext: 'Dutch-language readers in the Netherlands',
  },
  {
    code: 'pl',
    name: 'Polish',
    osUi: 'Pulpit, Metody płatności, Faktury, Ustawienia konta',
    localeContext: 'Polish-language readers in Poland',
  },
  {
    code: 'id',
    name: 'Indonesian',
    osUi: 'Dasbor, Metode Pembayaran, Tagihan / Faktur, Pengaturan',
    localeContext: 'Indonesian-language readers in Indonesia',
  },
  {
    code: 'vi',
    name: 'Vietnamese',
    osUi: 'Bảng điều khiển, Phương thức thanh toán, Hóa đơn, Cài đặt',
    localeContext: 'Vietnamese-language readers in Vietnam',
  },
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function fetchWithRetry(prompt, maxRetries = 3, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-6-luna',
          reasoning: { effort: 'none' },
          max_output_tokens: 8192,
          input: prompt,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        const message = payload?.error?.message || `HTTP ${response.status}`;
        throw new Error(`OpenAI API 오류: ${message}`);
      }

      const generatedText = (payload.output || [])
        .flatMap((item) => item.content || [])
        .filter((item) => item.type === 'output_text')
        .map((item) => item.text || '')
        .join('\n')
        .trim();

      if (!generatedText) throw new Error('OpenAI 응답에 글 본문이 없습니다.');
      return generatedText;
    } catch (error) {
      console.warn(`⚠️ [호출 재시도 ${attempt}/${maxRetries}]: ${error.message}`);
      if (attempt === maxRetries) throw error;
      await delay(delayMs * attempt);
    }
  }
  throw new Error('OpenAI API 호출이 최대 재시도 횟수를 초과했습니다.');
}

async function generateSinglePost(lang, index, topic, publishDateBase = new Date(), imageSet, resumeState = null) {
  const i18n = I18N_SECTIONS[lang.code] || I18N_SECTIONS.ko;

  console.log(`\n🚀 [${index + 1}/12] ${lang.name} (${lang.code}) 2-1호기 애드센스 표준 포스팅 생성 중...`);

  const { coverUrl, bodyUrl } = imageSet || getPostImages(index);
  const pubDateIso = getKstPublishDateIso(publishDateBase);

  // 🎯 [프롬프트: 2,400~2,600자 정량화 및 Q&A 빈 줄 2개 규격 명확화]
  const prompt = `
Write a high-quality, practical troubleshooting guide natively in ${lang.name}.
Write this locale's article as an independent original composition; do not translate or imitate another locale's draft.
Keep the shared topic as the central subject. Adapt phrasing and documented local details to this locale without changing the factual core. Do not invent a customer, company, transaction, personal encounter, setting, backstory, or outcome.
Target Culture: "${lang.localeContext}"
Topic: "${topic}"

[ADSENSE QUALITY & LENGTH REQUIREMENT]
- For Korean (ko): Write exactly around 2,400 - 2,600 characters (do NOT exceed 3,000 characters).
- For other languages: Write exactly 900 - 1,100 words.
- Tone: Clear, trustworthy, and practical, without implying the author holds a real professional role.
${buildNarrativeVoiceInstructions(lang.name)}
- Keep technical instructions, safety warnings, and sources precise and factual.

[STRUCTURE - STRICT 5 H2 HEADINGS]
Write exactly five numbered H2 headings in ${lang.name}, numbered 1 through 5. Write concise headings in the target language that fit ${topic} and each section's content. Each heading must make the specific topic or decision visible and describe what that section helps the reader do or understand. Prefer concrete topic terms and actions over editorial labels. Do not use headings that could be reused unchanged for an unrelated article or only name a section format or vague urgency. Avoid generic boilerplate, guaranteed time/results, fear-based wording, and unverified professional credentials. Do not state a time-to-solve or guaranteed financial outcome unless trusted topic-specific documentation supports that exact claim. The bracketed descriptions below are instructions; never copy their brackets or placeholder text into the article.

## 1. [topic-specific opening heading]
Write 2 detailed paragraphs that begin at the reader's topic-specific decision point. Show the guide's first-person reasoning and practical risk, then begin diagnosing it. Do not invent a real-seeming scene or personal/customer event.

## 2. [topic-specific heading in ${lang.name}]
Write 2 analytical paragraphs explaining only the technical causes that fit the topic (such as gateway risk rules, 3DS authentication, tax form issues, or intermediary bank holds). Do not force unrelated causes.

## 3. [topic-specific heading in ${lang.name}]
Provide 3 concrete resolution steps matching "${lang.osUi}". Use clean numbered lists with practical action items.

## 4. [topic-specific heading in ${lang.name}]
Write 2 paragraphs of practical precautions and operational tips to prevent recurring payment blocks and charges.

## 5. [topic-specific heading in ${lang.name}]
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

  const renderAndValidate = (rawText) => {
    let text = rawText.trim();
    if (text.startsWith('```markdown')) text = text.replace(/^```markdown\n/, '').replace(/\n```$/, '');
    if (text.startsWith('```')) text = text.replace(/^```\n/, '').replace(/\n```$/, '');

    const fmMatch = text.match(/^---[\s\S]*?---\n*/);
    if (!fmMatch) return { content: null, errors: ['frontmatter 구분자 누락'] };

    let frontmatter = fmMatch[0].trim();
    let body = text.slice(fmMatch[0].length).trim();
    body = body.replace(/^#\s+[^\n]+\n+/, '');
    frontmatter = frontmatter
      .replace(/category:\s*["'][^"']*["']/i, "category: 'troubleshooting'")
      .replace(/category:\s*[^\n\r]+/i, "category: 'troubleshooting'");
    body = inspectAndHealMarkdown(body, lang.code);

    if (lang.code === 'ko') {
      console.log(`   📏 [2-1호기 본문 최종 글자 수] ${body.length}자 (애드센스 표준: 2,400~2,600자)`);
    }

    const middleImageMarkdown = `\n\n![Troubleshooting Guide](${bodyUrl})\n\n`;
    if (body.includes('## 2.')) body = body.replace(/(##\s*2\.[^\n]+)/, `${middleImageMarkdown}$1`);
    else body = `${middleImageMarkdown}${body}`;

    text = `${frontmatter}\n\n${body}\n`;
    return { content: text, errors: validateGeneratedPost(text, lang.code) };
  };

  let draftText = resumeState?.draftText || null;
  let validationErrors = resumeState?.validationErrors || [];
  for (let correctionAttempt = 0; correctionAttempt <= 2; correctionAttempt++) {
    let requestPrompt = prompt;
    if (correctionAttempt > 0) {
      const wordCountGuidance = buildWordCountCorrectionGuidance(validationErrors);
      requestPrompt = `${prompt}

[필수 교정 요청: ${correctionAttempt}/2]
바로 이전 원고를 아래 정확한 검증 오류 목록에 따라 수정하세요.
오류를 모두 해결하고 frontmatter부터 본문 끝까지 완성된 원고 전체를 다시 출력하세요.
기존 글의 의미를 불필요하게 바꾸지 말고, 제목·설명·카테고리·태그·주제·발행일·이미지 필드는 그대로 유지하세요.
검증 오류 목록(JSON):
${JSON.stringify(validationErrors)}
${wordCountGuidance ? `\n${wordCountGuidance}\n` : ''}
이전 원고:
${draftText}
`;
    } else if (resumeState?.validationErrors?.length) {
      const wordCountGuidance = buildWordCountCorrectionGuidance(resumeState.validationErrors);
      requestPrompt = `${prompt}

[이전 실행의 검증 오류를 고려한 재작성]
이전 실행에서 발견한 정확한 문제 목록:
${JSON.stringify(resumeState.validationErrors)}
${wordCountGuidance ? `\n${wordCountGuidance}\n` : ''}
${resumeState.draftText ? `이전 원고:\n${resumeState.draftText}` : '이전 실행 원고는 저장하지 않았으므로, 새로 작성하면서 모든 검증 오류를 해결하세요.'}
처음부터 완전한 원고를 작성하고 오류 목록의 모든 항목을 해결하세요.
`;
    }

    let rawText;
    try {
      rawText = await fetchWithRetry(requestPrompt, 3, 3000);
    } catch (error) {
      console.error(`❌ [API 호출 실패] ${lang.name}: ${error.message}`);
      return {
        ok: false,
        content: null,
        errors: [`API 호출 실패: ${error.message}`],
        draftText,
        correctionAttempts: correctionAttempt,
      };
    }

    const result = renderAndValidate(rawText);
    if (!result.errors.length) {
      console.log(`   ✅ [검증 통과] ${lang.code} 원고를 임시 체크포인트에 보존했습니다.`);
      return {
        ok: true,
        content: result.content,
        errors: [],
        draftText: null,
        correctionAttempts: correctionAttempt,
      };
    }

    draftText = rawText;
    validationErrors = result.errors;
    console.warn(`⚠️ [검증 실패] ${lang.code} 교정 ${correctionAttempt}/2: ${validationErrors.join(', ')}`);
  }

  return {
    ok: false,
    content: null,
    errors: validationErrors,
    draftText,
    correctionAttempts: 2,
  };
}

async function run() {
  console.log('==================================================');
  console.log('LifeWebLab: 언어별 교정 재시도 및 원자적 12개국 발행');
  console.log('==================================================');

  const queue = loadRetryQueue();
  if (!fs.existsSync(TOPICS_FILE)) throw new Error('topics.txt 파일이 존재하지 않습니다.');
  const topicLines = fs
    .readFileSync(TOPICS_FILE, 'utf-8')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (!topicLines.length) {
    if (queue.length)
      throw new Error('주제 파일은 비어 있지만 복구 체크포인트가 남아 있습니다. 자동으로 버리지 않습니다.');
    console.log('새 주제가 없습니다. 생성하지 않습니다.');
    setWorkflowOutput('idle');
    return;
  }

  const topic = topicLines[0];
  const activeJobIndex = queue.findIndex((job) => job.topic === topic);
  if (activeJobIndex < 0 && queue.length) {
    throw new Error('복구 큐의 주제가 topics.txt 첫 주제와 다릅니다. 잘못된 주제 건너뛰기를 막기 위해 중단합니다.');
  }

  let job;
  if (activeJobIndex >= 0) {
    job = queue[activeJobIndex];
    job.slug = job.slug || createTopicFileSlug(topic);
    job.queuedAt = job.queuedAt || new Date().toISOString();
    job.validatedPosts = job.validatedPosts && typeof job.validatedPosts === 'object' ? job.validatedPosts : {};
    job.imageSets = job.imageSets && typeof job.imageSets === 'object' ? job.imageSets : {};
    job.failedCodes = Array.isArray(job.failedCodes) ? job.failedCodes : [];
    job.errorsByCode = job.errorsByCode && typeof job.errorsByCode === 'object' ? job.errorsByCode : {};
  } else {
    job = {
      topic,
      slug: createTopicFileSlug(topic),
      queuedAt: new Date().toISOString(),
      validatedPosts: {},
      failedCodes: [],
      errorsByCode: {},
      imageSets: {},
      promptRecipeVersion: PROMPT_RECIPE_VERSION,
    };
    for (let i = 0; i < TARGET_LANGS.length; i++) job.imageSets[TARGET_LANGS[i].code] = getPostImages(i);
    queue.push(job);
    saveRetryQueue(queue);
  }

  if (reconcilePromptCheckpoint(job)) {
    console.warn('⚠️ 프롬프트 버전이 변경되어 이전 체크포인트 원고를 무효화하고 새 지침으로 다시 작성합니다.');
    saveRetryQueue(queue);
  }

  // 체크포인트의 기존 성공 원고도 다시 검사하고, 실패 언어만 호출합니다.
  for (let i = 0; i < TARGET_LANGS.length; i++) {
    const lang = TARGET_LANGS[i];
    const saved = job.validatedPosts[lang.code];
    if (!saved) continue;
    const savedErrors = validateGeneratedPost(saved, lang.code);
    if (savedErrors.length) {
      console.warn(`⚠️ 체크포인트 ${lang.code} 재검사 실패. 해당 언어만 다시 작성합니다: ${savedErrors.join(', ')}`);
      delete job.validatedPosts[lang.code];
      job.errorsByCode[lang.code] = savedErrors;
      saveRetryQueue(queue);
    }
  }

  for (let i = 0; i < TARGET_LANGS.length; i++) {
    const lang = TARGET_LANGS[i];
    if (job.validatedPosts[lang.code]) {
      console.log(`⏭️ ${lang.code}: 이전 실행에서 검증된 원고를 보존하고 재생성하지 않습니다.`);
      continue;
    }

    const imageSet = job.imageSets[lang.code] || getPostImages(i);
    job.imageSets[lang.code] = imageSet;
    const result = await generateSinglePost(lang, i, topic, new Date(job.queuedAt), imageSet, {
      validationErrors: job.errorsByCode[lang.code] || [],
      draftText: null,
    });

    if (result.ok) {
      job.validatedPosts[lang.code] = result.content;
      delete job.errorsByCode[lang.code];
      job.failedCodes = job.failedCodes.filter((code) => code !== lang.code);
      console.log(`✅ ${lang.code}: 검증된 원고를 체크포인트에 저장했습니다.`);
    } else {
      job.errorsByCode[lang.code] = result.errors;
      if (!job.failedCodes.includes(lang.code)) job.failedCodes.push(lang.code);
      console.error(
        `❌ ${lang.code}: 초기 생성과 최대 2회의 validator-guided 교정 후에도 통과하지 못했습니다. (교정 시도 ${result.correctionAttempts}회)`
      );
    }

    // 워크플로가 정상 종료하면 이 JSON 체크포인트가 커밋되어 다음 실행에 이어집니다.
    saveRetryQueue(queue);
    await delay(1000);
  }

  // 최종 검사에서 문제가 된 언어만 체크포인트에서 제외해 다시 생성합니다.
  for (const lang of TARGET_LANGS) {
    if (!job.validatedPosts[lang.code]) continue;
    const errors = validateGeneratedPost(job.validatedPosts[lang.code], lang.code);
    if (errors.length) {
      delete job.validatedPosts[lang.code];
      job.errorsByCode[lang.code] = errors;
    }
  }

  const publication = decidePublishLocales(
    TARGET_LANGS,
    Object.keys(job.validatedPosts).filter((code) => typeof job.validatedPosts[code] === 'string'),
    10
  );
  const validCodes = publication.passingCodes;
  job.failedCodes = publication.failedCodes;
  if (!publication.canPublish) {
    job.status = 'checkpoint';
    saveRetryQueue(queue);
    console.warn(
      `🧷 ${validCodes.length}/12개 언어만 통과했습니다. 기준(10개)에 못 미쳐 이번 주제는 게시하지 않습니다. 실패 언어 [${job.failedCodes.join(', ')}]는 다음 실행에서 이어갑니다.`
    );
    setWorkflowOutput('checkpoint');
    return;
  }

  job.status = 'ready';
  job.readyAt = new Date().toISOString();
  saveRetryQueue(queue);
  console.log(
    `✅ ${validCodes.length}/12개 언어 검증 통과. 게시 대상: [${validCodes.join(', ')}], 제외 언어: [${job.failedCodes.join(', ')}]. 암호화된 준비 체크포인트를 저장했습니다.`
  );
  setWorkflowOutput('ready');
}

async function materializeCheckpoint() {
  const queue = loadRetryQueue();
  if (!fs.existsSync(TOPICS_FILE)) throw new Error('topics.txt 파일이 존재하지 않습니다.');
  const topicLines = fs
    .readFileSync(TOPICS_FILE, 'utf-8')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (!topicLines.length) throw new Error('topics.txt가 비어 있어 체크포인트를 게시할 수 없습니다.');

  const topic = topicLines[0];
  const jobIndex = queue.findIndex((item) => item.topic === topic);
  if (jobIndex < 0) throw new Error('현재 주제와 일치하는 발행 준비 체크포인트가 없습니다.');
  const job = queue[jobIndex];
  if (job.promptRecipeVersion !== PROMPT_RECIPE_VERSION) {
    throw new Error('체크포인트의 프롬프트 버전이 현재 생성기와 다릅니다. 먼저 생성 단계에서 다시 작성해야 합니다.');
  }
  if (job.status !== 'ready') throw new Error('체크포인트가 12개 언어 발행 준비 상태가 아닙니다.');
  const publication = decidePublishLocales(
    TARGET_LANGS,
    Object.keys(job.validatedPosts || {}).filter((code) => typeof job.validatedPosts[code] === 'string'),
    10
  );
  const validLangs = publication.passingLocales;
  if (!publication.canPublish) {
    throw new Error(`유효 원고가 ${validLangs.length}/12개뿐입니다. 최소 10개 기준 미달로 게시하지 않습니다.`);
  }

  for (const lang of validLangs) {
    const errors = validateGeneratedPost(job.validatedPosts[lang.code], lang.code);
    if (errors.length) throw new Error(`최종 체크포인트 검증 실패(${lang.code}): ${errors.join(', ')}`);
  }
  const skipped = TARGET_LANGS.filter((lang) => !job.validatedPosts[lang.code]).map((lang) => lang.code);
  console.log(`게시 제외 언어: [${skipped.join(', ')}]`);

  const reusableLocales = new Set(
    findReusablePostLocales(TARGET_LANGS, job.slug, job.validatedPosts, (localeCode, filename) => {
      const filePath = path.join(POSTS_BASE_DIR, localeCode, filename);
      return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;
    })
  );

  const createdFiles = [];
  try {
    for (const lang of validLangs) {
      if (reusableLocales.has(lang.code)) continue;
      const targetDir = path.join(POSTS_BASE_DIR, lang.code);
      fs.mkdirSync(targetDir, { recursive: true });
      const filePath = path.join(targetDir, `${job.slug}.md`);
      fs.writeFileSync(filePath, job.validatedPosts[lang.code], 'utf-8');
      createdFiles.push(filePath);
    }
  } catch (error) {
    for (const filePath of createdFiles) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error(`Failed to remove partial output ${filePath}: ${cleanupError.message}`);
      }
    }
    throw error;
  }

  topicLines.shift();
  fs.writeFileSync(TOPICS_FILE, topicLines.join('\n') + (topicLines.length ? '\n' : ''), 'utf-8');
  queue.splice(jobIndex, 1);
  saveRetryQueue(queue);
  console.log(
    `✅ 원자적 게시 파일 생성 완료: ${job.slug}의 ${validLangs.length}/12개 통과 언어와 주제 포인터를 함께 준비했습니다.`
  );
}

const task = process.argv.includes('--materialize') ? materializeCheckpoint() : run();
task.catch((error) => {
  console.error('❌ 자동 발행 준비 실패:', error.message);
  process.exitCode = 1;
});

