import assert from 'node:assert/strict';
import test from 'node:test';

import { PROMPT_RECIPE_VERSION, createTopicFileSlug, reconcilePromptCheckpoint } from '../src/utils/generation-recipe.js';

function makeJob(promptRecipeVersion) {
  return {
    promptRecipeVersion,
    topic: 'Card payment troubleshooting',
    slug: 'post-stable-slug',
    queuedAt: '2026-10-30T10:40:00.000Z',
    imageSets: { en: { coverUrl: '/images/cover.jpg' } },
    scenario: 'A payment is declined at checkout.',
    validatedPosts: { en: 'previous validated article' },
    failedCodes: ['ko'],
    errorsByCode: { ko: ['previous validation error'] },
    status: 'ready',
    readyAt: '2026-10-30T11:00:00.000Z',
  };
}

test('same prompt recipe resumes validated locales without changing job identity', () => {
  const job = makeJob(PROMPT_RECIPE_VERSION);

  const changed = reconcilePromptCheckpoint(job);

  assert.equal(changed, false);
  assert.equal(job.validatedPosts.en, 'previous validated article');
  assert.deepEqual(job.failedCodes, ['ko']);
  assert.equal(job.slug, 'post-stable-slug');
  assert.equal(job.queuedAt, '2026-10-30T10:40:00.000Z');
});

test('new prompt recipe invalidates old drafts but preserves stable topic assets and slug', () => {
  const job = makeJob('old-prompt-recipe');

  const changed = reconcilePromptCheckpoint(job);

  assert.equal(changed, true);
  assert.equal(job.promptRecipeVersion, PROMPT_RECIPE_VERSION);
  assert.deepEqual(job.validatedPosts, {});
  assert.deepEqual(job.failedCodes, []);
  assert.deepEqual(job.errorsByCode, {});
  assert.equal(job.status, 'generating');
  assert.equal('readyAt' in job, false);
  assert.equal(job.slug, 'post-stable-slug');
  assert.equal(job.queuedAt, '2026-10-30T10:40:00.000Z');
  assert.deepEqual(job.imageSets, { en: { coverUrl: '/images/cover.jpg' } });
  assert.equal(job.scenario, 'A payment is declined at checkout.');
});

test('topic slugs are deterministic, normalized, and different for different topics', () => {
  const topic = 'Card payment troubleshooting';
  const slug = createTopicFileSlug(topic);

  assert.equal(slug, createTopicFileSlug(topic));
  assert.equal(slug, createTopicFileSlug(`  ${topic}  `));
  assert.match(slug, /^post-[a-f0-9]{16}$/);
  assert.notEqual(slug, createTopicFileSlug('Invoice payment troubleshooting'));
});
