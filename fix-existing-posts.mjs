// =========================================================================
// 📌 [2-1호기 전용] 텍스트 보존 + 단독 별표(**) 찌꺼기 박멸 + FAQ 중복 제거 스크립트
// =========================================================================

import fs from 'fs';
import path from 'path';

const POSTS_BASE_DIR = path.resolve('src/data/post');

function cleanMarkdownLine(line) {
  let s = line.trim();

  // 1. 단독으로 덩그러니 남은 ** 별표 라인 완전 박멸
  if (s === '**' || s === '****' || s === '***') {
    return '';
  }

  // 2. 헤딩 라인(#) 내부의 볼드 기호 제거 및 중복 (FAQ) 제거
  if (/^#{1,6}\s/.test(s)) {
    s = s.replace(/\*\*/g, '');
    s = s.replace(/\(FAQ\)\s*\(FAQ\)/gi, '(FAQ)');
  }

  // 3. 소제목 중첩(### ### -> ###) 정돈
  s = s.replace(/^#{3,6}\s*#{3,6}\s*/g, '### ');

  // 4. 볼드 안쪽 공백 및 특수문자 정리 (** 단어 ** -> **단어**)
  s = s.replace(/\*\*\s*([^\n*]+?)\s+\*\*([가-힣a-zA-Z0-9])/g, '**$1** $2');
  s = s.replace(/\*\*\s*([^\n*]+?)\s*\*\*/g, '**$1**');

  // 5. 단독 찌꺼기 빈 볼드 제거
  s = s.replace(/\*\*\s*\*\*/g, '');

  return s;
}

function healPost(body) {
  const lines = body.split(/\r?\n/);
  const cleanLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // 빈 줄 통과
    if (!line) {
      cleanLines.push('');
      continue;
    }

    // 단독 ** 라인은 아예 버림
    if (line === '**' || line === '****' || line === '***') {
      continue;
    }

    // 소제목 5번(FAQ) 뒤에 본문이 붙은 경우 2줄로 강제 분리
    const faqMerged = line.match(/^(#{1,6}\s*5[.\s][^\n*]*?)\s*(\*\*?[QA][1-3][:.]|\b[QA][1-3][:.]|###\s*Q.*)/i);
    if (faqMerged) {
      let h5 = faqMerged[1].replace(/\(FAQ\)\s*\(FAQ\)/gi, '(FAQ)').replace(/\*\*/g, '').trim();
      cleanLines.push(h5);
      cleanLines.push('');
      cleanLines.push(cleanMarkdownLine(faqMerged[2]));
      continue;
    }

    // Q1., A1. 질문/답변 라인 정규화 (앞뒤 줄바꿈 확보 및 단독 ** 박멸)
    const qMatch = line.match(/^(?:#{3,4}\s*)?(?:\*\*)?(?:Q|Question)\s*([1-3])\s*[:.]\s*(?:\*\*)?\s*(.*)/i);
    const aMatch = line.match(/^(?:#{3,4}\s*)?(?:\*\*)?(?:A|Answer)\s*([1-3])\s*[:.]\s*(?:\*\*)?\s*(.*)/i);

    if (qMatch) {
      let qText = qMatch[2].replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
      cleanLines.push('');
      cleanLines.push(`**Q${qMatch[1]}.** ${qText}`);
      cleanLines.push('');
      continue;
    }

    if (aMatch) {
      let aText = aMatch[2].replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
      cleanLines.push('');
      cleanLines.push(`**A${aMatch[1]}.** ${aText}`);
      cleanLines.push('');
      continue;
    }

    const processed = cleanMarkdownLine(line);
    if (processed) {
      cleanLines.push(processed);
    }
  }

  // 중복 연속 H2 헤딩 제거
  const finalLines = [];
  let lastH2 = '';

  for (let i = 0; i < cleanLines.length; i++) {
    const cur = cleanLines[i];
    const match = cur.match(/^##\s*([1-5])\./);

    if (match) {
      if (match[1] === lastH2) continue;
      lastH2 = match[1];
      finalLines.push('');
      finalLines.push(cur);
      finalLines.push('');
    } else {
      if (/^##\s*/.test(cur)) {
        lastH2 = '';
      }
      finalLines.push(cur);
    }
  }

  return finalLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function run() {
  console.log("==================================================");
  console.log("⚡ [2-1호기] 단독 ** 찌꺼기 박멸 및 FAQ 정밀 수술 시작");
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

      const healedBody = healPost(body);
      const result = `${frontmatter}\n\n${healedBody}\n`;

      if (result !== original) {
        fs.writeFileSync(filePath, result, 'utf-8');
        console.log(`✨ [정밀 정돈 완료] ${lang}/${file}`);
        updatedCount++;
      }
    }
  }

  console.log(`\n🎉 총 ${updatedCount}개 파일에서 단독 ** 기호 및 FAQ 서식이 완벽 교정되었습니다.`);
}

run();
