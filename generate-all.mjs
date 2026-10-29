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


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
if (!PEXELS_API_KEY) {
  console.error('❌ PEXELS_API_KEY가 없습니다. Pexels 주제 매칭 없이 발행하지 않습니다.');
  process.exit(1);
}
const POSTS_BASE_DIR = path.resolve('src/data/post');
const TOPICS_FILE = path.resolve('topics.txt');
const RETRY_QUEUE_FILE = path.resolve('.publish-retry-queue.json');

function cleanMarkdownLabel(value) {
  return String(value || '').replace(/[\r\n\[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240);
}

function scorePhotoAlt(topicTerms, alt) {
  const normalizedAlt = String(alt || '').normalize('NFKC').toLocaleLowerCase();
  return topicTerms.reduce((score, term) => normalizedAlt.includes(term) ? score + Math.min(term.length, 8) : score, 0);
}

async function searchPexelsImagePair(topic) {
  const topicTerms = [...new Set((String(topic).normalize('NFKC').toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || []))];
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', topic);
  url.searchParams.set('per_page', '80');
  const response = await fetch(url, {
    headers: { Authorization: PEXELS_API_KEY },
    signal: AbortSignal.timeout(30000)
  });
  const payload = await response.json();
  if (!response.ok) throw new Error('Pexels 검색 실패: HTTP ' + response.status);
  const candidates = (Array.isArray(payload.photos) ? payload.photos : [])
    .filter(photo => photo && Number.isFinite(photo.id) && photo.alt && photo.url && photo.photographer && photo.src)
    .map((photo, position) => ({
      id: photo.id,
      alt: cleanMarkdownLabel(photo.alt),
      photoPageUrl: photo.url,
      photographer: cleanMarkdownLabel(photo.photographer),
      photographerUrl: photo.photographer_url,
      imageUrl: photo.src.large2x || photo.src.large || photo.src.original,
      score: scorePhotoAlt(topicTerms, photo.alt),
      position
    }))
    .filter(photo => /^https:\/\/images\.pexels\.com\//i.test(photo.imageUrl) && /^https:\/\/www\.pexels\.com\//i.test(photo.photoPageUrl))
    .sort((a, b) => b.score - a.score || a.position - b.position);
  const distinct = [];
  const seenIds = new Set();
  for (const photo of candidates) {
    if (seenIds.has(photo.id)) continue;
    seenIds.add(photo.id);
    distinct.push(photo);
    if (distinct.length === 2) break;
  }
  if (distinct.length !== 2) {
    throw new Error('Pexels 검색에서 alt 텍스트가 있는 서로 다른 사진 2장을 찾지 못했습니다. 이번 주제 생성을 중단합니다.');
  }
  console.log(\`🖼️ Pexels alt 매칭 점수: 사진 \${distinct[0].id}=\${distinct[0].score}, 사진 \${distinct[1].id}=\${distinct[1].score}\`);
  return {
    coverUrl: distinct[0].imageUrl,
    bodyUrl: distinct[1].imageUrl,
    coverAlt: distinct[0].alt,
    bodyAlt: distinct[1].alt,
    coverPhotoId: distinct[0].id,
    bodyPhotoId: distinct[1].id,
    coverPhotoPageUrl: distinct[0].photoPageUrl,
    bodyPhotoPageUrl: distinct[1].photoPageUrl,
    coverPhotographer: distinct[0].photographer,
    bodyPhotographer: distinct[1].photographer,
    coverPhotographerUrl: distinct[0].photographerUrl,
    bodyPhotographerUrl: distinct[1].photographerUrl
  };
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
    if (envelope.length) throw new Error('암호화되지 않은 기존 체크포인트가 있습니다. 공개 저장소에 원고를 쓰지 않도록 수동 확인이 필요합니다.');
    return [];
  }
  if (envelope.version !== 1 || envelope.algorithm !== 'aes-256-gcm') {
    throw new Error('.publish-retry-queue.json 암호화 형식이 올바르지 않습니다.');
  }
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', checkpointKey(Buffer.from(envelope.salt, 'base64')), Buffer.from(envelope.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
      decipher.final()
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
    ciphertext: ciphertext.toString('base64')
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
  const contentBody = body.replace(/^##\s.*$/gm, '').replace(/!\[[^\]]*\]\([^)]+\)/g, '').replace(/[*`]/g, '').trim();
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
  if (!/^\/images\//.test(readField('image')) && !/^https?:\/\//i.test(readField('image'))) errors.push('image 경로 형식 오류');
  if (!/^category:\s*['"]?troubleshooting['"]?\s*$/m.test(meta)) errors.push('category 오류');
  if (!/\[Photos provided by Pexels\]\(https:\/\/www\.pexels\.com\/?\)/.test(body)) errors.push('Pexels 링크 누락');
  if ((body.match(/\[Photo by [^\]]+\]\(https:\/\/www\.pexels\.com\/photo\//g) || []).length < 2) errors.push('사진 촬영자 링크 2개 미만');

  if (langCode === 'ko') {
    if (contentBody.length < 2400) errors.push('한국어 본문 2,400자 미만');
    if (contentBody.length > 3000) errors.push('한국어 본문 3,000자 초과');
  } else {
    let wordCount = 0;
    try {
      const segmenter = new Intl.Segmenter(langCode, { granularity: 'word' });
      wordCount = [...segmenter.segment(contentBody)].filter(segment => segment.isWordLike).length;
    } catch {
      wordCount = (contentBody.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) || []).length;
    }
    if (wordCount < 900) errors.push('본문 900단어 미만');
    if (wordCount > 1100) errors.push('본문 1,100단어 초과');
  }

  const headings = [...body.matchAll(/^##\s+(\d+)[.)]\s+.+$/gm)].map(match => Number(match[1]));
  const allH2 = [...body.matchAll(/^##\s+/gm)];
  if (allH2.length !== 5 || headings.join(',') !== '1,2,3,4,5') errors.push('H2 제목이 1~5번 순서로 정확히 5개가 아님');

  const questions = [...body.matchAll(/^\*\*Q([1-3])\.\*\*\s*\S.*$/gm)].map(match => Number(match[1]));
  const answers = [...body.matchAll(/^\*\*A([1-3])\.\*\*\s*\S.*$/gm)].map(match => Number(match[1]));
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
    s1: "1. 결제·송금 돌발 오류와 긴급 점검 상황",
    s2: "2. 결제 거절 및 처리 실패의 핵심 원인 분석",
    s3: "3. 1분 만에 해결하는 단계별 실무 조치 매뉴얼",
    s4: "4. 계정 동결 및 수수료 폭탄 방지를 위한 실무 체크리스트",
    s5: "5. 자주 묻는 질문 (FAQ)",
    tags: ["해외결제", "인보이스", "송금오류", "비즈니스정산"]
  },
  en: {
    s1: "1. Urgent Payment and Transfer Emergency",
    s2: "2. Root Cause Analysis of Gateway Failures",
    s3: "3. Step-by-Step Resolution Manual",
    s4: "4. Practical Checklist to Avoid Account Holds",
    s5: "5. Frequently Asked Questions (FAQ)",
    tags: ["Global Payment", "Invoicing", "Payment Gateway", "Fintech Fix"]
  },
  ja: {
    s1: "1. 海外決済・送金エラーと緊急トラブル",
    s2: "2. 決済拒否および処理失敗の根本原因",
    s3: "3. 1分で完了する実践的なトラブルシューティング手順",
    s4: "4. アカウント凍結を防ぐ実務チェックリスト",
    s5: "5. よくある質問 (FAQ)",
    tags: ["海外決済", "請求書トラブル", "送金エラー", "越境ビジネス"]
  },
  de: {
    s1: "1. Dringender Zahlungs- und Überweisungsnotfall",
    s2: "2. Ursachenanalyse von Transaktionsfehlern",
    s3: "3. Schritt-für-Schritt-Anleitung zur Fehlerbehebung",
    s4: "4. Praxis-Checkliste zur Vermeidung von Kontensperren",
    s5: "5. Häufig gestellte Fragen (FAQ)",
    tags: ["Zahlungsabwicklung", "B2B-Rechnung", "Fintech", "Transaktionsfehler"]
  },
  fr: {
    s1: "1. Situation d'urgence sur les paiements et virements",
    s2: "2. Analyse des causes principales des rejets de paiement",
    s3: "3. Manuel pratique de dépannage étape par étape",
    s4: "4. Liste de contrôle pour éviter les blocages de compte",
    s5: "5. Foire Aux Questions (FAQ)",
    tags: ["Paiement International", "Facturation B2B", "Passerelle de Paiement", "Gestion Litiges"]
  },
  es: {
    s1: "1. Emergencia crítica en transferencias y cobros",
    s2: "2. Análisis de causas raíz de rechazos de pago",
    s3: "3. Manual paso a paso para resolver incidencias",
    s4: "4. Lista de verificación para prevenir retenciones de fondos",
    s5: "5. Preguntas Frecuentes (FAQ)",
    tags: ["Pagos Internacionales", "Facturación B2B", "Pasarela de Pago", "Gestión de Cobros"]
  },
  it: {
    s1: "1. Emergenza improvvisa su pagamenti e bonifici",
    s2: "2. Analisi approfondita dei rifiuti di pagamento",
    s3: "3. Guida pratica di risoluzione passo dopo passo",
    s4: "4. Checklist essenziale per evitare blocchi del conto",
    s5: "5. Domande Frequenti (FAQ)",
    tags: ["Pagamenti Globali", "Fatturazione Elettronica", "Gateway Pagamento", "Risoluzione Errori"]
  },
  pt: {
    s1: "1. Emergência com pagamentos e transferências globais",
    s2: "2. Análise da causa raiz de recusas de pagamento",
    s3: "3. Manual prático passo a passo de resolução",
    s4: "4. Checklist essencial para evitar retenções de saldo",
    s5: "5. Perguntas Frecuentes (FAQ)",
    tags: ["Pagamentos Globais", "Faturamento B2B", "Gateway de Pagamento", "Finanças"]
  },
  nl: {
    s1: "1. Noodsituatie bij internationale betalingen",
    s2: "2. Grondige analyse van mislukte betalingstransacties",
    s3: "3. Stapsgewijze handleiding voor het direct oplossen",
    s4: "4. Checklist om rekeningblokkades te voorkomen",
    s5: "5. Veelgestelde Vragen (FAQ)",
    tags: ["Internationale Betalingen", "Facturatie", "Payment Gateway", "Financiële Tips"]
  },
  pl: {
    s1: "1. Awaryjna sytuacja z płatnościami zagranicznymi",
    s2: "2. Analiza przyczyn odrzuceń płatności i błędów",
    s3: "3. Praktyczny przewodnik rozwiązywania problemów",
    s4: "4. Lista kontrolna zapobiegająca blokadom konta",
    s5: "5. Najczęściej zadawane pytania (FAQ)",
    tags: ["Płatności Globalne", "Fakturowanie B2B", "Bramki Płatności", "Rozliczenia"]
  },
  id: {
    s1: "1. Situasi Darurat Transaksi Pembayaran dan Transfer",
    s2: "2. Analisis Akar Masalah Penolakan Gateway Pembayaran",
    s3: "3. Panduan Langkah demi Langkah Penanganan Masalah",
    s4: "4. Lembar Periksa Mencegah Penahanan Dana Akun",
    s5: "5. Pertanyaan yang Sering Diajukan (FAQ)",
    tags: ["Pembayaran Global", "Faktur Bisnis", "Gateway Pembayaran", "Fintech"]
  },
  vi: {
    s1: "1. Sự cố khẩn cấp khi thanh toán và chuyển tiền",
    s2: "2. Phân tích nguyên nhân lỗi từ chối thanh toán",
    s3: "3. Quy trình thực tế từng bước xử lý lỗi cổng thanh toán",
    s4: "4. Danh sách kiểm tra ngăn ngừa đóng băng tài khoản",
    s5: "5. Các câu hỏi thường gặp (FAQ)",
    tags: ["Thanh Toán Quốc Tế", "Hóa Đơn B2B", "Cổng Thanh Toán", "Xử Lý Sự Cố"]
  }
};

// =========================================================================
// 🛡️ [2-1호기 자가 검수 및 치유 엔진: Self-Healing Inspector]
// =========================================================================
function inspectAndHealMarkdown(body, langCode) {
  let healed = body.trim();
  const i18n = I18N_SECTIONS[langCode] || I18N_SECTIONS.ko;
  const auditLogs = [];

  // 1. [헤딩 검수 & 치유] 볼드 제거 및 2-1호기 표준 띄어쓰기 소제목 강제 안착
  healed = healed.replace(/^(#{1,6}\s+)\*\*(.*?)\*\*/gm, '$1$2');
  healed = healed.replace(/^#{1,6}\s*1[.\s]+([^\n]+)/m, `## ${i18n.s1}`);
  healed = healed.replace(/^#{1,6}\s*2[.\s]+([^\n]+)/m, `## ${i18n.s2}`);
  healed = healed.replace(/^#{1,6}\s*3[.\s]+([^\n]+)/m, `## ${i18n.s3}`);
  healed = healed.replace(/^#{1,6}\s*4[.\s]+([^\n]+)/m, `## ${i18n.s4}`);
  healed = healed.replace(/^#{1,6}\s*5[.\s]+([^\n]+)/m, `## ${i18n.s5}`);

  if (!healed.startsWith('## 1.')) {
    healed = `## ${i18n.s1}\n\n` + healed;
    auditLogs.push("1번 헤딩 누락 주입");
  }

  // 2. Q&A 표식을 정돈하고 질문-답변 사이에 정확히 빈 줄 하나 둡니다.
  const rawQnACount = (healed.match(/Q[1-3]\./gi) || []).length;
  if (rawQnACount > 0) {
    const faqLines = healed.split(/\r?\n/).map(line => line
      .replace(/^[ \t]*\*\*Q([1-3])\.\*\*[ \t]*/, '**Q$1.** ')
      .replace(/^[ \t]*Q([1-3])\.[ \t]*/, '**Q$1.** ')
      .replace(/^[ \t]*\*\*A([1-3])\.\*\*[ \t]*/, '**A$1.** ')
      .replace(/^[ \t]*A([1-3])\.[ \t]*/, '**A$1.** '));
    const normalizedFaq = [];
    for (const line of faqLines) {
      if (/^\*\*A[1-3]\.\*\*/.test(line)) {
        while (normalizedFaq.length && normalizedFaq[normalizedFaq.length - 1] === '') normalizedFaq.pop();
        if (/^\*\*Q[1-3]\.\*\*/.test(normalizedFaq[normalizedFaq.length - 1] || '')) normalizedFaq.push('');
      }
      normalizedFaq.push(line);
    }
    healed = normalizedFaq.join('\n').replace(/\n{3,}/g, '\n\n');
    auditLogs.push("Q&A 질문과 답변을 빈 줄로 분리해 표식을 정돈했습니다.");
  }

  // 3. [볼드 공백 교정] ** 키워드 ** -> **키워드**
  if (/\*\*[ \\t]+[^*\\n]+[ \\t]+\*\*/.test(healed) || /\*\*[ \\t]+[^*\\n]+\*\*/.test(healed) || /\*\*[^*\\n]+[ \\t]+\*\*/.test(healed)) {
    healed = healed.replace(/\*\*[ \\t]+([^*\\n]+?)[ \\t]+\*\*/g, '**$1**')
                   .replace(/\*\*[ \\t]+([^*\\n]+?)\*\*/g, '**$1**')
                   .replace(/\*\*([^*\\n]+?)[ \\t]+\*\*/g, '**$1**');
    auditLogs.push("볼드 안쪽 공백 정돈");
  }

  // 4. [특수문자 및 LaTeX 치환]
  healed = healed.replace(/\\times/g, 'x')
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
console.log(`📌 오늘 처리할 주제 [2-1호기 LifeWebLab]: "${currentTopic}"`);

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

function scenarioForTopic(topic) {
  let hash = 0;
  for (const char of topic) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  return TROUBLESHOOTING_SCENARIOS_30[hash % TROUBLESHOOTING_SCENARIOS_30.length];
}

const TARGET_LANGS = [
  { code: 'ko', name: 'Korean', persona: '글로벌 결제 및 비즈니스 인보이스 오류를 정확하게 해결해 주는 10년 차 핀테크 실무자', osUi: '대시보드, 결제 수단, 인보이스, 계정 설정', localeContext: '서울/수도권 글로벌 스타트업 오피스' },
  { code: 'en', name: 'English', persona: 'Veteran cross-border fintech specialist and payment gateway troubleshooter', osUi: 'Dashboard, Payment Methods, Billing, Invoices', localeContext: 'Silicon Valley tech startup / New York finance office' },
  { code: 'ja', name: 'Japanese', persona: '海外決済・送金トラブルを現場目線で解決するベテラン実務担当者', osUi: 'ダッシュボード, 支払い方法, 請求書, アカウント設定', localeContext: '東京・丸の内の越境ビジネスオフィス' },
  { code: 'de', name: 'German', persona: 'Erfahrener Fintech-Praktiker für grenzüberschreitende Zahlungen', osUi: 'Dashboard, Zahlungsmethoden, Rechnungen, Kontoeinstellungen', localeContext: 'Frankfurter Finanzdistrikt' },
  { code: 'fr', name: 'French', persona: 'Expert en résolution de litiges de paiement international et facturation B2B', osUi: 'Tableau de bord, Modes de paiement, Factures, Paramètres', localeContext: 'Centres d\'affaires à Paris' },
  { code: 'es', name: 'Spanish', persona: 'Especialista en cobros internacionales, pasarelas de pago y facturación', osUi: 'Panel de control, Métodos de pago, Facturación, Configuración', localeContext: 'Distrito corporativo en Madrid' },
  { code: 'it', name: 'Italian', persona: 'Consulente senior per pagamenti internazionali e fatturazione B2B', osUi: 'Dashboard, Metodi di pagamento, Fatture, Impostazioni', localeContext: 'Centri direzionali di Milano' },
  { code: 'pt', name: 'Portuguese', persona: 'Especialista prático em pagamentos globais e desbloqueio de contas', osUi: 'Painel, Formas de Pagamento, Faturas, Configurações', localeContext: 'Avenida Paulista em São Paulo' },
  { code: 'nl', name: 'Dutch', persona: 'Ervaren fintech troubleshooter voor internationale betalingsproblemen', osUi: 'Dashboard, Betaalmethoden, Facturen, Accountinstellingen', localeContext: 'Zuidas zakendistrict in Amsterdam' },
  { code: 'pl', name: 'Polish', persona: 'Doświadczony praktyk fintech i systemów rozliczeń B2B', osUi: 'Pulpit, Metody płatności, Faktury, Ustawienia konta', localeContext: 'Warszawskie centrum biznesowe' },
  { code: 'id', name: 'Indonesian', persona: 'Praktisi penanganan masalah pembayaran gateway dan transfer dana', osUi: 'Dasbor, Metode Pembayaran, Tagihan / Faktur, Pengaturan', localeContext: 'Kawasan SCBD Jakarta' },
  { code: 'vi', name: 'Vietnamese', persona: 'Chuyên gia xử lý sự cố cổng thanh toán quốc tế và dòng tiền', osUi: 'Bảng điều khiển, Phương thức thanh toán, Hóa đơn, Cài đặt', localeContext: 'Quận 1, TP. Hồ Chí Minh' }
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const fileSlug = `post-${Date.now().toString(36)}`;

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

async function generateSinglePost(lang, index, topic = currentTopic, slug = fileSlug, publishDateBase = new Date(), imageSet, selectedScenario = scenarioForTopic(topic), resumeState = null) {
  const i18n = I18N_SECTIONS[lang.code] || I18N_SECTIONS.ko;

  console.log(`\n🚀 [${index + 1}/12] ${lang.name} (${lang.code}) 2-1호기 애드센스 표준 포스팅 생성 중...`);

  if (!imageSet || imageSet.coverPhotoId === imageSet.bodyPhotoId) throw new Error('Pexels 사진 2장 체크포인트가 없거나 사진 ID가 중복되었습니다.');
  const { coverUrl, bodyUrl, coverAlt, bodyAlt, coverPhotoPageUrl, bodyPhotoPageUrl, coverPhotographer, bodyPhotographer } = imageSet;
  const pubDateIso = getKstPublishDateIso(publishDateBase);

  // 🎯 [프롬프트: 2,400~2,600자 정량화 및 Q&A 빈 줄 2개 규격 명확화]
  const prompt = `
You are a ${lang.persona}.
Write a high-quality, practical troubleshooting guide natively in ${lang.name}.
Write this locale's article as an independent original composition; do not translate or imitate another locale's draft.
Keep the shared topic as the central subject. Use the assigned situation only as a topic-relevant illustrative frame, and adapt examples and phrasing naturally for this locale without changing factual core guidance.
Target Culture: "${lang.localeContext}"
Assigned Situation: "${selectedScenario}"
Topic: "${topic}"

[ADSENSE QUALITY & LENGTH REQUIREMENT]
- For Korean (ko): Write exactly around 2,400 - 2,600 characters (do NOT exceed 3,000 characters).
- For other languages: Write exactly 900 - 1,100 words.
- Tone: Highly informative, professional, practical workplace advice.
- Narrative voice: Write in a first-person storytelling voice ("I"/the natural first-person form in ${lang.name}) from the assigned expert persona's perspective.
- Open with a vivid but clearly illustrative scene based on the assigned situation; use roughly 30% of the article for first-person story and transitions and 70% for verified explanations, step-by-step guidance, and safety information. Build a story arc from the urgent problem through diagnosis, safe action, and outcome.
- Do not falsely claim that an illustrative scenario is a real customer case or the author's personal experience. Do not invent verified outcomes, quotations, or facts. Clearly frame hypothetical/composite events as illustrative.
- Keep first-person narration throughout the opening and transitions, while making technical instructions, safety warnings, and sources precise and factual.

[STRUCTURE - STRICT 5 H2 HEADINGS]
Use these exact H2 headings:

## ${i18n.s1}
Write 2 detailed paragraphs describing the sudden payment error emergency, the business risk, and initial panic based on: "${selectedScenario}".

## ${i18n.s2}
Write 2 analytical paragraphs explaining the technical root causes (gateway risk rules, 3DS authentication, tax form issues, or intermediary bank holds).

## ${i18n.s3}
Provide 3 concrete resolution steps matching "${lang.osUi}". Use clean numbered lists with practical action items.

## ${i18n.s4}
Write 2 paragraphs of practical precautions and operational tips to prevent recurring payment blocks and charges.

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

  const renderAndValidate = (rawText) => {
    let text = rawText.trim();
    if (text.startsWith('```markdown')) text = text.replace(/^\```markdown\n/, '').replace(/\n\```$/, '');
    if (text.startsWith('```')) text = text.replace(/^\```\n/, '').replace(/\n\```$/, '');

    const fmMatch = text.match(/^---[\s\S]*?---\n*/);
    if (!fmMatch) return { content: null, errors: ['frontmatter 구분자 누락'] };

    let frontmatter = fmMatch[0].trim();
    let body = text.slice(fmMatch[0].length).trim();
    body = body.replace(/^#\s+[^\n]+\n+/, '');
    frontmatter = frontmatter.replace(/category:\s*["'][^"']*["']/i, "category: 'troubleshooting'")
                             .replace(/category:\s*[^\n\r]+/i, "category: 'troubleshooting'");
    body = inspectAndHealMarkdown(body, lang.code);

    if (lang.code === 'ko') {
      console.log(`   📏 [2-1호기 본문 최종 글자 수] ${body.length}자 (애드센스 표준: 2,400~2,600자)`);
    }

    const credits = `Photo by [${coverPhotographer}](${coverPhotoPageUrl}) on Pexels · Photo by [${bodyPhotographer}](${bodyPhotoPageUrl}) on Pexels · [Photos provided by Pexels](https://www.pexels.com)`;
    const middleImageMarkdown = `\n\n![${bodyAlt}](${bodyUrl})\n\n${credits}\n\n`;
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
      requestPrompt = `${prompt}

[필수 교정 요청: ${correctionAttempt}/2]
바로 이전 원고를 아래 정확한 검증 오류 목록에 따라 수정하세요.
오류를 모두 해결하고 frontmatter부터 본문 끝까지 완성된 원고 전체를 다시 출력하세요.
기존 글의 의미를 불필요하게 바꾸지 말고, 제목·설명·카테고리·태그·주제·발행일·이미지 필드는 그대로 유지하세요.
검증 오류 목록(JSON):
${JSON.stringify(validationErrors)}
이전 원고:
${draftText}
`;
    } else if (resumeState?.validationErrors?.length) {
      requestPrompt = `${prompt}

[이전 실행의 검증 오류를 고려한 재작성]
이전 실행에서 발견한 정확한 문제 목록:
${JSON.stringify(resumeState.validationErrors)}
${resumeState.draftText ? `이전 원고:\n${resumeState.draftText}` : '이전 실행 원고는 저장하지 않았으므로, 새로 작성하면서 모든 검증 오류를 해결하세요.'}
처음부터 완전한 원고를 작성하고 오류 목록의 모든 항목을 해결하세요.
`;
    }

    let rawText;
    try {
      rawText = await fetchWithRetry(requestPrompt, 3, 3000);
    } catch (error) {
      console.error(`❌ [API 호출 실패] ${lang.name}: ${error.message}`);
      return { ok: false, content: null, errors: [`API 호출 실패: ${error.message}`], draftText, correctionAttempts: correctionAttempt };
    }

    const result = renderAndValidate(rawText);
    if (!result.errors.length) {
      console.log(`   ✅ [검증 통과] ${lang.code} 원고를 임시 체크포인트에 보존했습니다.`);
      return { ok: true, content: result.content, errors: [], draftText: null, correctionAttempts: correctionAttempt };
    }

    draftText = rawText;
    validationErrors = result.errors;
    console.warn(`⚠️ [검증 실패] ${lang.code} 교정 ${correctionAttempt}/2: ${validationErrors.join(', ')}`);
  }

  return { ok: false, content: null, errors: validationErrors, draftText, correctionAttempts: 2 };
}

async function run() {
  console.log("==================================================");
  console.log("LifeWebLab: 언어별 교정 재시도 및 원자적 12개국 발행");
  console.log("==================================================");

  const queue = loadRetryQueue();
  if (!fs.existsSync(TOPICS_FILE)) throw new Error("topics.txt 파일이 존재하지 않습니다.");
  const topicLines = fs.readFileSync(TOPICS_FILE, 'utf-8').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  if (!topicLines.length) {
    if (queue.length) throw new Error("주제 파일은 비어 있지만 복구 체크포인트가 남아 있습니다. 자동으로 버리지 않습니다.");
    console.log("새 주제가 없습니다. 생성하지 않습니다.");
    setWorkflowOutput("idle");
    return;
  }

  const topic = topicLines[0];
  const activeJobIndex = queue.findIndex(job => job.topic === topic);
  if (activeJobIndex < 0 && queue.length) {
    throw new Error("복구 큐의 주제가 topics.txt 첫 주제와 다릅니다. 잘못된 주제 건너뛰기를 막기 위해 중단합니다.");
  }

  let job;
  if (activeJobIndex >= 0) {
    job = queue[activeJobIndex];
    job.slug = job.slug || ('post-' + Date.now().toString(36));
    job.queuedAt = job.queuedAt || new Date().toISOString();
    job.validatedPosts = job.validatedPosts && typeof job.validatedPosts === 'object' ? job.validatedPosts : {};
    job.imageSets = job.imageSets && typeof job.imageSets === 'object' ? job.imageSets : {};
    job.failedCodes = Array.isArray(job.failedCodes) ? job.failedCodes : [];
    job.errorsByCode = job.errorsByCode && typeof job.errorsByCode === 'object' ? job.errorsByCode : {};
    job.scenario = job.scenario || scenarioForTopic(topic);
  } else {
    job = {
      topic,
      slug: 'post-' + Date.now().toString(36),
      queuedAt: new Date().toISOString(),
      validatedPosts: {},
      failedCodes: [],
      errorsByCode: {},
      imageSets: {},
      scenario: scenarioForTopic(topic)
    };
    for (let i = 0; i < TARGET_LANGS.length; i++) job.imageSets[TARGET_LANGS[i].code] = getPostImages(i);
    queue.push(job);
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
    const result = await generateSinglePost(
      lang, i, topic, job.slug, new Date(job.queuedAt), imageSet,
      job.scenario, { validationErrors: job.errorsByCode[lang.code] || [], draftText: null }
    );

    if (result.ok) {
      job.validatedPosts[lang.code] = result.content;
      delete job.errorsByCode[lang.code];
      job.failedCodes = job.failedCodes.filter(code => code !== lang.code);
      console.log(`✅ ${lang.code}: 검증된 원고를 체크포인트에 저장했습니다.`);
    } else {
      job.errorsByCode[lang.code] = result.errors;
      if (!job.failedCodes.includes(lang.code)) job.failedCodes.push(lang.code);
      console.error(`❌ ${lang.code}: 초기 생성과 최대 2회의 validator-guided 교정 후에도 통과하지 못했습니다. (교정 시도 ${result.correctionAttempts}회)`);
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

  const validCodes = TARGET_LANGS.filter(lang => Boolean(job.validatedPosts[lang.code])).map(lang => lang.code);
  job.failedCodes = TARGET_LANGS.filter(lang => !job.validatedPosts[lang.code]).map(lang => lang.code);
  if (validCodes.length < 10) {
    job.status = 'checkpoint';
    saveRetryQueue(queue);
    console.warn(`🧷 ${validCodes.length}/12개 언어만 통과했습니다. 기준(10개)에 못 미쳐 이번 주제는 게시하지 않습니다. 실패 언어 [${job.failedCodes.join(', ')}]는 다음 실행에서 이어갑니다.`);
    setWorkflowOutput('checkpoint');
    return;
  }

  job.status = 'ready';
  job.readyAt = new Date().toISOString();
  saveRetryQueue(queue);
  console.log(`✅ ${validCodes.length}/12개 언어 검증 통과. 게시 대상: [${validCodes.join(', ')}], 제외 언어: [${job.failedCodes.join(', ')}]. 암호화된 준비 체크포인트를 저장했습니다.`);
  setWorkflowOutput("ready");
}

async function materializeCheckpoint() {
  const queue = loadRetryQueue();
  if (!fs.existsSync(TOPICS_FILE)) throw new Error("topics.txt 파일이 존재하지 않습니다.");
  const topicLines = fs.readFileSync(TOPICS_FILE, 'utf-8').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  if (!topicLines.length) throw new Error("topics.txt가 비어 있어 체크포인트를 게시할 수 없습니다.");

  const topic = topicLines[0];
  const jobIndex = queue.findIndex(item => item.topic === topic);
  if (jobIndex < 0) throw new Error("현재 주제와 일치하는 발행 준비 체크포인트가 없습니다.");
  const job = queue[jobIndex];
  if (job.status !== 'ready') throw new Error('체크포인트가 12개 언어 발행 준비 상태가 아닙니다.');
  const validLangs = TARGET_LANGS.filter(lang => typeof job.validatedPosts?.[lang.code] === 'string');
  if (validLangs.length < 10) {
    throw new Error(`유효 원고가 ${validLangs.length}/12개뿐입니다. 최소 10개 기준 미달로 게시하지 않습니다.`);
  }

  for (const lang of validLangs) {
    const errors = validateGeneratedPost(job.validatedPosts[lang.code], lang.code);
    if (errors.length) throw new Error(`최종 체크포인트 검증 실패(${lang.code}): ${errors.join(', ')}`);
  }
  const skipped = TARGET_LANGS.filter(lang => !job.validatedPosts[lang.code]).map(lang => lang.code);
  console.log(`게시 제외 언어: [${skipped.join(', ')}]`);

  const createdFiles = [];
  try {
    for (const lang of validLangs) {
      const targetDir = path.join(POSTS_BASE_DIR, lang.code);
      fs.mkdirSync(targetDir, { recursive: true });
      const filePath = path.join(targetDir, `${job.slug}.md`);
      fs.writeFileSync(filePath, job.validatedPosts[lang.code], 'utf-8');
      createdFiles.push(filePath);
    }
  } catch (error) {
    for (const filePath of createdFiles) {
      try { fs.unlinkSync(filePath); } catch {}
    }
    throw error;
  }

  topicLines.shift();
  fs.writeFileSync(TOPICS_FILE, topicLines.join('\n') + (topicLines.length ? '\n' : ''), 'utf-8');
  queue.splice(jobIndex, 1);
  saveRetryQueue(queue);
  console.log(`✅ 원자적 게시 파일 생성 완료: ${job.slug}의 ${validLangs.length}/12개 통과 언어와 주제 포인터를 함께 준비했습니다.`);
}

const task = process.argv.includes('--materialize') ? materializeCheckpoint() : run();
task.catch(error => {
  console.error('❌ 자동 발행 준비 실패:', error.message);
  process.exitCode = 1;
});
