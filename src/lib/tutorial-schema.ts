import { z } from 'astro/zod';

/** Lowercase kebab-case, used for chapter folders and lesson file names. */
export const TUTORIAL_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Frontmatter of a lesson (`src/content/tutorials/<chapter>/<lesson>.md`). */
export const lessonSchema = z.object({
  title: z.string().min(1).max(80),
  summary: z.string().min(1).max(200),
  /** Position within the chapter; unique per chapter. */
  order: z.number().int().positive(),
  /** Estimated time to read and follow along. */
  minutes: z.number().int().positive(),
  /** The "In this lesson you will" list. */
  goals: z.array(z.string().min(1)).min(1).max(5),
});
export type Lesson = z.infer<typeof lessonSchema>;

/** Frontmatter of a top-level track page, such as `next.md`. */
export const tutorialPageSchema = z.object({
  title: z.string().min(1).max(80),
  summary: z.string().min(1).max(200),
});
export type TutorialPage = z.infer<typeof tutorialPageSchema>;
