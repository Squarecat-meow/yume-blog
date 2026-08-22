import GalleryItemThumb from '@/components/gallery-item';
import { getPublishedGalleryItems } from '@/lib/notion';

export default async function Gallery() {
  const items = await getPublishedGalleryItems();

  return (
    <section>
      <ul className='grid grid-cols-4 gap-1'>
        {items.map((item) => (
          <GalleryItemThumb key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
