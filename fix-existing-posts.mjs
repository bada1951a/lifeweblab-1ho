import fs from 'fs';
import path from 'path';

const POSTS_BASE_DIR = path.resolve('src/data/post');

function splitFAQGiantHeading(content) {
  let text = content;

  // 1. ## 5. ... 뒤에 붙어있는 거대 FAQ 텍스트를 줄바꿈으로 분리
  text = text.replace(/(#{1,6}\s*5[.\s][^\n]*?)(?=(?:\*\*Q|Q[1-3]|해외|문서|Stripe))/i, '$1\n\n');

  // 2. 5번 헤딩 제목 자체를 깔끔하게 단일화
  text = text.replace(/#{1,6}\s*5[.\s][^\n]*?(?:자주\s*묻는\s*질문|FAQ)[^\n]*/i, '## 5. 자주 묻는 질문 (FAQ)\n\n');

  // 3. 한 줄로 엉킨 Q1, Q2, Q3, A1, A2, A3 태그 앞뒤에 강제 엔터 2회 삽입
  // 질문(Q)
  text = text.replace(/(?:\s|\*\*|\.|\?)*\b(?:Q|Question)\s*([1-3])\s*[:.]\s*(?:\*\*)?/gi, '\n\n**Q$1.** ');
  text = text.replace(/\*\*Q([1-3])\.\s*(?:\*\*)?/gi, '\n\n**Q$1.** ');

  // 답변(A)
  text = text.replace(/(?:\s|\*\*|\.|\?)*\b(?:A|Answer)\s*([1-3])\s*[:.]\s*(?:\*\*)?/gi, '\n\n**A$1.** ');
  text = text.replace(/\*\*A([1-3])\.\s*(?:\*\*)?/gi, '\n\n**A$1.** ');

  // 4. 이중 볼드 기호 정돈
  text = text.replace(/\*\*\s*\*\*/g, '');

  // 5. 연속 빈 줄 압축
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

async function run() {
  if (!fs.existsSync(POSTS_BASE_DIR)) process.exit(1);

  const langDirs = fs.readdirSync(POSTS_BASE_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  let count = 0;

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

      const healedBody = splitFAQGiantHeading(body);
      const result = `${frontmatter}${healedBody}\n`;

      if (result !== original) {
        fs.writeFileSync(filePath, result, 'utf-8');
        count++;
      }
    }
  }

  console.log(`[완료] 총 ${count}개 파일의 FAQ 거대 헤딩 줄바꿈 분리 완료`);
}

run();
