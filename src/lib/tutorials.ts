import type { Lesson } from './tutorial-schema.ts';

export const LEARN_HOME = '/learn/';
export const NEXT_PAGE = '/learn/next/';

export const lessonHref = (chapter: string, slug: string) => `/learn/${chapter}/${slug}/`;

/** A lesson as the content collection provides it; `id` is `<chapter>/<slug>`. */
export interface LessonInput { id: string; data: Lesson }
export interface ChapterInfo { slug: string; title: string; summary: string }
export interface TrackLesson<E extends LessonInput = LessonInput> {
  entry: E;
  id: string;
  chapter: string;
  slug: string;
  href: string;
  /** 1-based number of the lesson's chapter. */
  chapterNumber: number;
  data: Lesson;
}
export interface TrackChapter<E extends LessonInput = LessonInput> extends ChapterInfo {
  number: number;
  minutes: number;
  lessons: TrackLesson<E>[];
}
export interface Track<E extends LessonInput = LessonInput> {
  chapters: TrackChapter<E>[];
  /** Every lesson in reading order. */
  lessons: TrackLesson<E>[];
}
export interface PagerLink { href: string; title: string }

const splitId = (id: string) => {
  const [chapter, slug] = id.split('/');
  return { chapter, slug };
};

/** Groups lessons into chapters (in chapter order), each sorted by `order`. */
export function buildTrack<E extends LessonInput>(chapterList: readonly ChapterInfo[], entries: readonly E[]): Track<E> {
  const known = new Set(chapterList.map((chapter) => chapter.slug));
  for (const entry of entries) {
    if (!known.has(splitId(entry.id).chapter)) throw new Error(`Lesson ${entry.id} is not in a chapter listed in src/data/tutorials.ts`);
  }
  const built = chapterList.map((chapter, index): TrackChapter<E> => {
    const lessons = entries
      .filter((entry) => splitId(entry.id).chapter === chapter.slug)
      .sort((a, b) => a.data.order - b.data.order)
      .map((entry): TrackLesson<E> => {
        const { slug } = splitId(entry.id);
        return { entry, id: entry.id, chapter: chapter.slug, slug, href: lessonHref(chapter.slug, slug), chapterNumber: index + 1, data: entry.data };
      });
    lessons.forEach((lesson, position) => {
      const before = lessons[position - 1];
      if (before && before.data.order === lesson.data.order) {
        throw new Error(`Lessons ${before.id} and ${lesson.id} share order ${lesson.data.order}`);
      }
    });
    return { ...chapter, number: index + 1, minutes: lessons.reduce((total, lesson) => total + lesson.data.minutes, 0), lessons };
  });
  return { chapters: built, lessons: built.flatMap((chapter) => chapter.lessons) };
}

const link = (lesson: TrackLesson): PagerLink => ({ href: lesson.href, title: lesson.data.title });

/** Previous and next links: the track overview before the first lesson, the closing page after the last. */
export function pager(track: Track, id: string, closing: PagerLink): { previous: PagerLink; next: PagerLink } {
  const index = track.lessons.findIndex((lesson) => lesson.id === id);
  if (index < 0) throw new Error(`Unknown lesson ${id}`);
  const before = track.lessons[index - 1];
  const after = track.lessons[index + 1];
  return {
    previous: before ? link(before) : { href: LEARN_HOME, title: 'Track overview' },
    next: after ? link(after) : closing,
  };
}

/** The lesson's `h2` sections, for the side-panel outline. */
export function sectionHeadings(headings: readonly { depth: number; slug: string; text: string }[]) {
  return headings.filter((heading) => heading.depth === 2).map(({ slug, text }) => ({ slug, text }));
}

/** `5 min`, `1 h`, `5 h 10 min`. */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
