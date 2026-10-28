// =========================================================================
// 📌 [2-1호기 전용] 과거 발행 글 전체 일괄 자동 정밀 검수 및 치유 스크립트
// ⚠️ 12개국 언어별 표준 소제목 완전 일치, Q&A 2열 분리, 중복 헤딩 박멸, 볼드 정돈
// =========================================================================

import fs from 'fs';
import path from 'path';

const POSTS_BASE_DIR = path.resolve('src/data/post');

// 12개국 표준 소제목 딕셔너리 (영구 불변 규격)
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
    s4: "4. アカウント凍結を防ぐ実무チェックリスト",
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
    s2: "2. Phân tích nguyên nhân gốc rễ lỗi từ chối thanh toán",
    s3: "3. Quy trình thực tế từng bước xử lý lỗi cổng thanh toán",
    s4: "4. Danh sách kiểm tra ngăn ngừa đóng băng tài khoản",
    s5: "5. Các câu hỏi thường gặp (FAQ)",
    tags: ["Thanh Toán Quốc Tế", "Hóa Đơn B2B", "Cổng Thanh Toán", "Xử Lý Sự Cố"]
  }
};

// 🩺 정밀 치유 엔진 (1회 치유 함수)
function singlePassHealing(body, langCode) {
  let healed = body.trim();
  const i18n = I18N_SECTIONS[langCode] || I18N_SECTIONS.ko;

  // 1) 헤딩 내부 볼드 제거
  healed = healed.replace(/^(#{1,6}\s+)\*\*(.*?)\*\*/gm, '$1$2');

  // 2) 1~5번 소제목 강제 표준 치환 (끝 단어 중복, 오타, 변칙 타이틀 전부 색출)
  healed = healed.replace(/^#{1,6}\s*1[.\s]+([^\n]+)/m, `## ${i18n.s1}`);
  healed = healed.replace(/^#{1,6}\s*2[.\s]+([^\n]+)/m, `## ${i18n.s2}`);
  healed = healed.replace(/^#{1,6}\s*3[.\s]+([^\n]+)/m, `## ${i18n.s3}`);
  healed = healed.replace(/^#{1,6}\s*4[.\s]+([^\n]+)/m, `## ${i18n.s4}`);
  healed = healed.replace(/^#{1,6}\s*5[.\s]+([^\n]+)/m, `## ${i18n.s5}`);

  // 3) 연속된 중복 헤딩 박멸 (1번 헤딩이 연달아 2개 나오는 현상 영구 삭제)
  const lines = healed.split('\n');
  const cleanLines = [];
  let lastH2Prefix = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^##\s*([1-5])\./);
    if (match) {
      const num = match[1];
      if (num === lastH2Prefix) {
        // 직전에 이미 나온 동일 번호의 H2 헤딩이면 스킵
        continue;
      }
      lastH2Prefix = num;
    }
    cleanLines.push(line);
  }
  healed = cleanLines.join('\n');

  // 4) 1번 헤딩 누락 시 주입
  if (!healed.startsWith('## 1.')) {
    healed = `## ${i18n.s1}\n\n` + healed;
  }

  // 5) Q&A 서식 무결점 분리 (Q1:, **Q1:**, Q1.What 전부 표준 **Q1.** 변환 및 빈 줄 2개 보장)
  healed = healed.replace(/(?:^|\n+)\s*(?:\*\*)?(?:Q|Question)\s*([1-3])\s*[:.]\s*(?:\*\*)?\s*/gi, '\n\n**Q$1.** ');
  healed = healed.replace(/(?:^|\n+)\s*(?:\*\*)?(?:A|Answer)\s*([1-3])\s*[:.]\s*(?:\*\*)?\s*/gi, '\n\n**A$1.** ');
  
  // 이중 볼드 정돈
  healed = healed.replace(/\*\*\s*\*\*(Q[1-3]\.|A[1-3]\.)\*\*\s*\*\*/gi, '**$1**');
  healed = healed.replace(/\*\*(Q[1-3]\.|A[1-3]\.)\*\*/gi, '**$1**');

  // 6) 볼드 안쪽 공백 압축 (** 단어 ** -> **단어**)
  healed = healed.replace(/\*\*\s+([^*]+?)\s+\*\*/g, '**$1**')
                 .replace(/\*\*\s+([^*]+?)\*\*/g, '**$1**')
                 .replace(/\*\*([^*]+?)\s+\*\*/g, '**$1**');

  // 7) 특수문자, LaTeX, 물결 기호 치환
  healed = healed.replace(/\\times/g, 'x')
                 .replace(/\\circ/g, '°')
                 .replace(/\\approx/g, '≈')
                 .replace(/\$([A-Za-z0-9_-]+)\$/g, '`$1`')
                 .replace(/(\S)\s*~\s*(\S)/g, '$1 - $2')
                 .replace(/~/g, '-');

  // 8) 연속 빈 줄 압축
  healed = healed.replace(/\n{3,}/g, '\n\n').trim();

  return healed;
}

// 🩺 2회 정밀 교차 검수 함수 (Double Check Engine)
function healTwice(body, langCode) {
  // 1차 치유
  let pass1 = singlePassHealing(body, langCode);
  // 2차 교차 검수 및 미세 오차 박멸
  let pass2 = singlePassHealing(pass1, langCode);
  return pass2;
}

// 🚀 실행 메인 루프
async function processAllPosts() {
  console.log("==================================================");
  console.log("⚡ [2-1호기] 과거 발행 글 12개국 전수 정밀 치유 시작");
  console.log("==================================================");

  if (!fs.existsSync(POSTS_BASE_DIR)) {
    console.error(`❌ 포스트 경로가 존재하지 않습니다: ${POSTS_BASE_DIR}`);
    process.exit(1);
  }

  const langDirs = fs.readdirSync(POSTS_BASE_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  let totalScanned = 0;
  let totalFixed = 0;

  for (const lang of langDirs) {
    const langPath = path.join(POSTS_BASE_DIR, lang);
    const files = fs.readdirSync(langPath).filter(file => file.endsWith('.md'));

    console.log(`\n📁 [언어: ${lang.toUpperCase()}] 검사 중... (${files.length}개 파일)`);

    for (const file of files) {
      totalScanned++;
      const filePath = path.join(langPath, file);
      const originalContent = fs.readFileSync(filePath, 'utf-8');

      const fmMatch = originalContent.match(/^---[\s\S]*?---\n*/);
      if (!fmMatch) {
        console.warn(`   ⚠️ [프론트매터 없음 - 건너뜀] ${file}`);
        continue;
      }

      let frontmatter = fmMatch[0].trim();
      let body = originalContent.slice(fmMatch[0].length).trim();

      // 프론트매터 카테고리 troubleshooting 영구 락 보정
      frontmatter = frontmatter.replace(/category:\s*["'][^"']*["']/i, "category: 'troubleshooting'")
                               .replace(/category:\s*[^\n\r]+/i, "category: 'troubleshooting'");

      // 🩺 글 2번 정밀 검수 및 자가 치유 실행
      const healedBody = healTwice(body, lang);
      const finalContent = `${frontmatter}\n\n${healedBody}\n`;

      if (finalContent !== originalContent) {
        fs.writeFileSync(filePath, finalContent, 'utf-8');
        console.log(`   ✨ [치유 완료 (2회 교차 검수 통과)] ${file}`);
        totalFixed++;
      } else {
        console.log(`   ✅ [정상 규격 확인] ${file}`);
      }
    }
  }

  console.log("\n==================================================");
  console.log(`🎉 전수 조사 및 치유 완료!`);
  console.log(`📊 총 검사 파일: ${totalScanned}개 | 수술 완료 파일: ${totalFixed}개`);
  console.log("==================================================");
}

processAllPosts();
