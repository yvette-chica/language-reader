// MyMemory — free translation API, no key required
// Docs: https://mymemory.translated.net/doc/spec.php
// Free limit: 5,000 chars/day (anonymous), 50,000/day with an email in the query

export async function lookup(word, wordLanguage, sourceLang) {
  const langpair = `${wordLanguage}|${sourceLang}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=${encodeURIComponent(langpair)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory error: ${res.status}`);

  const data = await res.json();

  if (data.responseStatus !== 200) {
    throw new Error(data.responseDetails || 'MyMemory lookup failed');
  }

  return {
    translation: data.responseData?.translatedText ?? null,
    definition: null,
    examples: [],
  };
}
