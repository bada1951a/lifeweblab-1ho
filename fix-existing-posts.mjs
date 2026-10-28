import fs from 'fs';
import path from 'path';

const POSTS_BASE_DIR = path.resolve('src/data/post');

function removeAdjacentDuplicateQuestions(content) {
  const lines = content.split(/\r?\n/);
  const result = [];
  let prevQClean = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Q1., Q2., Q3. 로 시작하는 라인 감지
    const qMatch = trimmed.match(/^Q[1-3]\.\s*(.*)/i);
    if (qMatch) {
      // 물음표와 공백을 모두 뺀 순수 질문 텍스트 추출
      const cleanText = qMatch[1].replace(/[\s\?]+/g, '');

      // 바로 윗 줄 질문과 순수 텍스트가 100% 동일하면 이 줄은 건너뜀 (제거)
      if (cleanText === prevQClean) {
        continue;
      }

      prevQClean = cleanText;
      result.push(line);
      continue;
    }

    // A 라인이나 다른 본문이 나오면 비교 기준 리셋
    if (/^A[1-3]\./i.test(trimmed)) {
      prevQClean = '';
    }

    result.push(line);
  }

  return result.join('\n');
}

async function run() {
  if (!fs.existsSync(POSTS_BASE_DIR)) process.exit(1);

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

      const frontmatter = fmMatch[0];
      const body = original.slice(fmMatch[0].length);

      const healedBody = removeAdjacentDuplicateQuestions(body);
      const result = `${frontmatter}${healedBody}`;

      if (result !== original) {
        fs.writeFileSync(filePath, result, 'utf-8');
        updatedCount++;
      }
    }
  }

  console.log(`[완료] 총 ${updatedCount}개 파일에서 중복 Q 줄 제거 완료`);
}

run();
