export function buildNarrativeVoiceInstructions(localeName) {
  const targetLocale = typeof localeName === 'string' && localeName.trim() ? localeName.trim() : 'the target locale';

  return [
    `Write as a practical, approachable guide narrator for ${targetLocale} readers. This is a writing voice, not a claim about real identity, profession, employment, credentials, or firsthand experience.`,
    'Use natural first-person reasoning and recommendations (for example, “I would first check…”) to guide the reader through the problem. Do not present a staged autobiography or claim that the author actually performed a repair, diagnosed this case, served a customer, or observed an outcome.',
    'Open at a concrete decision the reader faces in this topic and pose the question that guides the diagnosis. Do not invent a real-seeming event, setting, customer, company, transaction, backstory, or outcome. Let the reader follow the narrator’s reasoning through diagnosis and safe next steps with natural transitions, not a forced dramatic story arc.',
    'Aim for roughly 30% engaging first-person reasoning and transitions and 70% practical, verifiable explanations, ordered steps, and safety guidance. Keep every narrative detail relevant to the topic and prioritize accuracy and clarity over story length.',
    'Never fabricate personal or customer experiences, professional credentials, quotations, tests, results, or guarantees. Do not add a disclaimer that a scene is hypothetical or fictional; use first person for reasoning and advice only.',
  ].join('\n');
}
