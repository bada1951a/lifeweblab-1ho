import fs from 'node:fs';
// 2-1호기: 단일 한국어 비공개 생성 시험. 게시물 및 topics.txt 변경 금지.
const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error('OPENAI_API_KEY 누락');
const prompt = [
  '한국어로 해외 B2B 결제 거절 원인과 해결 방법에 대한 실무 안내 글을 작성하세요.',
  '실제 확인하지 않은 규정, 고객 사례, 경험담은 만들지 마세요.',
  '본문 공백 제외 약 2400~2600자. ## 1. 부터 ## 5. 까지 번호 붙은 Markdown H2 제목 5개와 마지막 5번 섹션에 **Q1.** / **A1.** 형식의 FAQ 질문과 답변 3쌍을 포함하세요.',
  '해결 단계와 확인할 수 없는 내용의 한계를 명확히 작성하세요.',
].join('\n');
const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'gpt-6-luna', input: prompt, max_output_tokens: 5000 }),
});
const data = await response.json();
if (!response.ok) {
  console.error(
    'API HTTP',
    response.status,
    '오류 유형:',
    data.error?.type || 'unknown',
    '코드:',
    data.error?.code || 'unknown'
  );
  process.exitCode = 1;
} else {
  const text = (data.output || [])
    .flatMap((x) => x.content || [])
    .filter((x) => x.type === 'output_text')
    .map((x) => x.text || '')
    .join('\n');
  const chars = [...text.replace(/\s/g, '')].length;
  const h2 = (text.match(/^##\s+/gm) || []).length;
  const faqQ = (text.match(/(?:\*\*)?Q[1-3]\./g) || []).length;
  const faqA = (text.match(/(?:\*\*)?A[1-3]\./g) || []).length;
  console.log(
    JSON.stringify({
      status: data.status,
      finish_reason: data.incomplete_details?.reason || null,
      characters_excluding_whitespace: chars,
      h2_count: h2,
      faq_questions: faqQ,
      faq_answers: faqA,
      usage: data.usage || null,
      posted: false,
    })
  );
  if (!text || data.status === 'incomplete') process.exitCode = 1;
  else {
    fs.mkdirSync('tmp-quality-review', { recursive: true });
    fs.writeFileSync('tmp-quality-review/ko-sample.md', text, 'utf8');
  }
}
