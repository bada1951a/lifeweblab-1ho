// =========================================================================
// 📌 [2-1호기 전용] 볼드 떡짐 박멸 + FAQ 제목 복구 확정 스크립트
// =========================================================================

import fs from 'fs';
import path from 'path';

const POSTS_BASE_DIR = path.resolve('src/data/post');

// 따옴표, 괄호가 포함된 볼드 기호의 안팎 공백 완벽 교정
function fixBoldAndSpacing(text) {
  let s = text;

  // 1. 헤딩(#) 안의 볼드 제거
  s = s.replace(/^(#{1,6}[^\n*]*?)\*\*(.*?)\*\*/gm, '$1$2');

  // 2. 단독 줄로 남은 ** 기호 찌꺼기 제거
  s = s.replace(/^\s*\*{2,4}\s*$/gm, '');

  // 3. [핵심] 볼드 앞뒤 단어/따옴표 떡짐 강제 분리
  // 예: 찍힌**“Net -> 찍힌 **“Net
  s = s.replace(/([가-힣a-zA-Z0-9])\*\*([“"'\(\[a-zA-Z0-9가-힣])/g, '$1 **$2');
  // 예: UTC”**형식으로 -> UTC”** 형식으로
  s = s.replace(/([”"'\]\)a-zA-Z0-9가-힣])\*\*([가-힣a-zA-Z0-9])/g, '$1** $2');

  // 4. 볼드 안쪽 닫는 별표 앞 공백 제거 (**단어 ** -> **단어**)
  s = s.replace(/\*\*\s*([^\n*]+?)\s+\*\*/g, '**$1**');
  s = s.replace(/\*\*\s+([^\n*]+?)\*\*/g, '**$1**');

  // 5. Method 1: ... **1. 처럼 번호 붙은 것 줄바꿈 분리
  s = s.replace(/(\*\*[^*]+?\*\*)\s*([1-9]\.)/g, '$1\n\n$2');

  return s;
}

function healPost(body, lang) {
  let text = body.trim();

  // 1. 볼드 떡짐 및 공백 교정
  text = fixBoldAndSpacing(text);

  // 2. 5. 자주 묻는 질문 중복 (FAQ) (FAQ) 정돈
  text = text.replace(/(##\s*5[.\s][^\n]*?)\(FAQ\)\s*\(FAQ\)/gi, '$1(FAQ)');

  // 3. 2번째 글에서 날아간 Q1 질문 복원 및 정규화
  // 만약 Q1 뒤에 질문 내용이 없이 점만 있거나 바로 A1으로 넘어가는 경우
  text = text.replace(/(##\s*5[.\s][^\n]*?\n+)\s*(?:\*\*)?Q1[.:]?\s*(?:\*\*)?\s*(?=\n+\s*(?:\*\*)?A1)/i, 
    `$1**Q1.** Stripe에서 인보이스 결제가 계속 거절될 때 가장 먼저 점검해야 할 사항은 무엇인가요?\n\n`);

  // 4. Q&A 질문/답변 라인 정밀 정돈 (Q1, Q2, Q3 앞뒤 빈 줄 2개 보장)
  // 질문(Q)
  text = text.replace(/(?:^|\n)\s*(?:###\s*)?(?:\*\*)?(?:Q|Question)\s*([1-3])\s*[:.)]?\s*(?:\*\*)?\s*([^\n]+)/gi, 
    '\n\n**Q$1.** $2\n\n');
  
  // 답변(A)
  text = text.replace(/(?:^|\n)\s*(?:###\s*)?(?:\*\*)?(?:A|Answer)\s*([1-3])\s*[:.)]?\s*(?:\*\*)?\s*([^\n]+)/gi, 
    '\n\n**A$1.** $2\n\n');

  // 5. 이중 볼드 찌꺼기 정돈 (** **Q1.** ** -> **Q1.**)
  text = text.replace(/\*\*\s*\*\*(Q[1-3]\.|A[1-3]\.)\*\*\s*\*\*/gi, '**$1**');
  text = text.replace(/\*\*(Q[1-3]\.|A[1-3]\.)\*\*/gi, '**$1**');

  // 6. 소제목(## 1. ~ ## 5.) 앞뒤 빈 줄 2개 확보
  text = text.replace(/([^\n])\n(##\s*[1-5]\.)/g, '$1\n\n$2');
  text = text.replace(/(##\s*[1-5]\.[^\n]*)\n([^\n])/g, '$1\n\n$2');

  // 7. 3개 이상 연속된 빈 줄을 2개로 압축
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}

async function run() {
  console.log("==================================================");
  console.log("⚡ [2-1호기] 볼드 떡짐 박멸 & FAQ 온전한 복구 시작");
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

      const frontmatter = fmMatch[0].trim();
      const body = original.slice(fmMatch[0].length).trim();

      const healedBody = healPost(body, lang);
      const result = `${frontmatter}\n\n${healedBody}\n`;

      if (result !== original) {
        fs.writeFileSync(filePath, result, 'utf-8');
        console.log(`✨ [복구 완료] ${lang}/${file}`);
        updatedCount++;
      }
    }
  }

  console.log(`\n🎉 총 ${updatedCount}개 파일 교정 완료!`);
}

run();
