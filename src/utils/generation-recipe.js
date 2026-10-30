import { createHash } from 'node:crypto';

export function createTopicFileSlug(topic) {
  if (typeof topic !== 'string' || !topic.trim()) {
    throw new TypeError('Topic must be a non-empty string.');
  }
  const normalizedTopic = topic.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  const digest = createHash('sha256').update(normalizedTopic, 'utf8').digest('hex');
  return `post-${digest.slice(0, 16)}`;
}

// Bump this value whenever prompt wording, structure, or generation rules change.
export const PROMPT_RECIPE_VERSION = '2026-10-30-topic-specific-headings-v2';

export function reconcilePromptCheckpoint(job, currentVersion = PROMPT_RECIPE_VERSION) {
  if (!job || typeof job !== 'object') {
    throw new TypeError('Prompt checkpoint must be an object.');
  }

  if (job.promptRecipeVersion === currentVersion) return false;

  // Keep stable job identity and assets, but discard drafts made under old instructions.
  job.promptRecipeVersion = currentVersion;
  job.validatedPosts = {};
  job.failedCodes = [];
  job.errorsByCode = {};
  job.status = 'generating';
  delete job.readyAt;
  return true;
}

export function decidePublishLocales(targetLanguages, successfulLocaleCodes, minimum = 10) {
  if (!Array.isArray(targetLanguages) || targetLanguages.length === 0) {
    throw new TypeError('targetLanguages must be a non-empty array.');
  }
  if (!Array.isArray(successfulLocaleCodes) && !(successfulLocaleCodes instanceof Set)) {
    throw new TypeError('successfulLocaleCodes must be an array or Set.');
  }

  const localeCode = (locale) => (typeof locale === 'string' ? locale : locale?.code);
  const targetCodes = targetLanguages.map(localeCode);
  if (targetCodes.some((code) => typeof code !== 'string' || !code.trim())) {
    throw new TypeError('Every target locale must have a non-empty code.');
  }
  if (new Set(targetCodes).size !== targetCodes.length) {
    throw new TypeError('Target locale codes must be unique.');
  }
  if (!Number.isInteger(minimum) || minimum < 1 || minimum > targetCodes.length) {
    throw new RangeError('minimum must be an integer within the target locale count.');
  }

  const successfulCodes = new Set(successfulLocaleCodes);
  const targetCodeSet = new Set(targetCodes);
  const unknownCodes = [...successfulCodes].filter((code) => !targetCodeSet.has(code));
  if (unknownCodes.length > 0) {
    throw new RangeError('Unknown successful locale codes: ' + unknownCodes.join(', '));
  }

  const passingLocales = targetLanguages.filter((locale) => successfulCodes.has(localeCode(locale)));
  const passingCodes = passingLocales.map(localeCode);
  const failedCodes = targetCodes.filter((code) => !successfulCodes.has(code));
  return {
    total: targetCodes.length,
    minimum,
    passingLocales,
    passingCodes,
    failedCodes,
    canPublish: passingCodes.length >= minimum,
  };
}

export function buildWordCountCorrectionGuidance(validationErrors) {
  if (!Array.isArray(validationErrors)) {
    throw new TypeError('validationErrors must be an array.');
  }

  const underMinimum = validationErrors.includes('본문 900단어 미만');
  const overMaximum = validationErrors.includes('본문 1,100단어 초과');
  if (!underMinimum && !overMaximum) return '';

  const direction = underMinimum
    ? 'Expand only relevant topic-specific explanations, safe steps, or examples; do not add filler.'
    : 'Trim repetition and incidental detail while preserving useful steps and safety information.';

  return [
    '[WORD COUNT CORRECTION]',
    `The previous ${underMinimum ? 'draft was below 900' : 'draft exceeded 1,100'} words according to the locale-aware validator.`,
    'Keep the same 900–1,100-word acceptance range and aim for approximately 950–1,050 words, near the middle of the range, to leave a margin for locale-specific word segmentation.',
    direction,
    'Preserve the article’s factual meaning and locale-specific phrasing; do not estimate by sentence count alone.',
  ].join('\n');
}

