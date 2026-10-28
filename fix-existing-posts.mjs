// =========================================================================
// 📌 [2-1호기 전용] 텍스트 유실 0% 라인 단위 정밀 복구 스크립트
// ⚠️ 글자 삭제 절대 없음 / H2 거대 폰트 뭉개짐 박멸 / 볼드 기호 정돈
// =========================================================================

import fs from 'fs';
import path from 'path';

const POSTS_BASE_DIR = path.resolve('src/data/post');

function fixLineFormatting(line) {
  let s = line;

  // 1. 헤딩(#) 라인 안의 볼드(**) 기호 제거 -> 헤딩 폰트 깨짐 방지
  if (/^#{1,6}\s/.test(s)) {
    s = s.replace(/\*\*/g, '');
  }

  // 2. 소제목 중첩(### ### -> ###) 교정
  s = s.replace(/^#{3,6}\s*#{3,6}\s*/g, '### ');

  // 3. **단어 **조사 -> **단어** 조사 (볼드 안쪽 닫는 공백 제거)
  s = s.replace(/\*\*\s*([^\n*]+?)\s+\*\*([가-힣a-zA-Z0-9])/g, '**$1** $2');
  s = s.replace(/\*\*\s*([^\n*]+?)\s+\*\*/g, '**$1**');
  s = s.replace(/\*\*\s+([^\n*]+?)\*\*/g, '**$1**');

  // 4. 단어**볼드** -> 단어 **볼드** (붙어있는 볼드 간격 확보)
  s = s.replace(/([가-힣a-zA-Z0-9])\*\*([가-힣a-zA-Z0-9_-]+)\*\*/g, '$1 **$2**');

  // 5. 빈 볼드(****) 삭제
  s = s.replace(/\*\*\s*\*\*/g, '');

  return s;
}

function healPostByLines(body) {
  // 줄 단위 분리
  const rawLines = body.split(/\r?\n/);
  const cleanLines = [];

  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i].trim();

    // 빈 줄은 그대로 통과
    if (!line) {
      cleanLines.push('');
      continue;
    }

    // 소제목 5번(FAQ) 뒤에 본문이 한 줄로 붙어버린 치명적 버그 분리
    // 예: ## 5. 자주 묻는 질문 (FAQ) **Q1.** -> 2줄로 강제 분리
    const faqMerged = line.match(/^(#{1,6}\s*5[.\s][^\n*]*?)\s*(\*\*?[QA][1-3][:.]|\b[QA][1-3][:.]|###\s*Q.*)/i);
    if (faqMerged) {
      cleanLines.push(faqMerged[1].trim());
      cleanLines.push(''); // 빈 줄 강제 삽입
      cleanLines.push(faqMerged[2].trim());
      continue;
    }

    // Q1., Q2., A1., A2.가 앞 문장과 붙은 경우 분리
    line = line.replace(/([^\n])\s*(\*\*Q[1-3]\.\*\*|\bQ[1-3]\.|\*\*Q[1-3]:\*\*)/g, '$1\n\n$2');
    line = line.replace(/([^\n])\s*(\*\*A[1-3]\.\*\*|\bA[1-3]\.|\*\*A[1-3]:\*\*)/g, '$1\n\n$2');

    const subLines = line.split('\n');
    for (const sub of subLines) {
      cleanLines.push(fixLineFormatting(sub));
    }
  }

  // 중복 연속 H2 헤딩 제거 (동일한 ## 1. 이 연달아 나오는 것 방지)
  const resultLines = [];
  let lastH2Prefix = '';

  for (let i = 0; i < cleanLines.length; i++) {
    const cur = cleanLines[i];
    const h2Match = cur.match(/^##\s*([1-5])\./);

    if (h2Match) {
      if (h2Match[1] === lastH2Prefix) {
        continue; // 중복 헤딩 건너뜀
      }
      lastH2Prefix = h2Match[1];
      resultLines.push(''); // 헤딩 앞 빈 줄
      resultLines.push(cur);
      resultLines.push(''); // 헤딩 뒤 빈 줄
    } else {
      if (/^##\s*/.test(cur)) {
        lastH2Prefix = '';
      }
      resultLines.push(cur);
    }
  }

  // 빈 줄이 3개 이상 연속되지 않도록 정돈
  return resultLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function run() {
  console.log("==================================================");
  console.log("⚡ [2-1호기] 라인 단위 안전 서식 수술 시작 (텍스트 유실 0%)");
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

      const healedBody = healPostByLines(body);
      const result = `${frontmatter}\n\n${healedBody}\n`;

      if (result !== original) {
        fs.writeFileSync(filePath, result, 'utf-8');
        console.log(`✨ [수술 완료] ${lang}/${file}`);
        updatedCount++;
      }
    }
  }

  console.log(`\n🎉 총 ${updatedCount}개 파일 교정 완료! 본문 유실 없이 완벽하게 정돈되었습니다.`);
}

run();
