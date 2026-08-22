import Featured from '@/components/featured';
import LatestPost from '@/components/latest-post';
import Sidebar from '@/components/sidebar';
import {
  getFeaturedNovel,
  getFeaturedPost,
  getLatestNovels,
  getLatestPosts,
} from '@/lib/notion';

export default async function Home() {
  const [featuredPost, featuredNovel] = await Promise.all([
    getFeaturedPost(),
    getFeaturedNovel(),
  ]);
  const [latestPost, latestNovel] = await Promise.all([
    getLatestPosts(),
    getLatestNovels(),
  ]);

  return (
    <section className='mt-4 grid grid-cols-1 lg:grid-cols-4 gap-8'>
      <Sidebar />
      <article className='col-span-3 space-y-6'>
        <Featured post={featuredPost} novel={featuredNovel} />
        <LatestPost post={latestPost} novel={latestNovel} />
      </article>
    </section>
  );
}
