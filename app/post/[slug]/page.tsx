import { notFound } from 'next/navigation';
import NotionBlocks from '@/components/notion-blocks';
import { getPostBlocks, getPostBySlug, getPublishedPosts } from '@/lib/notion';

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const blocks = await getPostBlocks(post.id);

  return (
    <article className='max-w-2xl mx-auto py-8'>
      <div className='space-x-2'>
        <span className='text-slate-400'>{post.category}</span>
        {post.publishedAt && (
          <span className='text-sm text-slate-400'>{post.publishedAt}</span>
        )}
      </div>
      <h1 className='font-song text-4xl'>{post.title}</h1>
      <div className='mt-8'>
        <NotionBlocks blocks={blocks} />
      </div>
    </article>
  );
}
