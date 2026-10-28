// =========================================================================
// 📌 [애드센스 승인 최우선] 12개국 전체 포스트 ** 기호 100% 완전 박멸 스크립트
// =========================================================================

import fs from 'fs';
import path from 'path';

const POSTS_BASE_DIR = path.resolve('src/data/post');

function stripAllBolds(content) {
  // 1. 모든 ** 기호 문자 그대로 100% 삭제
  let text = content.replaceAll('**', '');

  // 2. 혹시 남아있을 수 있는 단독 줄의 불필요한 별표 라인 제거
  text = text.replace(/^\s*\*{1,4}\s*$/gm, '');

  // 3. Q1. A1. 등 머리말 앞뒤 불필요한 공백 정돈
  text = text.replace(/\b([QA][1-3])\s*\.\s*/g, '$1. ');

  // 4. 3개 이상 연속된 빈 줄을 최대 2개로 압축
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

async function run() {
  console.log("==================================================");
  console.log("⚡ [전수 조치] 12개국 전체 포스트 ** 기호 완전 박멸 시작");
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

      // Frontmatter 영역 분리 (제목, 슬러그 등 메타데이터 보존)
      const fmMatch = original.match(/^---[\s\S]*?---\n*/);
      if (!fmMatch) continue;

      const frontmatter = fmMatch[0];
      const body = original.slice(fmMatch[0].length);

      // 본문에서 모든 ** 삭제 적용
      const cleanedBody = stripAllBolds(body);
      const result = `${frontmatter}${cleanedBody}\n`;

      if (result !== original) {
        fs.writeFileSync(filePath, result, 'utf-8');
        console.log(`🧹 [** 삭제 완료] ${lang}/${file}`);
        updatedCount++;
      }
    }
  }

  console.log(`\n🎉 완료: 12개국 총 ${updatedCount}개 파일에서 모든 ** 기호가 깨끗하게 제거되었습니다.`);
}

run();
