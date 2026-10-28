// =========================================================================
// 📌 [2-1호기 전용] 텍스트 유실 0% + Q&A 완벽 복구 + 볼드 공백 교정 스크립트
// =========================================================================

import fs from 'fs';
import path from 'path';

const POSTS_BASE_DIR = path.resolve('src/data/post');

const I18N_SECTIONS = {
  ko: {
    s1: "1. 결제·송금 돌발 오류와 긴급 점검 상황",
    s2: "2. 결제 거절 및 처리 실패의 핵심 원인 분석",
    s3: "3. 1분 만에 해결하는 단계별 실무 조치 매뉴얼",
    s4: "4. 계정 동결 및 수수료 폭탄 방지를 위한 실무 체크리스트",
    s5: "5. 자주 묻는 질문 (FAQ)"
  },
  en: {
    s1: "1. Urgent Payment and Transfer Emergency",
    s2: "2. Root Cause Analysis of Gateway Failures",
    s3: "3. Step-by-Step Resolution Manual",
    s4: "4. Practical Checklist to Avoid Account Holds",
    s5: "5. Frequently Asked Questions (FAQ)"
  },
  ja: {
    s1: "1. 海外決済・送金エラーと緊急トラブル",
    s2: "2. 決済拒否および処理失敗の根本原因",
    s3: "3. 1分で完了する実践的なトラブルシューティング手順",
    s4: "4. アカウント凍結を防ぐ実務チェックリスト",
    s5: "5. よくある質問 (FAQ)"
  },
  de: {
    s1: "1. Dringender Zahlungs- und Überweisungsnotfall",
    s2: "2. Ursachenanalyse von Transaktionsfehlern",
    s3: "3. Schritt-für-Schritt-Anleitung zur Fehlerbehebung",
    s4: "4. Praxis-Checkliste zur Vermeidung von Kontensperren",
    s5: "5. Häufig gestellte Fragen (FAQ)"
  },
  fr: {
    s1: "1. Situation d'urgence sur les paiements et virements",
    s2: "2. Analyse des causes principales des rejets de paiement",
    s3: "3. Manuel pratique de dépannage étape par étape",
    s4: "4. Liste de contrôle pour éviter les blocages de compte",
    s5: "5. Foire Aux Questions (FAQ)"
  },
  es: {
    s1: "1. Emergencia crítica en transferencias y cobros",
    s2: "2. Análisis de causas raíz de rechazos de pago",
    s3: "3. Manual paso a paso para resolver incidencias",
    s4: "4. Lista de verificación para prevenir retenciones de fondos",
    s5: "5. Preguntas Frecuentes (FAQ)"
  },
  it: {
    s1: "1. Emergenza improvvisa su pagamenti e bonifici",
    s2: "2. Analisi approfondita dei rifiuti di pagamento",
    s3: "3. Guida pratica di risoluzione passo dopo passo",
    s4: "4. Checklist essenziale per evitare blocchi del conto",
    s5: "5. Domande Frecuenti (FAQ)"
  },
  pt: {
    s1: "1. Emergência com pagamentos e transferências globais",
    s2: "2. Análise da causa raiz de recusas de pagamento",
    s3: "3. Manual prático passo a passo de resolução",
    s4: "4. Checklist essencial para evitar retenções de saldo",
    s5: "5. Perguntas Frecuentes (FAQ)"
  },
  nl: {
    s1: "1. Noodsituatie bij internationale betalingen",
    s2: "2. Grondige analyse van mislukte betalingstransacties",
    s3: "3. Stapsgewijze handleiding voor het direct oplossen",
    s4: "4. Checklist om rekeningblokkades te voorkomen",
    s5: "5. Veelgestelde Vragen (FAQ)"
  },
  pl: {
    s1: "1. Awaryjna sytuacja z płatnościami zagranicznymi",
    s2: "2. Analiza przyczyn odrzuceń płatności i błędów",
    s3: "3. Praktyczny przewodnik rozwiązywania problemów",
    s4: "4. Lista kontrolna zapobiegająca blokadom konta",
    s5: "5. Najczęściej zadawane pytania (FAQ)"
  },
  id: {
    s1: "1. Situasi Darurat Transaksi Pembayaran dan Transfer",
    s2: "2. Analisis Akar Masalah Penolakan Gateway Pembayaran",
    s3: "3. Panduan Langkah demi Langkah Penanganan Masalah",
    s4: "4. Lembar Periksa Mencegah Penahanan Dana Akun",
    s5: "5. Pertanyaan yang Sering Diajukan (FAQ)"
  },
  vi: {
    s1: "1. Sự cố khẩn cấp khi thanh toán và chuyển tiền",
    s2: "2. Phân tích nguyên nhân gốc rễ lỗi từ chối thanh toán",
    s3: "3. Quy trình thực tế từng bước xử lý lỗi cổng thanh toán",
    s4: "4. Danh sách kiểm tra ngăn ngừa đóng băng tài khoản",
    s5: "5. Các câu hỏi thường gặp (FAQ)"
  }
};

// 볼드 공백 및 조사 밀착 정돈 함수 (문자열 유실 방지)
function sanitizeBoldSpacing(text) {
  let s = text;

  // 헤딩 라인 안의 볼드 제거 (## **제목** -> ## 제목)
  s = s.replace(/^(#{1,6}[^\n*]*?)\*\*(.*?)\*\*/gm, '$1$2');

  // 빈 볼드 찌꺼기 제거
  s = s.replace(/\*\*\s*\*\*/g, '');

  // **단어 **조사 -> **단어** 조사 (공백을 볼드 밖으로 이동)
  s = s.replace(/\*\*\s*([^\n*]+?)\s+\*\*([가-힣a-zA-Z0-9])/g, '**$1** $2');

  // ** 단어 ** -> **단어**
  s = s.replace(/\*\*\s+([^\n*]+?)\s+\*\*/g, '**$1**');
  s = s.replace(/\*\*\s+([^\n*]+?)\*\*/g, '**$1**');
  s = s.replace(/\*\*([^\n*]+?)\s+\*\*/g, '**$1**');

  // 단어**볼드** -> 단어 **볼드** (단어 간격 띄어쓰기 확보)
  s = s.replace(/([가-힣a-zA-Z0-9])\*\*([가-힣a-zA-Z0-9_-]+)\*\*/g, '$1 **$2**');

  return s;
}

function healPostSafely(body, langCode) {
  const i18n = I18N_SECTIONS[langCode] || I18N_SECTIONS.ko;
  let lines = body.trim().split('\n');
  let output = [];
  let inFAQ = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 1. 소제목 라인 정규화
    if (/^#{1,6}\s*1[.\s]/.test(line)) {
      output.push(`## ${i18n.s1}\n`);
      continue;
    }
    if (/^#{1,6}\s*2[.\s]/.test(line)) {
      output.push(`\n## ${i18n.s2}\n`);
      continue;
    }
    if (/^#{1,6}\s*3[.\s]/.test(line)) {
      output.push(`\n## ${i18n.s3}\n`);
      continue;
    }
    if (/^#{1,6}\s*4[.\s]/.test(line)) {
      output.push(`\n## ${i18n.s4}\n`);
      continue;
    }
    if (/^#{1,6}\s*5[.\s]/.test(line)) {
      output.push(`\n## ${i18n.s5}\n`);
      inFAQ = true;
      continue;
    }

    // 중복으로 찍힌 H2 라인이면 건너뜀
    if (/^##\s*[1-5]\./.test(line)) {
      continue;
    }

    // 2. Q&A 라인 식별 및 개행 강제 보장
    if (inFAQ) {
      const qMatch = line.match(/^\s*(?:\*\*)?(?:Q|Question)\s*([1-3])\s*[:.]\s*(?:\*\*)?\s*(.*)/i);
      const aMatch = line.match(/^\s*(?:\*\*)?(?:A|Answer)\s*([1-3])\s*[:.]\s*(?:\*\*)?\s*(.*)/i);

      if (qMatch) {
        output.push(`\n**Q${qMatch[1]}.** ${qMatch[2].trim()}`);
        continue;
      }
      if (aMatch) {
        output.push(`\n**A${aMatch[1]}.** ${aMatch[2].trim()}\n`);
        continue;
      }
    }

    output.push(line);
  }

  let result = output.join('\n');

  // 3. 볼드 및 공백 안전 치유 적용
  result = sanitizeBoldSpacing(result);

  // 4. 연속 3개 이상의 빈 줄 압축
  result = result.replace(/\n{3,}/g, '\n\n').trim();

  return result;
}

async function run() {
  console.log("==================================================");
  console.log("⚡ [2-1호기] 텍스트 보존형 서식/Q&A 정밀 복구 시작");
  console.log("==================================================");

  if (!fs.existsSync(POSTS_BASE_DIR)) {
    console.error(`❌ 경로 없음: ${POSTS_BASE_DIR}`);
    process.exit(1);
  }

  const langDirs = fs.readdirSync(POSTS_BASE_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  let updatedCount = 0;

  for (const lang of langDirs) {
    const langPath = path.join(POSTS_BASE_DIR, lang);
    const files = fs.readdirSync(langPath).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(langPath, file);
      const original = fs.readFileSync(filePath, 'utf-8');

      const fmMatch = original.match(/^---[\s\S]*?---\n*/);
      if (!fmMatch) continue;

      let frontmatter = fmMatch[0].trim();
      let body = original.slice(fmMatch[0].length).trim();

      frontmatter = frontmatter.replace(/category:\s*["'][^"']*["']/i, "category: 'troubleshooting'")
                               .replace(/category:\s*[^\n\r]+/i, "category: 'troubleshooting'");

      const healedBody = healPostSafely(body, lang);
      const result = `${frontmatter}\n\n${healedBody}\n`;

      if (result !== original) {
        fs.writeFileSync(filePath, result, 'utf-8');
        console.log(`✨ [복구 완료] ${lang}/${file}`);
        updatedCount++;
      }
    }
  }

  console.log(`\n🎉 총 ${updatedCount}개 파일 복구 완료 (텍스트 유실 방지 및 볼드/Q&A 정돈)`);
}

run();
