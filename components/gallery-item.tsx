import Link from 'next/link';
import { GalleryItem } from '@/types/notion';

export default function GalleryItemThumb({ item }: { item: GalleryItem }) {
  return (
    <li>
      <Link href={`/gallery/${item.slug}`} className='group block'>
        <div className='aspect-square w-full overflow-hidden bg-slate-100'>
          {item.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.photo}
              alt={item.title}
              className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
            />
          ) : (
            <div className='flex h-full w-full items-center justify-center p-2 text-center'>
              <span className='text-xs text-slate-400'>{item.title}</span>
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}
