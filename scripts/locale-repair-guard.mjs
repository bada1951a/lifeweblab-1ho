export const LOCALE_REPAIR = Object.freeze({
  topic: "Fixing a Stripe Webhook 500 Internal Server Error",
  slug: "post-b4b719fb09ff3fb4",
  publishDate: "2026-10-31T10:40:00.000Z",
  repairLocales: Object.freeze(["ja", "vi"]),
  existingLocales: Object.freeze([
    "ko",
    "en",
    "de",
    "fr",
    "es",
    "it",
    "pt",
    "nl",
    "pl",
    "id",
  ]),
});

function parseFrontmatter(content) {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error("게시물 frontmatter를 읽을 수 없습니다.");
  const value = (name) => {
    const field = match[1]
      .split(/\r?\n/)
      .find((line) => line.startsWith(name + ":"));
    return field
      ? field
          .slice(name.length + 1)
          .trim()
          .replace(/^["']|["']$/g, "")
      : "";
  };
  return { value, body: content.slice(match[0].length) };
}

export function assertLocaleRepairArtifact(queue) {
  if (!Array.isArray(queue) || queue.length !== 1) {
    throw new Error("복구 아티팩트에는 예상된 작업 1개만 있어야 합니다.");
  }
  const [job] = queue;
  if (job?.topic !== LOCALE_REPAIR.topic || job?.slug !== LOCALE_REPAIR.slug) {
    throw new Error("복구 아티팩트의 주제 또는 slug가 대상과 다릅니다.");
  }
  if (!job.imageSets || !job.validatedPosts) {
    throw new Error("복구 아티팩트에 이미지 세트 또는 검증 원고가 없습니다.");
  }
  for (const code of LOCALE_REPAIR.repairLocales) {
    const images = job.imageSets[code];
    if (
      !images ||
      typeof images.coverUrl !== "string" ||
      !images.coverUrl ||
      typeof images.bodyUrl !== "string" ||
      !images.bodyUrl
    ) {
      throw new Error(
        "복구 아티팩트의 " + code + " 원본 이미지 매핑이 없습니다.",
      );
    }
    if (
      typeof job.validatedPosts[code] === "string" &&
      job.validatedPosts[code].trim()
    ) {
      throw new Error(
        "복구 아티팩트에 이미 " +
          code +
          " 검증 원고가 있어 재생성하지 않습니다.",
      );
    }
  }
  return job;
}

export function assertLocaleRepairExistingPosts(posts) {
  if (!posts || typeof posts !== "object")
    throw new TypeError("기존 게시물 목록이 필요합니다.");
  const codes = Object.keys(posts).sort();
  const expected = [...LOCALE_REPAIR.existingLocales].sort();
  if (
    codes.length !== expected.length ||
    codes.some((code, index) => code !== expected[index])
  ) {
    throw new Error(
      "기존 게시 locale이 정확히 10개가 아닙니다. 복구를 중단합니다.",
    );
  }
  for (const code of expected) {
    const { value } = parseFrontmatter(posts[code]);
    if (value("publishDate") !== LOCALE_REPAIR.publishDate) {
      throw new Error(
        "기존 " + code + " 게시물의 publishDate가 원본 세트와 다릅니다.",
      );
    }
  }
  return true;
}

export function assertLocaleRepairDraft(code, content, imageSet) {
  if (!LOCALE_REPAIR.repairLocales.includes(code)) {
    throw new Error("허용되지 않은 복구 locale: " + code);
  }
  const { value, body } = parseFrontmatter(content);
  if (value("publishDate") !== LOCALE_REPAIR.publishDate) {
    throw new Error(code + " 원고 publishDate가 기존 세트 시간과 다릅니다.");
  }
  if (
    value("image") !== imageSet.coverUrl ||
    !body.includes("![Troubleshooting Guide](" + imageSet.bodyUrl + ")")
  ) {
    throw new Error(
      code + " 원고가 체크포인트의 기존 이미지 매핑을 보존하지 않았습니다.",
    );
  }
  return true;
}

