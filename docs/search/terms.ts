/**
 * The terms of a text or of a query: each word, and the parts of a word that changes case or meets a digit
 * (issueTargetOrder: issueTargetOrder, issue, Target, Order). Words end at spaces and punctuation, so '_' and '.'
 * cut too. Indexing and searching must use this one function.
 */
export function searchTerms(text: string): string[] {
  const terms: string[] = [];
  for (const word of text.split(/[\n\r\p{Z}\p{P}]+/u)) {
    if (!word) continue;
    terms.push(word);
    const parts = word.split(
      /(?<=[a-z])(?=[A-Z])|(?<=[A-Za-z])(?=\d)|(?<=\d)(?=[A-Za-z])/,
    );
    if (parts.length > 1) terms.push(...parts);
  }
  return terms;
}
