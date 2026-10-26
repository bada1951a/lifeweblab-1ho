import fs from 'fs';
import path from 'path';

const POSTS_BASE_DIR = path.resolve('src/content/post');

const I18N_SECTIONS = {
  ko: {
    s1: "1. 결제·송금 돌발 오류와 멘붕의 순간",
    s2: "2. 결제 거절 및 인보이스 반려의 핵심 원인 분석",
    s3: "3. 1분 만에 해결하는 단계별 실전 조치 매뉴얼",
    s4: "4. 자금 동결 및 과다 수수료 방지를 위한 실무 체크리스트",
    s5: "5. 자주 묻는 질문 (FAQ)"
  },
  en: {
    s1: "1. Critical Payment & Wire Transfer Emergency",
    s2: "2. Root Cause Breakdown of Invoicing and Gateway Failures",
    s3: "3. Step-by-Step Practical Troubleshooting Manual",
    s4: "4. Essential Checklist to Prevent Fund Holds & Surcharges",
    s5: "5. Frequently Asked Questions (FAQ)"
  },
  ja: {
    s1: "1. 海外決済・送金エラーと業務停滞の緊急事態",
    s2: "2. 決済拒否および請求書差し戻しの根本原因",
    s3: "3. 1分で解決する実践的なトラブルシューティング手順",
    s4: "4. アカウント凍結と過剰手数料を防ぐ実務チェックリスト",
    s5: "5. よくある質問 (FAQ)"
  },
  de: {
    s1: "1. Kritischer Zahlungs- und Überweisungsnotfall im Geschäftsalltag",
    s2: "2. Detaillierte Ursachenanalyse von Rechnungs- und Transaktionsfehlern",
    s3: "3. Schritt-für-Schritt-Anleitung zur sofortigen Fehlerbehebung",
    s4: "4. Praxis-Checkliste zur Vermeidung von Kontensperren und Gebühren",
    s5: "5. Häufig gestellte Fragen (FAQ)"
  },
  fr: {
    s1: "1. Situation d'urgence critique sur les paiements et virements",
    s2: "2. Analyse approfondie des rejets de paiement et factures",
    s3: "3. Manuel de dépannage étape par étape pour résoudre le litige",
    s4: "4. Liste de contrôle pour éviter les blocages de fonds et frais excessifs",
    s5: "5. Foire Aux Questions (FAQ)"
  },
  es: {
    s1: "1. Emergencia crítica en cobros internacionales y transferencias",
    s2: "2. Análisis de causas raíz de rechazos de pago y facturas devueltas",
    s3: "3. Manual paso a paso para resolver incidencias de facturación",
    s4: "4. Lista de verificación para prevenir retenciones de fondos y cargos extra",
    s5: "5. Preguntas Frecuentes (FAQ)"
  },
  it: {
    s1: "1. Emergenza improvvisa su pagamenti e bonifici internazionali",
    s2: "2. Analisi approfondita dei rifiuti di pagamento e fatture respinte",
    s3: "3. Guida pratica di risoluzione passo dopo passo",
    s4: "4. Checklist essenziale per evitare blocchi conto e commissioni nascoste",
    s5: "5. Domande Frequenti (FAQ)"
  },
  pt: {
    s1: "1. Emergência crítica com pagamentos globais e remessas internacionais",
    s2: "2. Análise da causa raiz de recusas de pagamento e faturas rejeitadas",
    s3: "3. Manual prático passo a passo para liberar fundos e pagamentos",
    s4: "4. Checklist essencial para evitar retenções de saldo e taxas abusivas",
    s5: "5. Perguntas Frecuentes (FAQ)"
  },
  nl: {
    s1: "1. Noodsituatie bij internationale betalingen en overboekingen",
    s2: "2. Grondige analyse van mislukte betalingen en afgekeurde facturen",
    s3: "3. Stapsgewijze handleiding voor het direct oplossen van betaalproblemen",
    s4: "4. Checklist om rekeningblokkades en overmatige kosten te voorkomen",
    s5: "5. Veelgestelde Vragen (FAQ)"
  },
  pl: {
    s1: "1. Awaryjna sytuacja z płatnościami i przelewami zagranicznymi",
    s2: "2. Szczegółowa analiza przyczyn odrzuceń płatności i błędów faktur",
    s3: "3. Praktyczny przewodnik rozwiązywania problemów krok po kroku",
    s4: "4. Lista kontrolna zapobiegająca blokadom środków i prowizjom",
    s5: "5. Najczęściej zadawane pytania (FAQ)"
  },
  id: {
    s1: "1. Situasi Kritis Kegagalan Pembayaran dan Transfer Dana Global",
    s2: "2. Analisis Mendalam Penyebab Penolakan Transaksi dan Faktur",
    s3: "3. Panduan Langkah demi Langkah Penanganan Masalah Pembayaran",
    s4: "4. Lembar Periksa Penting Mencegah Penahanan Dana dan Biaya Berlebih",
    s5: "5. Pertanyaan yang Sering Diajukan (FAQ)"
  },
  vi: {
    s1: "1. Sự cố khẩn cấp khi thanh toán và chuyển tiền quốc tế",
    s2: "2. Phân tích nguyên nhân gốc rễ lỗi từ chối thanh toán và hóa đơn",
    s3: "3. Quy trình thực tế từng bước xử lý lỗi cổng thanh toán",
    s4: "4. Danh sách kiểm tra ngăn ngừa đóng băng tài khoản và phí ẩn",
    s5: "5. Các câu hỏi thường gặp (FAQ)"
  }
};

function getAllMarkdownFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllMarkdownFiles(fullPath));
    } else if (file.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

function cleanPost(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const langMatch = filePath.match(/post[/\\]([a-z]{2})[/\\]/i);
  const langCode = langMatch ? langMatch[1].toLowerCase() : 'ko';
  const i18n = I18N_SECTIONS[langCode] || I18N_SECTIONS.ko;

  const fmMatch = content.match(/^---[\s\S]*?---\n*/);
  if (!fmMatch) return false;

  let frontmatter = fmMatch[0].trim();
  let body = content.slice(fmMatch[0].length).trim();

  // 최상단 빈 줄 및 H1 제거
  body = body.replace(/^\n+/, '');
  body = body.replace(/^#\s+[^\n]+\n+/, '');

  // 소제목 규격 강제 통일
  body = body.replace(/^#{1,3}\s*1\.?\s*(\[.*?\]|당시 상황.*?|Critical Payment.*?|Opening Story.*?|Die Panik.*?)/gmi, `## ${i18n.s1}`);
  body = body.replace(/^#{1,3}\s*2\.?\s*(\[.*?\]|문제의 근본 원인.*?|Root Cause.*?|Ursachenanalyse.*?|Die wahren Wurzeln.*?)/gmi, `## ${i18n.s2}`);
  body = body.replace(/^#{1,3}\s*3\.?\s*(\[.*?\]|즉시 해결한 단계별.*?|Step-by-Step.*?|Schritt-für-Schritt.*?|Der Masterplan.*?)/gmi, `## ${i18n.s3}`);
  body = body.replace(/^#{1,3}\s*4\.?\s*(\[.*?\]|재발 방지를 위한.*?|Essential Checklist.*?|Checklist.*?|Nie wieder Panik.*?)/gmi, `## ${i18n.s4}`);
  body = body.replace(/^#{1,3}\s*5\.?\s*(\[.*?\]|자주 묻는 질문.*?|Frequently Asked Questions.*?|Häufig gestellte Fragen.*?|FAQ)/gmi, `## ${i18n.s5}`);

  if (!body.startsWith('## 1.')) {
    body = `## ${i18n.s1}\n\n` + body;
  }

  // 박스 글자색 강제
  body = body.replace(/(<div style="[^"]*background-color:[^"]*)"/gi, (match, p1) => {
    if (!p1.includes('color:')) {
      return `${p1}; color: #111827;"`;
    }
    return match;
  });

  body = body.replace(/\n{3,}/g, '\n\n');

  const finalContent = `${frontmatter}\n\n${body.trim()}\n`;

  if (content !== finalContent) {
    fs.writeFileSync(filePath, finalContent, 'utf-8');
    return true;
  }
  return false;
}

function run() {
  console.log("==================================================");
  console.log("🛠️ 2-1호기 기존 포스트 서식 일괄 정비 시작");
  console.log("==================================================");

  const files = getAllMarkdownFiles(POSTS_BASE_DIR);
  console.log(`총 ${files.length}개의 포스트를 검사합니다...\n`);

  let modifiedCount = 0;
  for (const file of files) {
    const isModified = cleanPost(file);
    const relPath = path.relative(process.cwd(), file);
    if (isModified) {
      console.log(`✨ [정비 완료] ${relPath}`);
      modifiedCount++;
    } else {
      console.log(`✔️ [이상 없음] ${relPath}`);
    }
  }

  console.log(`\n🎉 완료: 총 ${files.length}개 중 ${modifiedCount}개 파일 정비 완료.`);
}

run();
