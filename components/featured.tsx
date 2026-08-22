import Link from 'next/link';
import { Novel, Post } from '@/types/notion';

/**
 * 각 콘텐츠 타입의 최신 글을 대표로 보여주는 카드.
 * 해당 타입에 발행된 글이 없으면 렌더링하지 않는다.
 */
function FeaturedCard({
  emoji,
  label,
  href,
  title,
  summary,
  publishedAt,
}: {
  emoji: string;
  label: string;
  href: string;
  title: string;
  summary: string;
  publishedAt: string | null;
}) {
  return (
    <Link
      href={href}
      className='block pb-4 space-y-2 border-b border-slate-500'
    >
      <div className='space-x-2'>
        <span className='text-slate-400'>
          {emoji} {label}
        </span>
        {publishedAt && (
          <span className='text-xs text-slate-400'>{publishedAt}</span>
        )}
      </div>
      <h2 className='text-4xl font-song'>{title}</h2>
      <span className='text-sm text-slate-400'>{summary}</span>
    </Link>
  );
}

export default function Featured({
  post,
  novel,
}: {
  post: Post | null;
  novel: Novel | null;
}) {
  if (!post && !novel) return null;

  return (
    <section>
      {post && (
        <FeaturedCard
          emoji='✨'
          label='Featured Post'
          href={`/post/${post.slug}`}
          title={post.title}
          summary={post.summary}
          publishedAt={post.publishedAt}
        />
      )}
      {novel && (
        <FeaturedCard
          emoji='📚'
          label='Featured Novel'
          href={`/novel/${novel.slug}`}
          title={novel.title}
          summary={novel.summary}
          publishedAt={novel.publishedAt}
        />
      )}
    </section>
  );
}
