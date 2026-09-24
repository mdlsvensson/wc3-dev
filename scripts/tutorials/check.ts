import { fromFileUrl, join } from 'jsr:@std/path@^1';
import { extract } from 'jsr:@std/front-matter@^1/yaml';
import { z } from 'astro/zod';
import { markdownToMdast, type MdastNode } from 'satteri';
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

const VERIFY = /<!--\s*verify:\s*([\s\S]*?)\s*-->/g;
const IMAGE = /\.(png|jpe?g|webp)$/i;
/** Container directives `src/markdown/tutorial-directives.ts` renders; the build rejects any other. */
const CONTAINERS = ['steps', 'tip', 'note', 'caution', 'checkpoint'];
/** The only leaf directive; the build rejects any other. */
const LEAVES = ['shot'];

type Node = MdastNode & { name?: string; attributes?: Record<string, string | null | undefined> | null; value?: string; depth?: number; children?: Node[] };

/** The text a node renders, like Sätteri's `ctx.textContent`. */
const textContent = (node: Node): string => typeof node.value === 'string' ? node.value : (node.children ?? []).map(textContent).join('');

/** What the lesson body contains, found by parsing it as the build does (so fenced code never counts). */
interface Scan { sections: number; unknown: string[]; shots: { note: string; src: string }[]; verify: string[] }

function scan(body: string): Scan {
  const found: Scan = { sections: 0, unknown: [], shots: [], verify: [] };
  const visit = (node: Node) => {
    if (node.type === 'heading' && node.depth === 2) found.sections++;
    else if (node.type === 'containerDirective' && !CONTAINERS.includes(node.name!)) found.unknown.push(`:::${node.name}`);
    else if (node.type === 'leafDirective' && !LEAVES.includes(node.name!)) found.unknown.push(`::${node.name}`);
    else if (node.type === 'leafDirective') found.shots.push({ note: textContent(node), src: node.attributes?.src ?? '' });
    else if (node.type === 'html') for (const [, note] of node.value!.matchAll(VERIFY)) found.verify.push(note.replace(/\s+/g, ' '));
    for (const child of node.children ?? []) visit(child);
  };
  visit(markdownToMdast(body, { features: { directive: true }, position: false }) as Node);
  return found;
}

const describe = (error: unknown) =>
  error instanceof z.ZodError ? z.prettifyError(error).replaceAll('\n', ' ') : error instanceof Error ? error.message : String(error);

async function sortedEntries(dir: string): Promise<Deno.DirEntry[]> {
  const entries: Deno.DirEntry[] = [];
  for await (const entry of Deno.readDir(dir)) entries.push(entry);
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

const exists = (path: string) => Deno.stat(path).then(() => true, () => false);

/** Checks one Markdown file; returns its parsed frontmatter, or undefined when it has errors. */
async function checkPage<Data>(
  report: TutorialReport,
  dir: string,
  page: string,
  schema: z.ZodType<Data>,
  needsSection: boolean,
): Promise<Data | undefined> {
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
  const found = scan(body);
  if (needsSection && found.sections === 0) report.errors.push(`${file}: a lesson needs at least one "## " section heading`);
  for (const directive of found.unknown) {
    const known = [...CONTAINERS.map((name) => `:::${name}`), ...LEAVES.map((name) => `::${name}`)];
    report.errors.push(`${file}: unknown directive "${directive}"; use one of ${known.join(', ')}`);
  }
  for (const { note, src } of found.shots) {
    report.shots++;
    if (!src.startsWith(`./${name}/`) || !IMAGE.test(src) || src.split(/[/\\]/).includes('..')) {
      report.errors.push(`${file}: screenshot "${note}" must be a .png, .jpg or .webp in ./${name}/, without ".." (got "${src}")`);
    } else if (!(await exists(join(dir, src)))) {
      report.missing.push({ page, src, note });
    }
  }
  for (const note of found.verify) report.verify.push({ page, note });
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
      const { order } = data;
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
