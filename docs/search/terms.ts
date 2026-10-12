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

/**
 * The parts of a word: it is cut at '_' and '.', where a lower-case letter is followed by an upper-case one, and
 * between a letter and a digit. Parts of one character are dropped. A word with nothing left, or whose only part is
 * the word itself, has no parts (issueTargetOrder: issue, Target, Order; Unit: none).
 */
export function wordParts(word: string): string[] {
  const parts = word
    .split(
      /[_.]+|(?<=\p{Ll})(?=\p{Lu})|(?<=\p{L})(?=\p{N})|(?<=\p{N})(?=\p{L})/u,
    )
    .filter((part) => part.length >= 2);
  if (parts.length === 0 || (parts.length === 1 && parts[0] === word)) {
    return [];
  }
  return parts;
}

/**
 * The terms of a text, for the index: each word, then its parts. Searching does not use this: a query is cut into
 * words and parts by the engine itself, which matches a word whole or by all of its parts.
 */
export function searchTerms(text: string): string[] {
  return searchWords(text).flatMap((word) => [word, ...wordParts(word)]);
}
