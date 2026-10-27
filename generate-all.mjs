async function fetchWithRetry(prompt, maxRetries = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // 🛡️ 35초 강제 타임아웃 컨트롤러 (멍때림 원천 차단)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 35000);

    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          maxOutputTokens: 3500, // 토큰 폭주 방지 (2,200~2,500자 최적화)
          temperature: 0.7,
          abortSignal: controller.signal // 35초 초과 시 즉시 강제 취소
        }
      });
      clearTimeout(timeoutId);
      return response.text;
    } catch (error) {
      clearTimeout(timeoutId);
      const isTimeout = error.name === 'AbortError' || error.message?.includes('aborted');
      console.warn(`⚠️ [호출 재시도] ${attempt}/${maxRetries} (${isTimeout ? '35초 타임아웃 강제 중단' : error.message})`);
      if (attempt === maxRetries) { throw error; }
      await delay(delayMs);
    }
  }
}
