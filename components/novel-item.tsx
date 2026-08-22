import Link from 'next/link';
import { Novel } from '@/types/notion';

export default function NovelItem({ novel }: { novel: Novel }) {
  return (
    <li>
      <Link href={`/novel/${novel.slug}`} className='group block space-y-2'>
        <div className='aspect-2/3 w-full overflow-hidden rounded bg-slate-100'>
          {novel.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={novel.cover}
              alt={novel.title}
              className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
            />
          ) : (
            <div className='flex h-full w-full items-center justify-center p-4 text-center'>
              <span className='font-song text-lg text-slate-400'>
                {novel.title}
              </span>
            </div>
          )}
        </div>
        <div>
          <h3 className='font-song text-lg leading-tight'>{novel.title}</h3>
          {novel.publishedAt && (
            <span className='text-xs text-slate-400'>{novel.publishedAt}</span>
          )}
        </div>
      </Link>
    </li>
  );
}
