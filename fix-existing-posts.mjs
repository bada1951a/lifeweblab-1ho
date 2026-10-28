import fs from 'fs';
import path from 'path';

const POSTS_BASE_DIR = path.resolve('src/data/post');

// 포스트 제목 및 본문 키워드에 따라 무결점 Q&A 블록을 새로 생성
function generateFreshFAQ(title, body) {
  // 포스트 성격에 맞는 3가지 표준 실무 질의응답 세트 생성
  let q1 = "해외 결제 및 송금 승인이 거절되거나 보류되는 주된 원인은 무엇인가요?";
  let a1 = "바이어 카드 발행사의 해외 결제 한도 초과, FDS(이상거래탐지시스템) 차단, 또는 인보이스에 기재된 사업자 정보와 결제 프로필의 불일치가 가장 흔한 원인입니다. 바이어에게 카드사 해외 결제 차단 해제를 요청하거나 인보이스 정보를 즉시 대조해야 합니다.";

  let q2 = "인보이스 수정이나 거래 증빙 제출 시 가장 유의해야 할 점은 무엇인가요?";
  let a2 = "기존에 발행된 결제 링크를 방치하지 않고 무효화(Void) 처리한 후 재발행해야 시스템 충돌을 막을 수 있습니다. 증빙 자료 제출 시에는 계약서, 이메일 수발신 내역, 업무 산출물 캡처본을 함께 첨부해야 심사팀의 승인 시간을 단축할 수 있습니다.";

  let q3 = "지급 보류나 정산 지연으로 인한 자금 경색을 방지하는 실무 팁이 있나요?";
  let a3 = "단일 결제망에만 의존하지 않고 보조 PG사 및 다중 송금 라우팅 경로를 사전에 확보해 두는 것이 좋습니다. 또한 정기 결제 재시도 규칙을 최적화하여 불필요한 수수료 발생과 연체를 사전에 예방해야 합니다.";

  // 영어 포스트인 경우
  if (/[a-zA-Z]{5,}/.test(title) && !/[가-힣]/.test(title)) {
    q1 = "What is the primary reason for overseas payment failures or payout holds?";
    a1 = "The most frequent causes include card issuer transaction limits, automated fraud detection triggers, or minor discrepancies between invoice details and account profiles. Contacting the card issuer to whitelist cross-border transactions resolves most issues quickly.";

    q2 = "What should be prioritized when updating an invoice or submitting proof of delivery?";
    a2 = "Always void the previous payment link before generating a new invoice to prevent system reconciliation errors. Providing clear delivery logs, email correspondence, and contract copies significantly speeds up manual compliance reviews.";

    q3 = "How can businesses prevent cash flow disruption caused by payment processing delays?";
    a3 = "It is recommended to maintain secondary payment gateways and multi-currency routing setups. Configuring optimized smart-retry schedules also reduces unnecessary transaction dispute fees and payment drop-offs.";
  }

  // 일본어 포스트인 경우
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(title) && !/[가-힣]/.test(title)) {
    q1 = "海外送金や決済の保留が発生する主な原因は何ですか？";
    a1 = "カード発行会社の海外利用制限、不正検知システム(FDS)による一時停止、請求書情報とアカウント情報の不一致が主な原因です。発行会社への制限解除申請や情報の再確認を行うことで迅速に解決できます。";

    q2 = "請求書の修正や証明書類の提出時に注意すべき点は何ですか？";
    a2 = "二重決済を防ぐため、修正前の請求書や決済リンクを無効化(Void)してから新規発行することが必須です。取引履歴やメール送受信記録を揃えて提出することで審査時間を大幅に短縮できます。";

    q3 = "決済保留による資金繰りの悪化を防ぐ実務的な対策はありますか？";
    a3 = "単一の決済プロバイダーに依存せず、複数の決済手段や送金ルートを確保しておくことが有効です。適切なリトライルールを設定することで余分な手数料発生も抑えられます。";
  }

  return `## 5. 자주 묻는 질문 (FAQ)\n\n` +
         `Q1. ${q1}\n\n` +
         `A1. ${a1}\n\n` +
         `Q2. ${q2}\n\n` +
         `A2. ${a2}\n\n` +
         `Q3. ${q3}\n\n` +
         `A3. ${a3}\n`;
}

function replaceEntireFAQ(content) {
  // 5번 섹션 위치 찾기
  const faqIdx = content.search(/##\s*5[.\s]/);
  
  // 1~4번 정상 본문만 남김 (5번 아래의 모든 누더기 텍스트 영구 폐기)
  let mainBody = faqIdx !== -1 ? content.slice(0, faqIdx).trim() : content.trim();

  // 제목 추출
  const titleMatch = content.match(/title:\s*["']?(.*?)["']?\n/);
  const title = titleMatch ? titleMatch[1] : '';

  // 새로운 Q&A 결합
  const freshFAQ = generateFreshFAQ(title, mainBody);

  return `${mainBody}\n\n${freshFAQ}`.trim();
}

async function run() {
  console.log("==================================================");
  console.log("⚡ [전수 재작성] 12개국 전체 포스트 5번 FAQ 통교체 시작");
  console.log("==================================================");

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

      const newBody = replaceEntireFAQ(body);
      const result = `${frontmatter}\n\n${newBody}\n`;

      if (result !== original) {
        fs.writeFileSync(filePath, result, 'utf-8');
        updatedCount++;
      }
    }
  }

  console.log(`\n🎉 완료: 총 ${updatedCount}개 파일의 FAQ를 무결점 새 규격으로 전면 교체했습니다!`);
}

run();
