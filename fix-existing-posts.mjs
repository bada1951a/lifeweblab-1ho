import fs from 'fs';
import path from 'path';

const POSTS_BASE_DIR = path.resolve('src/data/post');

function extractOriginalFAQ(body) {
  // 5번 섹션 분리
  const faqIdx = body.search(/##\s*5[.\s]/);
  if (faqIdx === -1) return body;

  const mainBody = body.slice(0, faqIdx).trim();
  const faqSection = body.slice(faqIdx);

  // 파일 내에 원래 작성되어 있던 고유 텍스트 라인들 수집
  const lines = faqSection.split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let qas = [];
  let currentQ = '';
  let currentA = '';

  for (let line of lines) {
    // 5번 헤더 줄, 단순 찌꺼기 제외
    if (/^##\s*5/i.test(line)) continue;
    if (/^Q\d*\.\s*질문/i.test(line)) continue;

    // 질문 라인 매칭 (Q1, Q2, Q3 또는 Question)
    const qMatch = line.match(/^(?:\*\*)?(?:Q\d*|Question\s*\d*)[.:\s]*(.*)/i);
    if (qMatch && !line.startsWith('A')) {
      if (currentQ && currentA) {
        qas.push({ q: currentQ, a: currentA });
        currentA = '';
      }
      let qText = qMatch[1].replace(/\*\*/g, '').replace(/\s*\(FAQ\)[\s(FAQ)]*$/gi, '').trim();
      // 중복 질문 텍스트가 아니면 채택
      if (qText.length > 5) {
        currentQ = qText;
      }
      continue;
    }

    // 답변 라인 매칭 (A1, A2, A3 또는 Answer)
    const aMatch = line.match(/^(?:\*\*)?(?:A\d*|Answer\s*\d*)[.:\s]*(.*)/i);
    if (aMatch) {
      let aText = aMatch[1].replace(/\*\*/g, '').trim();
      currentA = aText;
      continue;
    }

    // 태그 없이 이어진 본문 답변 텍스트 보존
    if (currentA) {
      currentA += ' ' + line.replace(/\*\*/g, '').trim();
    } else if (currentQ) {
      currentA = line.replace(/\*\*/g, '').trim();
    }
  }

  // 마지막 항목 푸시
  if (currentQ && currentA) {
    qas.push({ q: currentQ, a: currentA });
  }

  // 중복 질문 제거 및 고유 질문들만 최대 3개 선별
  const uniqueQAs = [];
  const seenQ = new Set();
  for (let item of qas) {
    const key = item.q.replace(/[\s\?]+/g, '');
    if (!seenQ.has(key) && key.length > 5) {
      seenQ.add(key);
      uniqueQAs.push(item);
    }
  }

  // 1호기 맞춤 순서(1 -> 2 -> 3)로 정갈하게 재조립
  let freshFaqText = '## 5. 자주 묻는 질문 (FAQ)\n\n';
  uniqueQAs.slice(0, 3).forEach((item, idx) => {
    freshFaqText += `Q${idx + 1}. ${item.q}\n\n`;
    freshFaqText += `A${idx + 1}. ${item.a}\n\n`;
  });

  return `${mainBody}\n\n${freshFaqText}`.trim();
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

      const healedBody = extractOriginalFAQ(body);
      const result = `${frontmatter}${healedBody}\n`;

      if (result !== original) {
        fs.writeFileSync(filePath, result, 'utf-8');
        updatedCount++;
      }
    }
  }

  console.log(`[완료] 총 ${updatedCount}개 파일의 고유 맞춤 Q&A 재배열 완료`);
}

run();
