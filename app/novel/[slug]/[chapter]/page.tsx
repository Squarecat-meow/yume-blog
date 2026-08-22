import Link from 'next/link';
import { notFound } from 'next/navigation';
import NotionBlocks from '@/components/notion-blocks';
import {
  getNovelBySlug,
  getNovelChapterBlocks,
  getNovelChapters,
  getPublishedNovels,
} from '@/lib/notion';

export async function generateStaticParams() {
  const novels = await getPublishedNovels();

  const params = await Promise.all(
    novels.map(async (novel) => {
      const chapters = await getNovelChapters(novel.id);
      return chapters.map((chapter) => ({
        slug: novel.slug,
        chapter: String(chapter.index),
      }));
    }),
  );

  return params.flat();
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}) {
  const { slug, chapter: chapterParam } = await params;
  const novel = await getNovelBySlug(slug);
  if (!novel) notFound();

  const chapters = await getNovelChapters(novel.id);
  const chapterIndex = Number(chapterParam);
  const chapter = chapters.find((c) => c.index === chapterIndex);
  if (!chapter) notFound();

  const blocks = await getNovelChapterBlocks(chapter.id);
  const prev = chapters.find((c) => c.index === chapterIndex - 1);
  const next = chapters.find((c) => c.index === chapterIndex + 1);

  return (
    <article className='max-w-2xl mx-auto py-8'>
      <Link
        href={`/novel/${slug}`}
        className='text-sm text-slate-400 hover:text-sky-600'
      >
        {novel.title}
      </Link>
      <h1 className='font-song text-4xl'>
        {chapter.index}화. {chapter.title}
      </h1>
      <div className='mt-8'>
        <NotionBlocks blocks={blocks} />
      </div>
      <div className='mt-10 flex justify-between text-sm'>
        {prev ? (
          <Link
            href={`/novel/${slug}/${prev.index}`}
            className='text-slate-600 hover:text-sky-600'
          >
            ← {prev.index}화. {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/novel/${slug}/${next.index}`}
            className='text-slate-600 hover:text-sky-600'
          >
            {next.index}화. {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </article>
  );
}
