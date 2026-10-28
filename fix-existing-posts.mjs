import fs from 'fs';
import path from 'path';

const POSTS_BASE_DIR = path.resolve('src/data/post');

function removeBrokenStars(text) {
  // 1. 혼자 덩그러니 남은 줄 삭제
  let s = text.replace(/^\s*\*{2,4}\s*$/gm, '');

  // 2. 단어와 붙지 못하고 붕 떠 있는 별표 찌꺼기 제거 (** 앞뒤 공백인 경우)
  s = s.replace(/\s+\*\*\s+/g, ' ');

  // 3. Q&A 머리말 정규화 (예: ** Q1. ** -> **Q1.**)
  s = s.replace(/\*\*\s*([QA][1-3]\.?)\s*\*\*/gi, '**$1**');

  // 4. 문장 중간에 짝 없이 남아 텍스트로 노출되는 불량 ** 강제 삭제
  // (정상적인 **단어** 형태가 아닌, 특수문자나 괄호 옆에 엉성하게 붙은 찌꺼기 정리)
  s = s.replace(/([가-힣a-zA-Z0-9])\*\*([^\s*]+)\*\*/g, '$1 **$2**');
  s = s.replace(/\*\*([가-힣a-zA-Z0-9]+)\*\*([가-힣a-zA-Z0-9])/g, '**$1** $2');

  return s;
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

      const cleanedBody = removeBrokenStars(body);
      const result = `${frontmatter}${cleanedBody}`;

      if (result !== original) {
        fs.writeFileSync(filePath, result, 'utf-8');
        count++;
      }
    }
  }

  console.log(`[완료] 총 ${count}개 파일의 별표(**) 찌꺼기 정돈 완료`);
}

run();
