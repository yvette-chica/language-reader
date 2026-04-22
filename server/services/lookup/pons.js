// PONS Dictionary API — free tier with API key registration
// Register at: https://en.pons.com/p/online-dictionary/developers/api
// Docs: https://api.pons.com/
//
// Language pair codes are two ISO 639-1 codes concatenated, e.g.:
//   deen = German–English, huen = Hungarian–English, defr = German–French
// Verify supported pairs at: https://api.pons.com/ (not all combinations exist)

function stripHtml(str) {
  return str?.replace(/<[^>]+>/g, '').trim() ?? '';
}

export async function lookup(word, wordLanguage, sourceLang, apiKey) {
  const pair = `${wordLanguage}${sourceLang}`;
  const url = `https://api.pons.com/v1/dictionary?q=${encodeURIComponent(word)}&l=${pair}&language=${sourceLang}`;

  const res = await fetch(url, {
    headers: { 'X-Secret': apiKey },
  });

  // 204 = no results found (valid response, not an error)
  if (res.status === 204) return { translation: null, definition: null, examples: [] };
  if (!res.ok) throw new Error(`PONS error: ${res.status}`);

  const data = await res.json();

  const hits = data?.[0]?.hits ?? [];
  const entry = hits.find(h => h.type === 'entry');
  if (!entry) return { translation: null, definition: null, examples: [] };

  const rom = entry.roms?.[0];
  const definition = rom?.wordclass ? stripHtml(rom.wordclass) : null;

  let translation = null;
  const examples = [];

  for (const arab of rom?.arabs ?? []) {
    for (const t of arab.translations ?? []) {
      const source = stripHtml(t.source);
      const target = stripHtml(t.target);
      if (!source || !target) continue;
      if (!translation) translation = target;
      examples.push({ source, target });
    }
  }

  return {
    translation,
    definition,
    examples: examples.slice(0, 3),
  };
}
