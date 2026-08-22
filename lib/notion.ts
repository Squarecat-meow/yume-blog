import { Client, isFullBlock, isFullPage } from '@notionhq/client';
import type {
  PageObjectResponse,
  QueryDataSourceParameters,
} from '@notionhq/client/build/src/api-endpoints';
import { unstable_cache } from 'next/cache';
import { PROP, PROP_NOVEL, STATUS_PUBLISHED } from '@/types/notion';
import type { Novel, NotionBlock, Post } from '@/types/notion';

/**
 * Notion 쪽 편집을 감지해 즉시 무효화하는 웹훅은 없다. 시간 기반으로만 재검증한다.
 * 더 빠른 반영이 필요해지면 이 태그를 기준으로 revalidateTag()를 호출하는
 * 관리자 트리거를 추가한다 (ENDPOINTS.md의 /api/admin/revalidate).
 */
const REVALIDATE_SECONDS = 60 * 5;
const CACHE_TAG = 'notion-posts';
const CACHE_TAG_NOVELS = 'notion-novels';

let cachedClient: Client | null = null;

function getClient(): Client {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error('[notion] NOTION_API_KEY가 설정되어 있지 않습니다.');
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
    throw new Error('[notion] NOTION_DATA_SOURCE_ID가 설정되어 있지 않습니다.');
  }
  return dataSourceId;
}

function getNovelDataSourceId(): string {
  const dataSourceId = process.env.NOTION_NOVEL_DATA_SOURCE_ID;
  if (!dataSourceId) {
    throw new Error(
      '[notion] NOTION_NOVEL_DATA_SOURCE_ID가 설정되어 있지 않습니다.',
    );
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
  const featuredProp = properties[PROP.featured];

  if (titleProp?.type !== 'title' || slugProp?.type !== 'url') {
    return null;
  }

  const title = titleProp.title.map((t) => t.plain_text).join('');
  const slug = slugProp.url ?? '';
  if (!title || !slug) return null;

  const summary =
    summaryProp?.type === 'rich_text'
      ? summaryProp.rich_text.map((t) => t.plain_text).join('')
      : '';
  const tags =
    tagsProp?.type === 'multi_select'
      ? tagsProp.multi_select.map((t) => t.name)
      : [];
  const publishedAt =
    publishedAtProp?.type === 'last_edited_time'
      ? new Date(publishedAtProp.last_edited_time ?? null).toLocaleDateString(
          'ko-KR',
          { timeZone: 'Asia/Seoul' },
        )
      : null;
  const category =
    categoryProp?.type === 'select' ? (categoryProp.select?.name ?? '') : '';
  const featured =
    featuredProp?.type === 'checkbox' ? featuredProp.checkbox : false;

  return {
    id: page.id,
    slug,
    category,
    title,
    summary,
    tags,
    publishedAt,
    featured,
  };
}

function toNovel(page: PageObjectResponse): Novel | null {
  const { properties } = page;

  const titleProp = properties[PROP_NOVEL.title];
  const slugProp = properties[PROP_NOVEL.slug];
  const summaryProp = properties[PROP_NOVEL.summary];
  const tagsProp = properties[PROP_NOVEL.tags];
  const publishedAtProp = properties[PROP_NOVEL.publishedAt];
  const featuredProp = properties[PROP_NOVEL.featured];

  if (titleProp?.type !== 'title' || slugProp?.type !== 'url') {
    return null;
  }

  const title = titleProp.title.map((t) => t.plain_text).join('');
  const slug = slugProp.url ?? '';
  if (!title || !slug) return null;

  const summary =
    summaryProp?.type === 'rich_text'
      ? summaryProp.rich_text.map((t) => t.plain_text).join('')
      : '';
  const tags =
    tagsProp?.type === 'multi_select'
      ? tagsProp.multi_select.map((t) => t.name)
      : [];
  const publishedAt =
    publishedAtProp?.type === 'last_edited_time'
      ? new Date(publishedAtProp.last_edited_time ?? null).toLocaleDateString(
          'ko-KR',
          { timeZone: 'Asia/Seoul' },
        )
      : null;
  const featured =
    featuredProp?.type === 'checkbox' ? featuredProp.checkbox : false;

  return { id: page.id, slug, title, summary, tags, publishedAt, featured };
}

async function queryDataSource<T>(
  dataSourceId: string,
  filter: QueryDataSourceParameters['filter'],
  sortProperty: string,
  mapper: (page: PageObjectResponse) => T | null,
): Promise<T[]> {
  const client = getClient();

  const response = await client.dataSources.query({
    data_source_id: dataSourceId,
    filter,
    sorts: [{ property: sortProperty, direction: 'descending' }],
  });

  return response.results
    .filter(isFullPage)
    .map(mapper)
    .filter((item): item is T => item !== null);
}

async function queryPosts(
  filter: QueryDataSourceParameters['filter'],
): Promise<Post[]> {
  return queryDataSource(getDataSourceId(), filter, PROP.publishedAt, toPost);
}

async function queryNovels(
  filter: QueryDataSourceParameters['filter'],
): Promise<Novel[]> {
  return queryDataSource(
    getNovelDataSourceId(),
    filter,
    PROP_NOVEL.publishedAt,
    toNovel,
  );
}

async function fetchBlockChildren(blockId: string): Promise<NotionBlock[]> {
  const client = getClient();
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
    });

    for (const block of response.results) {
      if (!isFullBlock(block)) continue;
      const children = block.has_children
        ? await fetchBlockChildren(block.id)
        : [];
      blocks.push({ ...block, children });
    }

    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);

  return blocks;
}

export const getPublishedPosts = unstable_cache(
  async (): Promise<Post[]> =>
    queryPosts({
      property: PROP.status,
      select: { equals: STATUS_PUBLISHED },
    }),
  ['notion-published-posts'],
  { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG] },
);

/**
 * 최신 글 count개. getPublishedPosts가 이미 발행일 내림차순으로
 * 캐싱해두므로 여기서는 앞에서부터 자르기만 한다.
 */
export async function getLatestPosts(count = 3): Promise<Post[]> {
  const posts = await getPublishedPosts();
  return posts.slice(0, count);
}

/**
 * "추천" 체크박스가 켜진 글 중 가장 최근에 발행된 것 하나.
 * 여러 개가 체크돼 있어도 queryPosts가 발행일 내림차순으로 정렬해주므로
 * 그중 첫 번째를 고르는 것만으로 최신 글이 뽑힌다.
 */
export const getFeaturedPost = unstable_cache(
  async (): Promise<Post | null> => {
    const posts = await queryPosts({
      and: [
        { property: PROP.status, select: { equals: STATUS_PUBLISHED } },
        { property: PROP.featured, checkbox: { equals: true } },
      ],
    });
    return posts[0] ?? null;
  },
  ['notion-featured-post'],
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
  ['notion-post-by-slug'],
  { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG] },
);

/**
 * 글 본문의 블록 트리. 자식이 있는 블록(리스트, 인용 등)은 재귀적으로
 * children을 채워서 반환한다.
 */
export const getPostBlocks = unstable_cache(
  async (pageId: string): Promise<NotionBlock[]> => fetchBlockChildren(pageId),
  ['notion-post-blocks'],
  { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG] },
);

export const getPublishedNovels = unstable_cache(
  async (): Promise<Novel[]> =>
    queryNovels({
      property: PROP_NOVEL.status,
      select: { equals: STATUS_PUBLISHED },
    }),
  ['notion-published-novels'],
  { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG_NOVELS] },
);

/**
 * 최신 소설 count개. getPublishedNovels가 이미 발행일 내림차순으로
 * 캐싱해두므로 여기서는 앞에서부터 자르기만 한다.
 */
export async function getLatestNovels(count = 3): Promise<Novel[]> {
  const novels = await getPublishedNovels();
  return novels.slice(0, count);
}

/**
 * "추천" 체크박스가 켜진 소설 중 가장 최근에 발행된 것 하나.
 * 여러 개가 체크돼 있어도 queryNovels가 발행일 내림차순으로 정렬해주므로
 * 그중 첫 번째를 고르는 것만으로 최신 글이 뽑힌다.
 */
export const getFeaturedNovel = unstable_cache(
  async (): Promise<Novel | null> => {
    const novels = await queryNovels({
      and: [
        { property: PROP_NOVEL.status, select: { equals: STATUS_PUBLISHED } },
        { property: PROP_NOVEL.featured, checkbox: { equals: true } },
      ],
    });
    return novels[0] ?? null;
  },
  ['notion-featured-novel'],
  { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG_NOVELS] },
);
