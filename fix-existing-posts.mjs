import fs from 'fs';
import path from 'path';

const POSTS_BASE_DIR = path.resolve('src/data/post');

function formatFAQBlock(content) {
  // 5. 자주 묻는 질문 헤딩 분리
  let s = content.replace(/(#{1,6}\s*5[.\s][^\n]*)/i, '\n\n$1\n\n');

  // 중첩된 Q1. **Q3.** 같은 꼬임에서 앞선 잘못된 접두사 정돈
  s = s.replace(/Q1\.\s*\*\*Q/gi, '**Q');
  s = s.replace(/A1\.\s*\*\*A/gi, '**A');

  // 질문 및 답변 태그 앞에서 무조건 줄바꿈 2회 강제 적용
  s = s.replace(/\s*(?:\*\*)?Q([1-3])\.?(?:\*\*)?\s*/gi, '\n\n**Q$1.** ');
  s = s.replace(/\s*(?:\*\*)?A([1-3])\.?(?:\*\*)?\s*/gi, '\n\n**A$1.** ');

  // 이중 볼드 기호 정돈
  s = s.replace(/\*\*\s*\*\*/g, '');

  // 볼드 뒤 단어 띄어쓰기 확보
  s = s.replace(/(\*\*[^*]+?\*\*)\s*([가-힣a-zA-Z0-9])/g, '$1 $2');
  s = s.replace(/([가-힣a-zA-Z0-9])\s*(\*\*[^*]+?\*\*)/g, '$1 $2');

  // 연속된 빈 줄을 최대 2개로 압축
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

async function run() {
  if (!fs.existsSync(POSTS_BASE_DIR)) {
    console.error(`경로 없음: ${POSTS_BASE_DIR}`);
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

      const formattedBody = formatFAQBlock(body);
      const result = `${frontmatter}\n\n${formattedBody}\n`;

      if (result !== original) {
        fs.writeFileSync(filePath, result, 'utf-8');
        updatedCount++;
      }
    }
  }

  console.log(`총 ${updatedCount}개 파일 개행 및 문단 분리 완료`);
}

run();
