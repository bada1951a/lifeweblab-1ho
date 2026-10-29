# 2-1호기 기존 글 수정 및 검증 — 2026-10-29 KST

## 범위와 승인 경계

기준 main `61c4f990cca1427415422dda3c74f7437ff2b522`의 기존 글 60개(12개 언어 × 5개)를 콘텐츠 전용 브랜치에서 수정했다. 신규 글 생성·API 호출·결제 테스트·수동 발행 워크플로 실행은 하지 않았다. Luna PR #1 및 그 브랜치는 변경하지 않았다. 사용자 정의: 발행 1세트는 1개 주제의 12개 언어, 5개 블로그 각 1세트는 60개 글이다. 이번 배포는 기존 글 수정이며 신규 세트 발행이 아니다.

## 변경

- 60개 파일에서 짝이 확인된 강조를 strong 요소로 렌더링하고 강조 주변 단어 간 공백·목록 번호 간격을 정리했다. code/pre의 예제 문자는 오류 판정에서 제외했다.
- 독일어·일본어의 질문/답 문단 경계를 분리했다. 이탈리아어 FAQ 제목도 확인했다.
- Git 이력 `6ce54f10` 및 최신 글 추가 커밋 `9b0fe34e18c955a08067799adafd1098d6726b50`을 대조해 11개 외국어 글의 누락 질문/답변을 복원했다. 전체 과거 본문으로 되돌리지 않고 FAQ에 한정했다. 스페인어 글의 동일 답변 중복도 제거했다.
- 모든 글의 FAQ를 실제 Markdown 렌더에서 질문 3개·답변 3개로 확인했다. 단순 strong 개수로 질문 수를 추정하지 않았다.
- 한국어 5개 글의 확인된 내용 오류를 교정했다. 존재하지 않는 Stripe 코드, 카드 거절과 환산 차액·은행 송금의 혼동, allowlist의 자동 재시도 오인, 보안 일괄 완화, 무조건 인보이스 무효화, 잘못된 3DS API 설명, 무근거 70%/3배 수치, 고정 48시간 분쟁기한, PayPal 즉시 해제 보장, 송금 쪼개기 권고 등을 제거·정정했다.
- 영어 5개 글의 확인된 결제·정산 안내를 교정했다. 내부 웹훅 누락만으로 수수료 손실을 장부에서 없애라는 지시, 임의 실카드 테스트, 보안 기준 롤백의 무위험 보장, 카드 신규 발급을 통한 차단 회피, 3DS의 무조건적 책임 이전, 고정 보류·준비금 비율·시간 보장 등을 정정했다.
- 프랑스어 세무 글은 모든 해외 지급에 원천징수 30%가 자동 적용된다는 오류와 양식·법인 구분 단정을 정정했다. 스페인어 FAQ의 반올림만으로 거절·사기 여부를 확정하는 표현도 교정했다.
- 개인 경력·고객 경험의 근거가 없는 서사에는 해당 언어로 가상 점검 예시임을 명시했다. 경험·즉시 해결을 주장하던 일부 제목/설명도 변경했다. 따라서 모든 메타데이터 불변이라고 보고하지 않는다.

## 보존

발행일·파일 경로·slug·카테고리·태그·theme·대표 이미지 frontmatter 행은 기준 main과 동일하다. 제목·description만 오류 교정 예외다. 본문 이미지 URL과 순서도 모두 동일하다. 한국어 `post-mvs0twdr.md`는 대표 이미지 billing-13.jpg와 본문 billing-27.jpg를 각각 보존했다. 인수인계서의 두 이미지 참조를 혼동하지 않았다.

`public/images/billing-photo` 57개는 Git blob SHA-1을 파일 바이트에서 다시 계산해 모두 일치했다. 생성 코드·워크플로·설정·컴포넌트·레이아웃·이미지 파일 변경은 없다. 본문의 잘못된 설명을 재구성한 글이 있으므로 본문 전체 바이트 불변은 아니다.

## 검증 결과

- `npm ci --ignore-scripts --legacy-peer-deps` 성공, Node 24.22.0.
- 최종 `npm run build` 성공: 158페이지, 약 20.47초.
- Astro Markdown으로 60개 본문 렌더 성공. code/pre 제외 별표 노출 0, 빈 제목 0, 한글·가나 혼입 표시 0, 중첩 strong 0, 홀수 코드펜스 0.
- 최종 dist의 기존 60개 글 경로 모두 존재. strong 632개 유지. 로컬 이미지 참조 누락 0.
- 렌더 FAQ: 60개 글 모두 질문 3개·답변 3개. 자동 개수 검사는 답변의 모든 사실을 보증하지 않는다.
- 현재 60개 글에 미래 발행일은 없다. 코드가 향후 미래 글을 모든 경로에서 비공개로 보장하는지는 별도 미완료 과제다.
- `npm run check`는 기존 코드 TypeScript 오류 2개로 실패했다. 새 콘텐츠 변경이 해당 코드에 영향을 주지 않았으며, 일반 CI 전체 통과로 보고하지 않는다.

## 사실 확인 자료

- https://docs.stripe.com/declines
- https://docs.stripe.com/declines/codes
- https://docs.stripe.com/radar/transaction-reviews
- https://docs.stripe.com/billing/revenue-recovery/smart-retries
- https://docs.stripe.com/invoicing/invoice-edits
- https://docs.stripe.com/payments/3d-secure/authentication-flow
- https://docs.stripe.com/disputes/responding
- https://www.paypal.com/us/cshelp/article/how-can-i-release-my-payments-on-hold-help129
- https://www.irs.gov/individuals/international-taxpayers/source-of-income-personal-service-income
- https://www.irs.gov/publications/p515

## 제한과 후속 과제

이번 서식·누락 FAQ 복원과 확인된 내용 오류 수정의 완료를 12개 언어 전체 원어민 감수·모든 금융/세무 주장 검증 완료로 확대하지 않는다. 특히 기타 언어의 국가별 서비스 자격, 세무 안내, 과장된 원인 단정·성과 수치·해제 보장 표현은 추가 의미 검수가 필요하다. 가상 예시 표시는 잘못된 일반 조언 자체를 정당화하지 않는다.

일반 CI 부채, 예약 시각·미래 글 제한·부분 발행 정책·유료 복구·전체 링크/이미지 권리 검증은 별도 과제다. 신규 발행과 자동 예약 재개는 계속 중지한다. 콘텐츠 배포 성공은 해당 병합 SHA의 Cloudflare 체크와 운영 화면을 별도로 확인해야 확정한다.
