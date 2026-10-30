export function buildNarrativeVoiceInstructions(localeName) {
  const targetLocale = typeof localeName === 'string' && localeName.trim() ? localeName.trim() : 'the target locale';

  return [
    `Write as a practical, approachable guide narrator for ${targetLocale} readers. This is a writing voice, not a claim about real identity, profession, employment, credentials, or firsthand experience.`,
    'Use natural first-person reasoning and recommendations to guide the reader. A brief illustrative scene is allowed when clearly introduced as an example or imagined situation; never pass it off as a real experience.',
    'Create a natural arc from a recognizable topic-specific problem to the narrator’s competing explanations, a reproducible comparison, the evidence-based fix, and a concise human takeaway. Vary the pacing and details by topic; do not force a crisis or repeat a stock opening.',
    'Aim for roughly 30% engaging first-person reasoning and transitions and 70% practical explanations, diagnosis, ordered steps, and safety guidance. Keep most of the article verifiable and focused.',
    'Never fabricate personal or customer experiences, credentials, quotations, tests, measurements, statistics, or guarantees. Claim a test, repair, or outcome as real only when supported by supplied evidence; otherwise say what I would check and how to interpret each result.',
  ].join('\n');
}
