import fs from 'fs';
import path from 'path';

const POSTS_BASE_DIR = path.resolve('src/data/post');

function cleanBrokenHeadings(content) {
  let lines = content.split(/\r?\n/);
  let newLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 1. 5번 FAQ 헤딩 줄 정리 (언어 무관, ## 5 또는 ### 5 등)
    if (/^#{1,6}\s*5[.\s]/.test(line)) {
      // 헤딩 줄에 붙은 중복 (FAQ) 및 Q1 찌꺼기 분리
      // 예: ## 5. 자주 묻는 질문 (FAQ) (FAQ) Q1.질문...
      let qPart = '';
      const qIndex = line.search(/(?:Q1|질문|Question|문서|Stripe|해외)/i);
      
      // 만약 헤딩 줄 안에 질문 본문이 엉켜 들어갔다면 추출
      if (qIndex !== -1 && !line.slice(qIndex).startsWith('자주')) {
        qPart = line.slice(qIndex).replace(/^[\*\s\.:]+/, '').trim();
      }

      // 깔끔한 5번 헤딩 라인만 생성 (중복 FAQ 제거)
      let cleanTitle = line.replace(/^#{1,6}\s*5[.\s]*/, '')
                           .replace(/\(FAQ\)[\s(FAQ)]*/gi, '')
                           .trim();
      if (!cleanTitle) cleanTitle = '자주 묻는 질문';

      newLines.push('');
      newLines.push(`## 5. ${cleanTitle} (FAQ)`);
      newLines.push('');

      if (qPart) {
        newLines.push(`**Q1.** ${qPart}`);
        newLines.push('');
      }
      continue;
    }

    // 2. 3번, 4번 헤딩 중복 단어 제거
    // 예: ## 3. ... 매뉴얼조치 매뉴얼 -> 중복 단어 패턴 압축
    if (/^#{1,6}\s*[34][.\s]/.test(line)) {
      // 헤딩 레벨을 ## 으로 통일
      let prefixMatch = line.match(/^#{1,6}\s*([34][.\s])/);
      let num = prefixMatch ? prefixMatch[1] : '3. ';
      let restText = line.replace(/^#{1,6}\s*[34][.\s]*/, '').trim();

      // 동일 단어가 연달아 붙은 중복 텍스트 제거 (예: 매뉴얼조치 매뉴얼 -> 조치 매뉴얼)
      restText = restText.replace(/([가-힣a-zA-Z\s]{3,})\1+/g, '$1');
      restText = restText.replace(/체크리스트\s*실무\s*체크리스트/g, '실무 체크리스트');
      restText = restText.replace(/조치\s*매뉴얼조치\s*매뉴얼/g, '실전 조치 매뉴얼');

      newLines.push('');
      newLines.push(`## ${num} ${restText}`.replace(/\s+/g, ' '));
      newLines.push('');
      continue;
    }

    newLines.push(line);
  }

  let result = newLines.join('\n');
  return result.replace(/\n{3,}/g, '\n\n').trim();
}

async function run() {
  console.log("==================================================");
  console.log("⚡ [12개국 전수조사] 깨진 헤딩 찌꺼기 완전 자동 박멸 시작");
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

      const healedBody = cleanBrokenHeadings(body);
      const result = `${frontmatter}\n\n${healedBody}\n`;

      if (result !== original) {
        fs.writeFileSync(filePath, result, 'utf-8');
        console.log(`✨ [12개국 정돈 완료] ${lang}/${file}`);
        updatedCount++;
      }
    }
  }

  console.log(`\n🎉 완료: 총 ${updatedCount}개 파일의 깨진 헤딩이 12개국 전체에서 정상 복구되었습니다.`);
}

run();
