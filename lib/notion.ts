import { Client, isFullPage } from '@notionhq/client';
import type {
  PageObjectResponse,
  QueryDataSourceParameters,
} from '@notionhq/client/build/src/api-endpoints';

/**
 * 포스트 DB에 기대하는 속성 이름.
 * Notion 쪽 데이터베이스를 이 이름/타입으로 맞춰서 만든다.
 *
 * - Title (title)
 * - Slug (rich_text, 고유)
 * - Status (select: Draft | Published)
 * - Tags (multi_select)
 * - PublishedAt (date)
 * - Summary (rich_text)
 */
const STATUS_PUBLISHED = 'Published';

export type Post = {
  id: string;
  slug: string;
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

function toPost(page: PageObjectResponse): Post | null {
  const { properties } = page;

  const titleProp = properties.Title;
  const slugProp = properties.Slug;
  const summaryProp = properties.Summary;
  const tagsProp = properties.Tags;
  const publishedAtProp = properties.PublishedAt;

  if (titleProp?.type !== 'title' || slugProp?.type !== 'rich_text') {
    return null;
  }

  const title = titleProp.title.map((t) => t.plain_text).join('');
  const slug = slugProp.rich_text.map((t) => t.plain_text).join('');
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
    publishedAtProp?.type === 'date' ? (publishedAtProp.date?.start ?? null) : null;

  return { id: page.id, slug, title, summary, tags, publishedAt };
}

async function queryPosts(
  filter: QueryDataSourceParameters['filter'],
): Promise<Post[]> {
  const client = getClient();
  const dataSourceId = getDataSourceId();

  const response = await client.dataSources.query({
    data_source_id: dataSourceId,
    filter,
    sorts: [{ property: 'PublishedAt', direction: 'descending' }],
  });

  return response.results
    .filter(isFullPage)
    .map(toPost)
    .filter((post): post is Post => post !== null);
}

export async function getPublishedPosts(): Promise<Post[]> {
  return queryPosts({
    property: 'Status',
    select: { equals: STATUS_PUBLISHED },
  });
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const posts = await queryPosts({
    and: [
      { property: 'Status', select: { equals: STATUS_PUBLISHED } },
      { property: 'Slug', rich_text: { equals: slug } },
    ],
  });
  return posts[0] ?? null;
}
