import fs from 'fs';
import path from 'path';

const POSTS_BASE_DIR = path.resolve('src/data/post');

function cleanFaqGarbage(content) {
  let lines = content.split(/\r?\n/);
  let newLines = [];
  let seenQuestions = new Set();

  for (let line of lines) {
    let trimmed = line.trim();

    // 1. "Q1. 질문 (FAQ) FAQ" 같은 무의미한 찌꺼기 라인 즉시 제외
    if (/^Q\d*\.\s*질문/i.test(trimmed)) {
      continue;
    }

    // 2. 문장 끝에 붙어버린 (FAQ) 태그 제거 (예: 어떻게 해야 하나요? (FAQ) -> 어떻게 해야 하나요?)
    if (/^Q[1-3]\./i.test(trimmed)) {
      trimmed = trimmed.replace(/\s*\(FAQ\)[\s(FAQ)]*$/gi, '');
      
      // 3. 바로 앞에 나온 질문과 내용이 중복되면 제외 (Q1 3연타 방지)
      const qTextOnly = trimmed.replace(/^Q[1-3]\.\s*/, '').trim();
      if (seenQuestions.has(qTextOnly)) {
        continue;
      }
      seenQuestions.add(qTextOnly);
      newLines.push(trimmed);
      continue;
    }

    newLines.push(line);
  }

  return newLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
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

      const cleanedBody = cleanFaqGarbage(body);
      const result = `${frontmatter}${cleanedBody}\n`;

      if (result !== original) {
        fs.writeFileSync(filePath, result, 'utf-8');
        updatedCount++;
      }
    }
  }

  console.log(`[완료] 총 ${updatedCount}개 파일의 중복 질문 및 찌꺼기 줄 정리 완료`);
}

run();
