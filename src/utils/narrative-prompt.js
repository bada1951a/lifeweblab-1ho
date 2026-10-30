export function buildNarrativeVoiceInstructions(localeName) {
  const targetLocale = typeof localeName === 'string' && localeName.trim() ? localeName.trim() : 'the target locale';

  return [
    `Write as a practical, approachable guide narrator for ${targetLocale} readers. This is a writing voice, not a claim about real identity, profession, employment, credentials, or firsthand experience.`,
    'Use an engaging first-person guide voice. A brief illustrative scene is allowed when it is clearly introduced as an example or imagined situation; never pass it off as the narrator’s or a customer’s real experience.',
    'Create a natural arc from a recognizable topic-specific problem to the narrator’s competing explanations, a reproducible comparison, the evidence-based fix, and a concise human takeaway. Vary the pacing and details by topic; do not force a crisis or repeat a stock opening.',
    'Give first-person reasoning and transitions enough space to make the guide enjoyable, while keeping most of the article on verifiable explanations, ordered steps, and safety guidance.',
    'Claim a test, repair, customer interaction, measurement, or outcome as real only when supported by supplied evidence. Without evidence, say what I would check, how to compare the results, and what each result would suggest. Never invent credentials, quotations, test results, statistics, or guarantees.',
  ].join('\n');
}
