import NovelItem from '@/components/novel-item';
import { getPublishedNovels } from '@/lib/notion';

export default async function Novels() {
  const novels = await getPublishedNovels();

  return (
    <section className='mt-4'>
      <ul className='grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4'>
        {novels.map((n) => (
          <NovelItem key={n.id} novel={n} />
        ))}
      </ul>
    </section>
  );
}
