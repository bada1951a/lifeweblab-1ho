import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { buildNarrativeVoiceInstructions } from '../src/utils/narrative-prompt.js';
import {
  PROMPT_RECIPE_VERSION,
  assertNoExistingPostLocales,
  createTopicFileSlug,
  decidePublishLocales,
  reconcilePromptCheckpoint,
} from '../src/utils/generation-recipe.js';

test('narrative prompt guides first-person storytelling without invented authority', () => {
  const instructions = buildNarrativeVoiceInstructions('Korean');
  const source = readFileSync(new URL('../generate-all.mjs', import.meta.url), 'utf8');

  assert.match(instructions, /practical, approachable guide narrator for Korean readers/);
  assert.match(instructions, /natural first-person reasoning and recommendations/);
  assert.match(instructions, /30% engaging first-person reasoning and transitions and 70% practical/);
  assert.match(instructions, /Never fabricate personal or customer experiences/);
  assert.match(
    instructions,
    /not a claim about real identity, profession, employment, credentials, or firsthand experience/
  );
  assert.ok(source.includes('buildNarrativeVoiceInstructions(lang.name)'));
  assert.ok(
    source.includes(
      "Write this locale's article as an independent original composition; do not translate or imitate another locale's draft."
    )
  );
  assert.doesNotMatch(source, /from the assigned expert persona's perspective/);
});

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
  assert.equal(slug, createTopicFileSlug(topic.replace(/\s+/gu, '   ')));
  assert.match(slug, /^post-[a-f0-9]{16}$/);
  assert.notEqual(slug, createTopicFileSlug('Invoice payment troubleshooting'));
});

test('materialization refuses to overwrite already published topic files', () => {
  assert.doesNotThrow(() => assertNoExistingPostLocales(['ko', 'en'], 'post-new-topic', () => false));
  assert.throws(
    () => assertNoExistingPostLocales(['ko', 'en'], 'post-existing-topic', (locale) => locale === 'ko'),
    /Post files already exist for post-existing-topic in locales: ko/
  );
});

const publicationTargets = ['ko', 'en', 'ja', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'id', 'vi'].map((code) => ({
  code,
}));

test('publication gate allows exactly passing locales at 9/12, 10/12, and 12/12', () => {
  const nine = decidePublishLocales(
    publicationTargets,
    publicationTargets.slice(0, 9).map(({ code }) => code)
  );
  assert.equal(nine.canPublish, false);
  assert.deepEqual(
    nine.passingCodes,
    publicationTargets.slice(0, 9).map(({ code }) => code)
  );
  assert.deepEqual(
    nine.failedCodes,
    publicationTargets.slice(9).map(({ code }) => code)
  );

  const ten = decidePublishLocales(
    publicationTargets,
    publicationTargets.slice(0, 10).map(({ code }) => code)
  );
  assert.equal(ten.canPublish, true);
  assert.deepEqual(ten.passingLocales, publicationTargets.slice(0, 10));
  assert.deepEqual(
    ten.failedCodes,
    publicationTargets.slice(10).map(({ code }) => code)
  );

  const twelve = decidePublishLocales(
    publicationTargets,
    publicationTargets.map(({ code }) => code)
  );
  assert.equal(twelve.canPublish, true);
  assert.deepEqual(twelve.passingLocales, publicationTargets);
  assert.deepEqual(twelve.failedCodes, []);
});

test('generator uses the tested publication plan in generation and materialization gates', () => {
  const source = readFileSync(new URL('../generate-all.mjs', import.meta.url), 'utf8');
  assert.equal((source.match(/decidePublishLocales\(/g) || []).length, 2);
  assert.equal((source.match(/if \(!publication\.canPublish\)/g) || []).length, 2);
  assert.match(source, /const validLangs = publication\.passingLocales;/);
});
