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

// Gender lives in headword_full as: <span class="genus"><acronym title="feminine">f</acronym></span>
function parseGender(headwordFull) {
  if (!headwordFull) return null;
  const match = headwordFull.match(/<span class="genus">[^<]*<acronym title="([^"]+)">/);
  if (!match) return null;
  const title = match[1].toLowerCase();
  if (title === 'masculine') return 'masculine';
  if (title === 'feminine')  return 'feminine';
  if (title === 'neuter')    return 'neuter';
  return null;
}

export async function lookup(word, wordLanguage, sourceLang, apiKey) {
  const pair = `${wordLanguage}${sourceLang}`;
  const url = `https://api.pons.com/v1/dictionary?q=${encodeURIComponent(word)}&l=${pair}&language=${sourceLang}`;

  const res = await fetch(url, {
    headers: { 'X-Secret': apiKey },
  });

  // 204 = no results found (valid response, not an error)
  if (res.status === 204) return { translation: null, wordclass: null, examples: [], gender: null };
  if (!res.ok) throw new Error(`PONS error: ${res.status}`);

  const data = await res.json();

  // The response is an array, one item per language. We take the first.
  // Each item has a `hits` array — we want the first hit of type 'entry'.
  const hits = data?.[0]?.hits ?? [];
  const entry = hits.find(h => h.type === 'entry');
  if (!entry) return { translation: null, wordclass: null, examples: [], gender: null };

  // roms = Roman-numeral entries: top-level senses of the word (e.g. noun sense vs verb sense).
  // We take the first rom, which is the most common sense.
  const rom = entry.roms?.[0];
  const wordclass = rom?.wordclass ? stripHtml(rom.wordclass) : null; // e.g. "noun", "verb"
  const gender = parseGender(rom?.headword_full);

  let translation = null;
  const examples = [];

  // arabs = Arabic-numeral entries: sub-senses within a rom, each with their own translations.
  for (const arab of rom?.arabs ?? []) {
    for (const t of arab.translations ?? []) {
      const source = stripHtml(t.source); // the word/phrase in the source language
      const target = stripHtml(t.target); // the translation in the target language
      if (!source || !target) continue;
      if (!translation) translation = target; // use the first translation as the main one
      examples.push({ source, target });
    }
  }

  return {
    translation,
    wordclass, // grammatical category, e.g. "noun", "verb" — not a definition
    examples: examples.slice(0, 3),
    gender,
  };
}
