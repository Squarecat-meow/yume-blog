import { Post } from '@/types/notion';
import Tag from './post-tag';

/**
 * 글 리스트에서 포스트를 클릭할 수 있는 단일 아이템.
 * <li>로 시작하기 때문에 별도의 <li> 태그를 안 붙여도 됨
 **/
export default function PostItem({ post }: { post: Post }) {
  return (
    <li className='flex gap-8 py-6 border-b border-slate-300'>
      <span className='w-11 lg:w-fit text-slate-400'>{post.publishedAt}</span>
      <div className='space-y-2'>
        <h1 className='text-4xl font-song'>{post.title}</h1>
        <h2 className='mb-2 text-sm text-slate-400 break-all'>
          {post.summary}
        </h2>
        <div className='flex items-center gap-3'>
          <span className='text-slate-400'>{post.category}</span>
          {post.tags.map((el, i) => (
            <Tag key={i}>{el}</Tag>
          ))}
        </div>
      </div>
    </li>
  );
}
