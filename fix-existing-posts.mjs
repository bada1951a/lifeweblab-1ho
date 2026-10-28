// =========================================================================
// 📌 [2-1호기 전용] 마크다운 볼드 오염 박멸 및 Q&A·헤딩 완벽 복구 스크립트
// ⚠️ 별표(**) 노출 박멸, 볼드 뒤 글자 떡짐 방지, Q1~Q3 2열 개행 보장
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

function healMarkdownPost(body, langCode) {
  const i18n = I18N_SECTIONS[langCode] || I18N_SECTIONS.ko;
  let text = body.trim();

  // 1. 헤딩 내부의 볼드 문법(**) 완전 박멸 (## **제목** -> ## 제목)
  text = text.replace(/^(#{1,6}\s*)\*\*(.*?)\*\*/gm, '$1$2');

  // 2. 소제목 중첩(### ### -> ###) 교정
  text = text.replace(/^#{3,6}\s*#{3,6}\s*/gm, '### ');

  // 3. Method 뒤에 숫자가 바로 붙는 리스트 강제 분리 (**Method 1: ... **1. -> **Method 1: ...**\n1.)
  text = text.replace(/(\*\*[^*]+?\*\*)\s*([1-9]\.)/g, '$1\n$2');

  // 4. [핵심] 볼드 안쪽 공백 및 조사 달라붙음/띄어쓰기 완전 교정
  // Case A: **단어 **조사 -> **단어** 조사 (예: **인보이스 **가 -> **인보이스**가, **급여일 **이자 -> **급여일**이자)
  text = text.replace(/\*\*([^\n*]+?)\s+\*\*([가-힣a-zA-Z0-9])/g, '**$1**$2');

  // Case B: ** 단어 ** -> **단어**
  text = text.replace(/\*\*\s+([^\n*]+?)\s+\*\*/g, '**$1**');
  text = text.replace(/\*\*\s+([^\n*]+?)\*\*/g, '**$1**');
  text = text.replace(/\*\*([^\n*]+?)\s+\*\*/g, '**$1**');

  // Case C: 단어**단어**단어 처럼 영문/숫자 뒤에 붙은 볼드 사이 공백 보정
  text = text.replace(/([a-zA-Z0-9가-힣])\*\*([a-zA-Z0-9_-]+)\*\*/g, '$1 **$2**');
  text = text.replace(/\*\*([a-zA-Z0-9_-]+)\*\*([a-zA-Z0-9])/g, '**$1** $2');

  // Case D: 혼자 덩그러니 남은 짝 없는 ** 또는 빈 찌꺼기(****) 삭제
  text = text.replace(/\*\*\s*\*\*/g, '');

  // 5. 소제목 1~5 정규화 (헤딩 뒤에 반드시 빈 줄 2개 보장)
  text = text.replace(/^#{1,6}\s*1[.\s]+[^\n]+/m, `## ${i18n.s1}\n\n`);
  text = text.replace(/^#{1,6}\s*2[.\s]+[^\n]+/m, `\n\n## ${i18n.s2}\n\n`);
  text = text.replace(/^#{1,6}\s*3[.\s]+[^\n]+/m, `\n\n## ${i18n.s3}\n\n`);
  text = text.replace(/^#{1,6}\s*4[.\s]+[^\n]+/m, `\n\n## ${i18n.s4}\n\n`);
  
  // 6. FAQ 헤딩 분리 (FAQ 뒤 본문이 붙어 H2로 인식되는 거대 폰트 참사 차단)
  text = text.replace(/^#{1,6}\s*5[.\s]+.*?(?=(?:\*\*?Q[1-3]|\bQ[1-3][:.]|\n|$))/is, `\n\n## ${i18n.s5}\n\n`);

  // 7. 연속 중복 H2 헤딩 제거
  const lines = text.split('\n');
  const filteredLines = [];
  let lastH2 = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^##\s*([1-5])\./);
    if (match) {
      if (match[1] === lastH2) continue;
      lastH2 = match[1];
    }
    filteredLines.push(line);
  }
  text = filteredLines.join('\n');

  // 8. Q&A 포맷 완전 정돈 (줄바꿈 강제 확보 및 온점 뒤 공백 보장)
  text = text.replace(/(?:^|[^\n])\s*(?:\*\*)?(?:Q|Question)\s*([1-3])\s*[:.]\s*(?:\*\*)?\s*/gi, '\n\n**Q$1.** ');
  text = text.replace(/(?:^|[^\n])\s*(?:\*\*)?(?:A|Answer)\s*([1-3])\s*[:.]\s*(?:\*\*)?\s*/gi, '\n\n**A$1.** ');

  // 이중 볼드 찌꺼기 정돈
  text = text.replace(/\*\*\s*\*\*(Q[1-3]\.|A[1-3]\.)\*\*\s*\*\*/gi, '**$1**');
  text = text.replace(/\*\*(Q[1-3]\.|A[1-3]\.)\*\*/gi, '**$1**');

  // 9. 리스트(1. 2. 3. 또는 - ) 앞에 줄바꿈 확보
  text = text.replace(/([^\n])\n([1-9]\.\s|\*\s|-\s)/g, '$1\n\n$2');

  // 10. 빈 줄 3줄 이상 연속된 것 2줄로 압축
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}

async function run() {
  console.log("==================================================");
  console.log("⚡ [2-1호기] 마크다운 볼드 오염 및 띄어쓰기 정밀 수술 시작");
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

      // 1차 치유 및 2차 교차 검증
      let healed = healMarkdownPost(body, lang);
      healed = healMarkdownPost(healed, lang);

      const result = `${frontmatter}\n\n${healed}\n`;

      if (result !== original) {
        fs.writeFileSync(filePath, result, 'utf-8');
        console.log(`✨ [볼드/줄바꿈 수술 완료] ${lang}/${file}`);
        updatedCount++;
      }
    }
  }

  console.log(`\n🎉 총 ${updatedCount}개 파일의 볼드 기호(**) 및 띄어쓰기 오류가 완벽히 치유되었습니다.`);
}

run();
