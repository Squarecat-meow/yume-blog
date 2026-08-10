import PostItem from "@/components/post-item";
import { getPublishedPosts } from "@/lib/notion";

export default async function Posts() {
  const posts = await getPublishedPosts();

  return (
    <section>
      <ul>
        {posts.map((p) => (
          <PostItem key={p.id} post={p} />
        ))}
      </ul>
    </section>
  );
}
