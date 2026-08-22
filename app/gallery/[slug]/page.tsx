import { notFound } from 'next/navigation';
import { getGalleryItemBySlug, getPublishedGalleryItems } from '@/lib/notion';

export async function generateStaticParams() {
  const items = await getPublishedGalleryItems();
  return items.map((item) => ({ slug: item.slug }));
}

export default async function GalleryItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getGalleryItemBySlug(slug);
  if (!item) notFound();

  return (
    <article className='max-w-2xl mx-auto py-8'>
      <div className='overflow-hidden rounded bg-slate-100'>
        {item.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photo} alt={item.title} className='w-full' />
        ) : (
          <div className='flex aspect-square w-full items-center justify-center p-4 text-center'>
            <span className='font-song text-lg text-slate-400'>
              {item.title}
            </span>
          </div>
        )}
      </div>
      <div className='mt-4 space-y-2'>
        <div className='space-x-2'>
          {item.collection && (
            <span className='text-slate-400'>{item.collection}</span>
          )}
          {item.publishedAt && (
            <span className='text-sm text-slate-400'>{item.publishedAt}</span>
          )}
        </div>
        <h1 className='font-song text-3xl'>{item.title}</h1>
        {item.summary && <p className='text-slate-600'>{item.summary}</p>}
      </div>
    </article>
  );
}
