import { Novel, Post } from '@/types/notion';
import PostItem from './post-item';
export default function LatestPost({
  post,
  novel,
}: {
  post: Post[] | null;
  novel: Novel[] | null;
}) {
  if (!post && !novel) return null;

  return (
    <section>
      <h3 className='text-slate-600'>최신 글</h3>
      <ul>{post && post.map((el) => <PostItem key={el.id} post={el} />)}</ul>
    </section>
  );
}
