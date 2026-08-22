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
 * - 표지 (files & media) — 목록에서 책 표지처럼 보여줄 세로 이미지. 여러 장 넣어도 첫 장만 쓴다.
 */
export const PROP_NOVEL = {
  title: '제목',
  slug: '소설 URL',
  status: '상태',
  tags: '태그',
  publishedAt: '발행일',
  summary: '요약',
  featured: '추천',
  cover: '표지',
} as const;

/**
 * 갤러리 DB에 기대하는 속성 이름.
 *
 * - 제목 (title)
 * - 갤러리 URL (url, 고유)
 * - 상태 (select: 초안 | 발행)
 * - 발행일 (Notion의 "마지막 편집 시간" 시스템 속성을 그대로 매핑)
 * - 요약 (rich_text) — 사진 캡션
 * - 컬렉션 (select) — /gallery의 collection 필터용
 * - 사진 (files & media) — 정사각형으로 잘라 보여줄 이미지. 여러 장 넣어도 첫 장만 쓴다.
 */
export const PROP_GALLERY = {
  title: '제목',
  slug: '갤러리 URL',
  status: '상태',
  publishedAt: '발행일',
  summary: '요약',
  collection: '컬렉션',
  photo: '사진',
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
  cover: string | null;
};

export type GalleryItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  collection: string;
  publishedAt: string | null;
  photo: string | null;
};

export type NotionBlock = BlockObjectResponse & {
  children: NotionBlock[];
};

/**
 * 소설 페이지 하위의 챕터(하위 페이지) 하나.
 * 별도 slug 속성이 없으므로 Notion에 정렬된 순서를 그대로 1부터 매겨
 * /novel/[slug]/[index] URL에 쓴다.
 */
export type NovelChapter = {
  id: string;
  title: string;
  index: number;
};
