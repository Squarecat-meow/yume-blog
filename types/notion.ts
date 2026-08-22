import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';

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
 * - 추천 (checkbox) — 메인 화면 featured 노출 여부. 여러 개 체크돼 있으면 그중 가장 최근 글을 쓴다.
 */
export const PROP = {
  title: '제목',
  category: '카테고리',
  slug: '글 URL',
  status: '상태',
  tags: '태그',
  publishedAt: '발행일',
  summary: '요약',
  featured: '추천',
} as const;

/**
 * 소설 DB에 기대하는 속성 이름. Post와 동일한 구조이되 카테고리는 없다.
 *
 * - 제목 (title)
 * - 소설 URL (url, 고유)
 * - 상태 (select: 초안 | 발행)
 * - 태그 (multi_select)
 * - 발행일 (Notion의 "마지막 편집 시간" 시스템 속성을 그대로 매핑)
 * - 요약 (rich_text)
 * - 추천 (checkbox) — 메인 화면 featured 노출 여부. 여러 개 체크돼 있으면 그중 가장 최근 글을 쓴다.
 */
export const PROP_NOVEL = {
  title: '제목',
  slug: '소설 URL',
  status: '상태',
  tags: '태그',
  publishedAt: '발행일',
  summary: '요약',
  featured: '추천',
} as const;

export const STATUS_PUBLISHED = '발행';

export type Post = {
  id: string;
  slug: string;
  category: string;
  title: string;
  summary: string;
  tags: string[];
  publishedAt: string | null;
  featured: boolean;
};

export type Novel = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  publishedAt: string | null;
  featured: boolean;
};

export type NotionBlock = BlockObjectResponse & {
  children: NotionBlock[];
};
