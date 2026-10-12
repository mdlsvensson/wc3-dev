/** How many results the dialog draws. */
export const resultLimit = 20;

export function resultStatus(total: number): string {
  if (total > resultLimit) return `${resultLimit} of ${total} results`;
  return `${total} result${total === 1 ? "" : "s"}`;
}
