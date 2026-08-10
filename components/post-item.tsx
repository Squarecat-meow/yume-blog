import { Post } from "@/lib/notion";

/**
 * 글 리스트에서 포스트를 클릭할 수 있는 단일 아이템.
 * <li>로 시작하기 때문에 별도의 <li> 태그를 안 붙여도 됨
 **/
export default function PostItem({ post }: { post: Post }) {
  return (
    <li className="pb-4 border-b border-slate-400">
      <div className="space-x-2">
        <span className="text-slate-400">{post.category}</span>
        <span className="text-sm text-slate-400">{post.publishedAt}</span>
      </div>
      <h1 className="text-4xl font-song">{post.title}</h1>
      <span className="text-sm text-slate-400">{post.summary}</span>
    </li>
  );
}
