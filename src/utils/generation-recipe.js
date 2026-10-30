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
export const PROMPT_RECIPE_VERSION = '2026-10-30-first-person-topic-story-v2';

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
