import fs from 'fs';
import path from 'path';

const POSTS_BASE_DIR = path.resolve('src/data/post');

function cleanText(text) {
  return text
    .replace(/\*\*/g, '')
    // 기존의 Q1, A2, Q3 등 모든 번호표와 찌꺼기 기호 제거
    .replace(/^(?:[QA][1-9][.:\s\-_]+)+/i, '')
    // 문장 앞의 Q:, A: 형태도 일단 제거 후 아래에서 통일
    .replace(/^(?:Q|A):\s*/i, '')
    .replace(/\s*\(FAQ\)[\s(FAQ).]*$/gi, '')
    .trim();
}

function fixPostContent(rawContent) {
  const fmMatch = rawContent.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/);
  if (!fmMatch) return rawContent;

  const frontmatter = fmMatch[0].trim();
  let body = rawContent.slice(fmMatch[0].length);
  body = body.replace(/[\u200B-\u200D\uFEFF]/g, '');

  const faqHeaderRegex = /^##\s*5\.\s*([^\r\n]+)/m;
  const faqMatch = body.match(faqHeaderRegex);
  if (!faqMatch) return rawContent;

  const faqStartIndex = faqMatch.index;
  const faqHeaderLine = `## 5. ${faqMatch[1].replace(/\*\*/g, '').trim()}`;
  const mainBody = body.slice(0, faqStartIndex).trim();
  const faqRawSection = body.slice(faqStartIndex + faqMatch[0].length).trim();

  // 5번 섹션 안의 모든 텍스트 라인을 읽어서 Q와 A 항목들을 순서대로 수집
  const lines = faqRawSection.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  const extractedPairs = [];
  let currentQ = '';
  let currentA = '';

  for (const line of lines) {
    // Q로 시작하거나 물음표가 포함된 질문 라인 감지
    if (/^Q[1-9][.:]/i.test(line) || (!line.startsWith('A') && line.endsWith('?'))) {
      if (currentQ && currentA) {
        extractedPairs.push({ q: cleanText(currentQ), a: cleanText(currentA) });
        currentA = '';
      }
      currentQ = line;
    } else if (/^A[1-9][.:]/i.test(line) || currentQ) {
      if (/^A[1-9][.:]/i.test(line)) {
        if (currentQ && currentA) {
          extractedPairs.push({ q: cleanText(currentQ), a: cleanText(currentA) });
          currentQ = '';
          currentA = '';
        }
      }
      if (!currentQ) {
        // Q가 없는 상태로 A가 먼저 나오면 이전 페어의 A로 처리하거나 임시 저장
        currentA = currentA ? currentA + ' ' + line : line;
      } else {
        currentA = currentA ? currentA + ' ' + line : line;
      }
    }
  }
  if (currentQ && currentA) {
    extractedPairs.push({ q: cleanText(currentQ), a: cleanText(currentA) });
  }

  // 안전장치: 최소 2개 이상의 Q&A 쌍이 추출되지 않으면 원본 보호
  if (extractedPairs.length < 2) {
    return rawContent;
  }

  // 중복된 질문 제거 (Set 활용하여 순서 유지)
  const seenQ = new Set();
  const uniquePairs = [];
  for (const pair of extractedPairs) {
    const qKey = pair.q.toLowerCase().slice(0, 30);
    if (!seenQ.has(qKey) && pair.q.length > 5 && pair.a.length > 10) {
      seenQ.add(qKey);
      uniquePairs.push(pair);
    }
  }

  if (uniquePairs.length < 2) {
    return rawContent;
  }

  // 숫자를 아예 없애고 무조건 Q: 와 A: 형식으로만 조합
  const faqOutputLines = [faqHeaderLine];

  uniquePairs.forEach((pair) => {
    let qText = pair.q;
    let aText = pair.a;

    if (!qText.endsWith('?')) qText += '?';

    faqOutputLines.push(`Q: ${qText}`);
    faqOutputLines.push(`A: ${aText}`);
  });

  const formattedFaq = faqOutputLines.join('\n\n');
  return `${frontmatter}\n\n${mainBody}\n\n${formattedFaq}\n`;
}

async function run() {
  console.log('==================================================');
  console.log('🛡️ [Q / A 포맷 통일] 번호 제거 및 Q:, A: 변환 시작');
  console.log('==================================================');

  if (!fs.existsSync(POSTS_BASE_DIR)) process.exit(1);

  const langDirs = fs.readdirSync(POSTS_BASE_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  let updatedCount = 0;
  let intactCount = 0;

  for (const lang of langDirs) {
    const langPath = path.join(POSTS_BASE_DIR, lang);
    const files = fs.readdirSync(langPath).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(langPath, file);
      const original = fs.readFileSync(filePath, 'utf-8');
      const fixed = fixPostContent(original);

      if (fixed !== original) {
        fs.writeFileSync(filePath, fixed, 'utf-8');
        updatedCount++;
      } else {
        intactCount++;
      }
    }
  }

  console.log(`✅ 변환 완료: ${updatedCount}개 파일이 Q: / A: 형식으로 정리됨 (정상 파일: ${intactCount}개)`);
}

run();
