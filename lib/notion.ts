import { Client, isFullPage } from "@notionhq/client";
import type {
  PageObjectResponse,
  QueryDataSourceParameters,
} from "@notionhq/client/build/src/api-endpoints";
import { unstable_cache } from "next/cache";

/**
 * Notion 쪽 편집을 감지해 즉시 무효화하는 웹훅은 없다. 시간 기반으로만 재검증한다.
 * 더 빠른 반영이 필요해지면 이 태그를 기준으로 revalidateTag()를 호출하는
 * 관리자 트리거를 추가한다 (ENDPOINTS.md의 /api/admin/revalidate).
 */
const REVALIDATE_SECONDS = 60 * 5;
const CACHE_TAG = "notion-posts";

/**
 * 포스트 DB에 기대하는 속성 이름.
 * Notion 쪽 데이터베이스를 이 이름/타입으로 맞춰서 만든다.
 *
 * - 제목 (title)
 * - 글 URL (url, 고유)
 * - 상태 (select: 초안 | 발행)
 * - 태그 (multi_select)
 * - 발행일 (date)
 * - 요약 (rich_text)
 */
const PROP = {
  title: "제목",
  category: "카테고리",
  slug: "글 URL",
  status: "상태",
  tags: "태그",
  publishedAt: "발행일",
  summary: "요약",
} as const;

const STATUS_PUBLISHED = "발행";

export type Post = {
  id: string;
  slug: string;
  category: string;
  title: string;
  summary: string;
  tags: string[];
  publishedAt: string | null;
};

let cachedClient: Client | null = null;

function getClient(): Client {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error("[notion] NOTION_API_KEY가 설정되어 있지 않습니다.");
  }

  cachedClient = new Client({ auth: apiKey });
  return cachedClient;
}

/**
 * 2025-09-03 API부터 database와 data source가 분리됐다.
 * 쿼리는 database_id가 아니라 data_source_id로 한다.
 * Notion URL의 database ID를 그대로 쓰면 안 되고,
 * `client.databases.retrieve({ database_id })` 응답의 `data_sources[0].id`로 한 번 조회해서 얻어야 한다.
 */
function getDataSourceId(): string {
  const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;
  if (!dataSourceId) {
    throw new Error("[notion] NOTION_DATA_SOURCE_ID가 설정되어 있지 않습니다.");
  }
  return dataSourceId;
}

function toPost(page: PageObjectResponse): Post | null {
  const { properties } = page;

  const titleProp = properties[PROP.title];
  const slugProp = properties[PROP.slug];
  const summaryProp = properties[PROP.summary];
  const tagsProp = properties[PROP.tags];
  const publishedAtProp = properties[PROP.publishedAt];
  const categoryProp = properties[PROP.category];

  if (titleProp?.type !== "title" || slugProp?.type !== "url") {
    return null;
  }

  const title = titleProp.title.map((t) => t.plain_text).join("");
  const slug = slugProp.url ?? "";
  if (!title || !slug) return null;

  const summary =
    summaryProp?.type === "rich_text"
      ? summaryProp.rich_text.map((t) => t.plain_text).join("")
      : "";
  const tags =
    tagsProp?.type === "multi_select"
      ? tagsProp.multi_select.map((t) => t.name)
      : [];
  const publishedAt =
    publishedAtProp?.type === "last_edited_time"
      ? new Date(publishedAtProp.last_edited_time ?? null).toLocaleDateString(
          "ko-KR",
          { timeZone: "Asia/Seoul" },
        )
      : null;
  const category =
    categoryProp?.type === "select" ? (categoryProp.select?.name ?? "") : "";

  return { id: page.id, slug, category, title, summary, tags, publishedAt };
}

async function queryPosts(
  filter: QueryDataSourceParameters["filter"],
): Promise<Post[]> {
  const client = getClient();
  const dataSourceId = getDataSourceId();

  const response = await client.dataSources.query({
    data_source_id: dataSourceId,
    filter,
    sorts: [{ property: PROP.publishedAt, direction: "descending" }],
  });

  return response.results
    .filter(isFullPage)
    .map(toPost)
    .filter((post): post is Post => post !== null);
}

export const getPublishedPosts = unstable_cache(
  async (): Promise<Post[]> =>
    queryPosts({
      property: PROP.status,
      select: { equals: STATUS_PUBLISHED },
    }),
  ["notion-published-posts"],
  { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG] },
);

export const getPostBySlug = unstable_cache(
  async (slug: string): Promise<Post | null> => {
    const posts = await queryPosts({
      and: [
        { property: PROP.status, select: { equals: STATUS_PUBLISHED } },
        { property: PROP.slug, url: { equals: slug } },
      ],
    });
    return posts[0] ?? null;
  },
  ["notion-post-by-slug"],
  { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG] },
);
