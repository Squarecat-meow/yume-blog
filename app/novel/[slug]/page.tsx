import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getNovelBySlug,
  getNovelChapters,
  getPublishedNovels,
} from '@/lib/notion';

export async function generateStaticParams() {
  const novels = await getPublishedNovels();
  return novels.map((novel) => ({ slug: novel.slug }));
}

export default async function NovelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const novel = await getNovelBySlug(slug);
  if (!novel) notFound();

  const chapters = await getNovelChapters(novel.id);

  return (
    <article className='max-w-2xl mx-auto py-8'>
      <div className='flex gap-8'>
        <div className='w-40 shrink-0'>
          <div className='aspect-[2/3] w-full overflow-hidden rounded bg-slate-100'>
            {novel.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={novel.cover}
                alt={novel.title}
                className='h-full w-full object-cover'
              />
            ) : (
              <div className='flex h-full w-full items-center justify-center p-4 text-center'>
                <span className='font-song text-lg text-slate-400'>
                  {novel.title}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className='space-y-2'>
          <h1 className='font-song text-4xl'>{novel.title}</h1>
          {novel.publishedAt && (
            <span className='text-sm text-slate-400'>{novel.publishedAt}</span>
          )}
          <p className='text-slate-600'>{novel.summary}</p>
        </div>
      </div>

      <h2 className='font-song text-2xl mt-10 mb-4'>챕터</h2>
      {chapters.length === 0 ? (
        <p className='text-slate-400'>아직 등록된 챕터가 없습니다.</p>
      ) : (
        <ul className='divide-y divide-slate-300'>
          {chapters.map((chapter) => (
            <li key={chapter.id}>
              <Link
                href={`/novel/${novel.slug}/${chapter.index}`}
                className='block py-3 text-slate-700 hover:text-sky-600'
              >
                {chapter.index}화. {chapter.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
