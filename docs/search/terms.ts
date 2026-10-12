/**
 * The words of a text or of a query. A word is a run of letters, digits, '_' and '.'; anything else (white space,
 * other punctuation, symbols) ends it. A '.' or '_' at either end of a word is not part of it (a sentence's last dot).
 */
export function searchWords(text: string): string[] {
  const words: string[] = [];
  for (const run of text.split(/[^\p{L}\p{N}_.]+/u)) {
    const word = run.replace(/^[._]+|[._]+$/g, "");
    if (word) words.push(word);
  }
  return words;
}

/** A word cut at '.' and '_' (Unit.getLife: Unit, getLife). A word without either is one segment. */
export function wordSegments(word: string): string[] {
  return word.split(/[._]+/).filter(Boolean);
}

/**
 * The parts of a segment: it is cut where a lower-case letter is followed by an upper-case one, and between a letter
 * and a digit. Parts of one character are dropped. A segment with nothing left, or whose only part is the segment
 * itself, has no parts (issueTargetOrder: issue, Target, Order; Unit: none).
 */
export function segmentParts(segment: string): string[] {
  const parts = segment
    .split(/(?<=\p{Ll})(?=\p{Lu})|(?<=\p{L})(?=\p{N})|(?<=\p{N})(?=\p{L})/u)
    .filter((part) => part.length >= 2);
  if (parts.length === 0 || (parts.length === 1 && parts[0] === segment)) {
    return [];
  }
  return parts;
}

/**
 * The terms of a text, for the index. For each word: the word; when it has more than one segment, each segment of
 * two or more characters; then the parts of each segment. No term is repeated within a word. Searching does not use
 * this: a query is cut into words, segments and parts by the engine itself, which matches a word whole or by all of
 * its segments, and a segment whole or by all of its parts.
 */
export function searchTerms(text: string): string[] {
  const terms: string[] = [];
  for (const word of searchWords(text)) {
    const segments = wordSegments(word);
    const ofWord = new Set([word]);
    if (segments.length > 1) {
      for (const segment of segments) {
        if (segment.length >= 2) ofWord.add(segment);
      }
    }
    for (const segment of segments) {
      for (const part of segmentParts(segment)) ofWord.add(part);
    }
    terms.push(...ofWord);
  }
  return terms;
}
