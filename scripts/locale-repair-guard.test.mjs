import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LOCALE_REPAIR,
  assertLocaleRepairArtifact,
  assertLocaleRepairDraft,
  assertLocaleRepairExistingPosts,
} from './locale-repair-guard.mjs';

const imageSet = {
  coverUrl: '/images/billing-photo/cover.jpg',
  bodyUrl: '/images/billing-photo/body.jpg',
};

test('accepts only the expected encrypted-checkpoint job and exact JA/VI image mappings', () => {
  const job = {
    topic: LOCALE_REPAIR.topic,
    slug: LOCALE_REPAIR.slug,
    imageSets: { ja: imageSet, vi: imageSet },
    validatedPosts: {},
  };
  assert.equal(assertLocaleRepairArtifact([job]), job);
  assert.throws(() => assertLocaleRepairArtifact([{ ...job, topic: 'another topic' }]));
  assert.throws(() => assertLocaleRepairArtifact([{ ...job, imageSets: { ja: imageSet } }]));
  assert.throws(() => assertLocaleRepairArtifact([{ ...job }, { ...job }]));
});

test('requires exactly the ten already published locales with the original timestamp', () => {
  const posts = Object.fromEntries(
    LOCALE_REPAIR.existingLocales.map((code) => [
      code,
      `---\ntitle: "Existing"\npublishDate: ${LOCALE_REPAIR.publishDate}\n---\nBody\n`,
    ])
  );
  assert.equal(assertLocaleRepairExistingPosts(posts), true);
  assert.throws(() => assertLocaleRepairExistingPosts({ ...posts, ja: posts.ko }));
  assert.throws(() =>
    assertLocaleRepairExistingPosts({
      ...posts,
      ko: posts.ko.replace(LOCALE_REPAIR.publishDate, '2026-10-31T10:08:00.000Z'),
    })
  );
});

test('rejects wrong locale, date, or image mapping before materialization', () => {
  const valid = `---\ntitle: "Repair"\npublishDate: ${LOCALE_REPAIR.publishDate}\nimage: "${imageSet.coverUrl}"\n---\nBody\n\n![Troubleshooting Guide](${imageSet.bodyUrl})\n`;
  assert.equal(assertLocaleRepairDraft('ja', valid, imageSet), true);
  assert.equal(assertLocaleRepairDraft('vi', valid, imageSet), true);
  assert.throws(() => assertLocaleRepairDraft('ko', valid, imageSet));
  assert.throws(() =>
    assertLocaleRepairDraft('ja', valid.replace(LOCALE_REPAIR.publishDate, '2026-10-31T10:08:00.000Z'), imageSet)
  );
  assert.throws(() =>
    assertLocaleRepairDraft('vi', valid, {
      ...imageSet,
      bodyUrl: '/wrong.jpg',
    })
  );
});
