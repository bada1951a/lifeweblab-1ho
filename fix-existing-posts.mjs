import fs from 'fs';
import path from 'path';

const POSTS_BASE_DIR = path.resolve('src/data/post');

function cleanFaqText(text) {
  return text
    .replace(/\*\*/g, '')
    .replace(/\s*\(FAQ\)[\s(FAQ).]*$/gi, '')
    .trim();
}

function fixPostContent(rawContent) {
  // 1. Frontmatter 분리 및 완벽 보존
  const fmMatch = rawContent.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/);
  if (!fmMatch) return rawContent;

  const frontmatter = fmMatch[0].trim();
  let body = rawContent.slice(fmMatch[0].length);

  // 보이지 않는 특수 공백 문자(Zero-width space) 제거 (3번 섹션 들여쓰기 깨짐 방지)
  body = body.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // 2. 5번 FAQ 섹션 시작 위치 찾기
  const faqHeaderRegex = /^##\s*5\.\s*([^\r\n]+)/m;
  const faqMatch = body.match(faqHeaderRegex);

  // 5번 섹션이 없으면 원본 그대로 반환 (안전장치)
  if (!faqMatch) return rawContent;

  const faqStartIndex = faqMatch.index;
  const faqHeaderLine = `## 5. ${faqMatch[1].replace(/\*\*/g, '').trim()}`;

  // 1~4번 본문은 원본 그대로 보존
  const mainBody = body.slice(0, faqStartIndex).trim();
  const faqRawSection = body.slice(faqStartIndex + faqMatch[0].length).trim();

  // 3. 번호별 바구니(Bucket) 초기화
  const buckets = {
    1: { q: '', a: '' },
    2: { q: '', a: '' },
    3: { q: '', a: '' }
  };

  const lines = faqRawSection
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let currentType = null; // 'q' or 'a'
  let currentNum = null;  // 1, 2, or 3

  for (const line of lines) {
    // Q1., Q2., Q3. 감지 (앞에 ** 이나 공백이 있어도 인식)
    const qMatch = line.match(/^(?:\*\*)?Q([1-3])[.:\s]+([\s\S]*)/i);
    if (qMatch) {
      const num = parseInt(qMatch[1], 10);
      const text = cleanFaqText(qMatch[2]);
      currentType = 'q';
      currentNum = num;

      if (text) {
        // 기존에 저장된 질문이 없거나, 새 질문에 물음표(?)가 포함되어 더 온전한 경우 업데이트
        if (!buckets[num].q || (text.includes('?') && !buckets[num].q.includes('?'))) {
          buckets[num].q = text;
        }
      }
      continue;
    }

    // A1., A2., A3. 감지
    const aMatch = line.match(/^(?:\*\*)?A([1-3])[.:\s]+([\s\S]*)/i);
    if (aMatch) {
      const num = parseInt(aMatch[1], 10);
      const text = cleanFaqText(aMatch[2]);
      currentType = 'a';
      currentNum = num;

      if (text) {
        // 기존에 저장된 답변이 없거나, 새 텍스트가 더 길고 온전한 경우에만 저장 (중복 A2, A3 자동 무시)
        if (!buckets[num].a || text.length > buckets[num].a.length) {
          buckets[num].a = text;
        }
      }
      continue;
    }

    // 만약 줄바꿈되어 이어지는 답변 문장이 있다면 현재 항목에 이어붙임 (단, 중복 문장이 아닐 때만)
    if (currentType && currentNum && buckets[currentNum][currentType]) {
      const extraText = cleanFaqText(line);
      if (extraText && !buckets[currentNum][currentType].includes(extraText)) {
        buckets[currentNum][currentType] += ' ' + extraText;
      }
    }
  }

  // 4. [안전장치] Q1~Q3, A1~A3 총 6개 항목이 모두 정상적으로 채워졌는지 검증
  const isComplete = [1, 2, 3].every(
    num => buckets[num].q.length > 2 && buckets[num].a.length > 2
  );

  // 하나라도 비어있다면 구조를 임의로 건드리지 않고 원본 그대로 반환 (데이터 파괴 0%)
  if (!isComplete) {
    return rawContent;
  }

  // 5. Q1 -> A1 -> Q2 -> A2 -> Q3 -> A3 정방향 순서로 재조립
  const formattedFaq = [
    faqHeaderLine,
    `Q1. ${buckets[1].q}`,
    `A1. ${buckets[1].a}`,
    `Q2. ${buckets[2].q}`,
    `A2. ${buckets[2].a}`,
    `Q3. ${buckets[3].q}`,
    `A3. ${buckets[3].a}`
  ].join('\n\n');

  return `${frontmatter}\n\n${mainBody}\n\n${formattedFaq}\n`;
}

async function run() {
  console.log('==================================================');
  console.log('🛡️ [안전 모드] 번호별 버킷 기반 FAQ 정밀 복원 시작');
  console.log('==================================================');

  if (!fs.existsSync(POSTS_BASE_DIR)) {
    console.error(`경로를 찾을 수 없습니다: ${POSTS_BASE_DIR}`);
    process.exit(1);
  }

  const langDirs = fs.readdirSync(POSTS_BASE_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  let updatedCount = 0;
  let skippedCount = 0;

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
        skippedCount++;
      }
    }
  }

  console.log(`✅ 복원 완료: ${updatedCount}개 파일 수정됨 (변경 불필요/보호된 파일: ${skippedCount}개)`);
}

run();
