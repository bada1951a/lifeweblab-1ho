import fs from 'fs';
import path from 'path';

const POSTS_BASE_DIR = path.resolve('src/data/post');

// 정규식 치환 대신 정직하게 라인 단위로 읽어서 H2 헤딩 찌꺼기 강제 리셋
function hardFixHeadings(body) {
  const lines = body.split(/\r?\n/);
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // 5번 FAQ 헤딩 라인에 뒤엉킨 모든 찌꺼기 리셋
    if (/^##\s*5[.\s]/.test(line)) {
      result.push('');
      result.push('## 5. 자주 묻는 질문 (FAQ)');
      result.push('');
      
      // 혹시 헤딩 줄 뒤에 질문(Q1) 텍스트가 붙어있었다면 다음 줄에 본문으로 살려냄
      const qTextMatch = line.match(/(?:문서\s*증빙|해외\s*바이어|Stripe|Q1)[^]*/i);
      if (qTextMatch && !qTextMatch[0].startsWith('자주')) {
        let cleanQ = qTextMatch[0].replace(/^[\*\s\.:]+/, '').trim();
        result.push(`**Q1.** ${cleanQ}`);
        result.push('');
      }
      continue;
    }

    // 3번 실전 조치 매뉴얼 중복 리셋
    if (/^##\s*3[.\s]/.test(line)) {
      result.push('');
      result.push('## 3. 1분 만에 해결하는 단계별 실전 조치 매뉴얼');
      result.push('');
      continue;
    }

    // 4번 실무 체크리스트 중복 리셋
    if (/^##\s*4[.\s]/.test(line)) {
      result.push('');
      result.push('## 4. 지급 동결 및 과다 수수료 방지를 위한 실무 체크리스트');
      result.push('');
      continue;
    }

    // 일반 라인 안의 찌꺼기 ** 공백 정돈
    line = line.replace(/\*\*\s*([QA][1-3]\.?)\s*\*\*/gi, '**$1**');
    result.push(line);
  }

  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
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

      const healedBody = hardFixHeadings(body);
      const result = `${frontmatter}\n\n${healedBody}\n`;

      if (result !== original) {
        fs.writeFileSync(filePath, result, 'utf-8');
        count++;
      }
    }
  }

  console.log(`[완료] 총 ${count}개 파일의 중복 헤딩 강제 리셋 완료!`);
}

run();
