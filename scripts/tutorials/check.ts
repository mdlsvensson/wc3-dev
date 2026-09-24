import { fromFileUrl, join } from 'jsr:@std/path@^1';
import { extract } from 'jsr:@std/front-matter@^1/yaml';
import { z } from 'astro/zod';
import { chapters } from '../../src/data/tutorials.ts';
import { lessonSchema, TUTORIAL_SLUG, tutorialPageSchema } from '../../src/lib/tutorial-schema.ts';

export interface MissingShot { page: string; src: string; note: string }
export interface VerifyNote { page: string; note: string }
export interface TutorialReport {
  errors: string[];
  lessons: number;
  /** Every `::shot` in the track, captured or not. */
  shots: number;
  missing: MissingShot[];
  verify: VerifyNote[];
}

const FENCE = /^(```|~~~)[\s\S]*?^\1[^\n]*$/gm;
const SHOT = /^::shot\[([^\]]*)\](?:\{([^}]*)\})?[ \t]*$/gm;
const ATTRIBUTE = /(\w+)="([^"]*)"/g;
const VERIFY = /<!--\s*verify:\s*([\s\S]*?)\s*-->/g;
const IMAGE = /\.(png|jpe?g|webp)$/i;
/** An opening container directive; closing `:::` lines have no name. */
const CONTAINER = /^:{3,}([A-Za-z][\w-]*)/gm;
/** Container directives `src/markdown/tutorial-directives.ts` renders; the build rejects any other. */
const CONTAINERS = ['steps', 'tip', 'note', 'caution', 'checkpoint'];

const describe = (error: unknown) =>
  error instanceof z.ZodError ? z.prettifyError(error).replaceAll('\n', ' ') : error instanceof Error ? error.message : String(error);

async function sortedEntries(dir: string): Promise<Deno.DirEntry[]> {
  const entries: Deno.DirEntry[] = [];
  for await (const entry of Deno.readDir(dir)) entries.push(entry);
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

const exists = (path: string) => Deno.stat(path).then(() => true, () => false);

/** Checks one Markdown file; returns its parsed frontmatter, or undefined when it has errors. */
async function checkPage(
  report: TutorialReport,
  dir: string,
  page: string,
  schema: typeof lessonSchema | typeof tutorialPageSchema,
  needsSection: boolean,
): Promise<Record<string, unknown> | undefined> {
  const name = page.split('/').at(-1)!;
  const file = `${page}.md`;
  if (!TUTORIAL_SLUG.test(name)) report.errors.push(`${file}: file name must be a lowercase kebab-case slug`);
  let attrs: Record<string, unknown>;
  let body: string;
  try {
    ({ attrs, body } = extract<Record<string, unknown>>(await Deno.readTextFile(join(dir, `${name}.md`))));
  } catch (error) {
    report.errors.push(`${file}: frontmatter: ${describe(error)}`);
    return undefined;
  }
  const prose = body.replace(FENCE, '');
  if (needsSection && !/^## /m.test(prose)) report.errors.push(`${file}: a lesson needs at least one "## " section heading`);
  for (const [, directive] of prose.matchAll(CONTAINER)) {
    if (!CONTAINERS.includes(directive)) {
      report.errors.push(`${file}: unknown directive ":::${directive}"; use one of ${CONTAINERS.map((known) => `:::${known}`).join(', ')}`);
    }
  }
  for (const [, note, attributeText = ''] of prose.matchAll(SHOT)) {
    report.shots++;
    const attributes = Object.fromEntries([...attributeText.matchAll(ATTRIBUTE)].map(([, key, value]) => [key, value]));
    const src = attributes.src ?? '';
    if (!src.startsWith(`./${name}/`) || !IMAGE.test(src)) {
      report.errors.push(`${file}: screenshot "${note}" must be a .png, .jpg or .webp in ./${name}/ (got "${src}")`);
    } else if (!(await exists(join(dir, src)))) {
      report.missing.push({ page, src, note });
    }
  }
  for (const [, note] of prose.matchAll(VERIFY)) report.verify.push({ page, note: note.replace(/\s+/g, ' ') });
  const parsed = schema.safeParse(attrs);
  if (!parsed.success) {
    report.errors.push(`${file}: ${describe(parsed.error)}`);
    return undefined;
  }
  return parsed.data;
}

/** Validates the track under `root` (`src/content/tutorials/`). */
export async function checkTutorials(root: string, chapterSlugs: readonly string[] = chapters.map((chapter) => chapter.slug)): Promise<TutorialReport> {
  const report: TutorialReport = { errors: [], lessons: 0, shots: 0, missing: [], verify: [] };
  const known = new Set(chapterSlugs);
  for (const entry of await sortedEntries(root)) {
    if (entry.isDirectory && !known.has(entry.name)) report.errors.push(`${entry.name}/: not a chapter in src/data/tutorials.ts`);
    if (entry.isFile && entry.name.endsWith('.md')) await checkPage(report, root, entry.name.slice(0, -3), tutorialPageSchema, false);
  }
  for (const chapter of chapterSlugs) {
    const dir = join(root, chapter);
    const files = (await exists(dir) ? await sortedEntries(dir) : []).filter((entry) => entry.isFile && entry.name.endsWith('.md'));
    if (files.length === 0) {
      report.errors.push(`${chapter}/: chapter has no lessons`);
      continue;
    }
    const orders = new Map<number, string>();
    for (const file of files) {
      const page = `${chapter}/${file.name.slice(0, -3)}`;
      report.lessons++;
      const data = await checkPage(report, dir, page, lessonSchema, true);
      if (!data) continue;
      const order = data.order as number;
      const other = orders.get(order);
      if (other) report.errors.push(`${page}.md: order ${order} is also used by ${other}`);
      else orders.set(order, page);
    }
  }
  return report;
}

export function formatReport(report: TutorialReport): string {
  const lines = [`Tutorials: ${report.lessons} lessons.`];
  const captured = report.shots - report.missing.length;
  lines.push(`Screenshots: ${captured} of ${report.shots} screenshots captured.`);
  let page = '';
  for (const shot of report.missing) {
    if (shot.page !== page) lines.push(`  ${(page = shot.page)}`);
    lines.push(`    ${shot.src}: ${shot.note}`);
  }
  if (report.verify.length > 0) {
    lines.push(`To verify in the World Editor (${report.verify.length}):`);
    page = '';
    for (const item of report.verify) {
      if (item.page !== page) lines.push(`  ${(page = item.page)}`);
      lines.push(`    - ${item.note}`);
    }
  }
  if (report.errors.length > 0) lines.push(`Errors (${report.errors.length}):`, ...report.errors.map((error) => `  ${error}`));
  return lines.join('\n');
}

if (import.meta.main) {
  const report = await checkTutorials(fromFileUrl(new URL('../../src/content/tutorials/', import.meta.url)));
  console.log(formatReport(report));
  if (report.errors.length > 0) Deno.exit(1);
}
