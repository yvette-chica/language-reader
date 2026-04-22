// DeepL Translate API — free tier up to 500,000 chars/month
// Register at: https://www.deepl.com/en/pro#developer
// Free tier uses the api-free.deepl.com endpoint (api.deepl.com is for paid plans)

export async function lookup(word, wordLanguage, sourceLang, apiKey) {
  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [word],
      source_lang: wordLanguage.toUpperCase(),
      target_lang: sourceLang.toUpperCase(),
    }),
  });

  if (!res.ok) throw new Error(`DeepL error: ${res.status}`);

  const data = await res.json();

  return {
    translation: data.translations?.[0]?.text ?? null,
    wordclass: null,
    examples: [],
    gender: null,
  };
}
