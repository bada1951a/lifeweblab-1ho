# GLOBAL BLOG PROJECT RULES — v1.0

Updated: 2026-10-29
Status: Agreed operating principles; not a claim of deployment or AdSense approval.

## Business priority

1. Prioritize the first domain group (1ho, 2ho, 3ho, 4ho): site quality, indexing, stable publishing, and AdSense readiness.
2. Build the second domain group starting with 2-1ho (lifeweblab-1ho), restoring and improving legacy Gemini content where useful.
3. Scale only after validating quality, economics, and search performance; long-term ambition is 100 blog units.
4. Planned domain architecture: one parent domain with five subdomains per group (confirm counting and exact names before provisioning). Different domains diversify site-level operational risks, not AdSense account-level enforcement.
5. Aspirational traffic target: 5,000 daily visitors **per country/language**, 12 countries = 60,000 daily visitors per group if achieved. Not guaranteed.

## Editorial principles — mandatory

- Entire article should read as natural first-person storytelling, not just the introduction. Maintain reader interest while answering the query early and completely.
- NEVER fabricate firsthand tests, ownership, measured results, or personal anecdotes. When no real firsthand experience exists, use a conversational first-person explanation without false claims.
- Share only the topic across 12 languages. Generate each country's article independently from a locally adapted brief; do NOT translate or paraphrase another country's finished article.
- Localize natural terminology, search intent, product/OS menu names, examples, narrative arc, heading choices and FAQ. Common technical facts may remain the same.
- Avoid templated openings, repeated AI filler, unnatural translation style, irrelevant images, and unsupported claims.
- Accuracy and practical step-by-step troubleshooting come before word count or engagement tricks. Avoid deliberately withholding solutions to extend time-on-page.

## Publishing and QA

- Verify language purity, Markdown/HTML/frontmatter integrity, valid code fences, title structure, internal links, and meaningful FAQ.
- Validate each language independently; failed articles must not silently publish as successful.
- Preserve existing site theme, category taxonomy, images, schedules and published posts unless separately authorized.
- Check real generated output and CI/build results before deploying; a dry run alone is not proof of editorial quality.
- Do not merge review branches into main, enable paid recurring generation, or deploy production changes without explicit approval.

## AdSense and search

- Prioritize original, useful content and policy compliance. Approval, ranking, traffic, and revenue are not guaranteed.
- Maintain honest authorship/experience claims; do not use domains or accounts to evade enforcement.
- Monitor indexing, technical SEO, language canonical/hreflang where applicable, engagement and traffic by country.

## Collaboration and continuity

- This file is the persistent operating reference, not a substitute for the actual generation prompt.
- Changes to rules require clear user agreement; log important decisions in version history.
- The assistant must inspect GitHub and workflow logs before claiming work completed. State clearly what is tested, pending, or deployed.
- This document is intentionally added to review branches first; production main is unchanged until approval.

## Truthfulness and uncertain memory — mandatory

- If the assistant cannot reliably recall a prior decision, requirement, instruction, or work status, explicitly say it is uncertain or not remembered and ASK THE USER to confirm. Never invent memories, agreements, test outcomes, or completed work.
- First check available conversation history and this document or other authoritative repository records when practical. If evidence is still insufficient, ask rather than guess.
- Clearly distinguish verified facts, assumptions, plans, and actions actually completed. Do not pretend to remember something that cannot be verified.

## Immediate business priority — AdSense application window (agreed 2026-10-29)

- User is preparing for retirement and considers this a critical long-term income project; prioritize accuracy, risk management and honest reporting over speed or site count.
- Highest immediate priority is AdSense readiness for Group 1's primary site (storydailyview.com / 1ho) and Group 2's primary site (lifeweblab.com / 2-1ho).
- Target application date: around 2026-11-12 (approximately two weeks from 2026-10-29), not a guarantee of readiness or approval.
- Before applying, audit site accessibility, crawl/index eligibility, navigation, policy/contact/about pages, original helpful content, language quality, duplication, broken layouts/links, and the actual published experience.
- Prioritize fixing existing content and reliability over launching more blog units. Clearly distinguish confirmed issues, recommendations, and completed fixes. Never claim AdSense approval is guaranteed.

## Verified unit-to-domain mapping (user-confirmed 2026-10-29)

- Group 1 / 1ho: https://storydailyview.com/ — bada1951a/astrowind-blog
- Group 1 / 2ho: https://m.storydailyview.com/ — bada1951a/astrowind-blog-2ho
- Group 1 / 3ho: https://work.storydailyview.com/ — bada1951a/astrowind-blog-3ho
- Group 1 / 4ho: https://prompt.storydailyview.com/ — bada1951a/astrowind-blog-4ho
- Group 2 / 2-1ho: https://lifeweblab.com/ — bada1951a/lifeweblab-1ho
- Immediate AdSense priorities: 1ho and 2-1ho. Do not confuse 2ho with 2-1ho.

## Explicit priority order and image policy (user-confirmed 2026-10-29)

- Strict priority: 1ho (storydailyview.com) FIRST, 2-1ho (lifeweblab.com) SECOND. Do not describe them as equal priority.
- 1ho and 2-1ho: images are manually uploaded and managed by the user; preserve this workflow and existing assets.
- 2ho, 3ho, 4ho: use external Pexels image links for lower-maintenance publishing; verify links and image rights when auditing.
- Do not change image sources, upload strategy, or production workflows without explicit approval.

## QA handoff and deduplication (2026-10-29)

- User transferred 2-1ho (lifeweblab-1ho) GPT-6 Luna QA management from another chat into the main project conversation. Treat PR #1 and this review branch as the single existing workstream; inspect before adding any QA tools, scripts, or workflows to avoid duplicates.
- At handoff, PR #1 remained open at e686702af2d54ee7bced95210f4b66521038d425; associated CI run 40735830764 succeeded (Check and Build). This does not itself verify the separate GPT Luna dry-run workflow, paid quality sample, or 12-language editorial quality.
- Preserve existing features, images, scheduling, and publishing pipeline. Do not merge into main, deploy, trigger production publishing, or trigger paid API tests without explicit approval.
- Next: confirm latest safe dry-run run/job status, examine generation and existing-post repair code for side effects, then audit representative posts across all 12 languages and propose/fix issues ONLY on the review branch. Report significant changes, blockers, and decisions rather than routine chatter.

## Image QA owner: 지사진 주임 (approved 2026-10-29)

- Scope: audit hero/frontmatter and inline images for all existing posts, in all 12 languages. Classify topic relevance, broken references, duplicates, alt text and mobile suitability. Produce a reviewable manifest of post path, image URL, topic, suspected issue, replacement candidate, source/license evidence, and duplicate key.
- Prefer genuinely topic-relevant, legally reusable free photographs (e.g. Pexels/Unsplash subject to the image's actual license). Do not assume every search result is free or redistribute unverified assets. Never scrape or bypass provider terms; respect API limits.
- Prioritize replacing unrelated scenery in 2ho/3ho/4ho. Preserve 1ho/2-1ho user-managed local image workflows and existing assets unless a specific change is reviewed. For 2ho/3ho/4ho prefer the existing externally linked Pexels workflow unless a change is approved.
- Minimize repeated images within each blog and across the five blogs, using normalized source IDs/URLs and, if available, content hashes; do not claim perfect deduplication. Avoid changing images solely to meet a numerical uniqueness target when the existing image is genuinely appropriate.
- Work on review branches only. First inventory and propose replacements; validate license, URL accessibility, attribution if required, and topic match before any image edits. No automatic main merges, production deploys, paid image/AI APIs, bulk deletion, or changes to scheduled publishing.
- Report audit findings to 지이사 for aggregation; escalate only significant risks or approval decisions to the owner. This is a work assignment, not proof that an autonomous image agent is running.

## Owner priority directive (2026-10-29): AdSense readiness first

- PRIORITY 1: storydailyview.com (1ho); PRIORITY 2: lifeweblab.com (2-1ho). Focus work on correcting existing multilingual article defects, factual quality, mobile readability, appropriate unique image/card-news pilots, and site/indexing/navigation readiness before scaling production.
- Defer large-scale image/content changes for 2ho/3ho/4ho until the first two sites are ready for AdSense review; only critical maintenance on the deferred sites.
- Preserve existing content and images until verified replacements are ready. Work only on review branches. Scheduled publishing remains paused on all five main branches; do not restart, merge, deploy, or call paid APIs without owner approval.
- Report measured progress, blockers, and AdSense readiness to 지이사 for a consolidated owner update; never promise approval or imply autonomous work without an actual scheduled workflow.

## Owner authorization (2026-10-29): conditional automatic publishing after readiness

- Owner authorizes resuming automatic publishing for priority sites 1ho and 2-1ho WHEN their new generation/publishing pipelines are actually validated as ready; do not wait for every preexisting post to be manually repaired.
- Target cadence: one post per language per day (12 languages per site). Start with 1ho and 2-1ho; 2ho/3ho/4ho remain paused pending separate prioritization.
- Before re-enabling any production schedule, verify working model/API credentials without exposing secrets, dry-run/build, publish safeguards for broken Markdown/HTML, language mismatch, duplicate topics/slugs, and image availability. Never knowingly publish broken content.
- Post-publication: free QA checks detect issues; automated corrections only for safe, deterministic fixes, with logging and rollback. Complex factual or editorial fixes require reviewed PR, not unverified blind changes.
- This is conditional permission, NOT an instruction to immediately enable broken workflows. Report verified readiness and actual activation status to director Ji and owner.
