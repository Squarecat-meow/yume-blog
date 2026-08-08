# Yume Blog 엔드포인트 목록

## 기본 원칙

- 공개 콘텐츠는 Notion API를 직접 호출하지 않고 로컬 캐시에서 읽습니다.
- `/admin/*` 및 `/api/admin/*`은 사이트 운영자만 접근하도록 Cloudflare Access로 보호합니다.
- `NOTION_API_KEY`는 Cloudflare Worker Secret으로만 관리하며, 어떤 엔드포인트도 이를 반환하지 않습니다.
- 캐시할 수 있는 공개 응답에는 별도 갱신 요구가 없다면 `Cache-Control: public, max-age=60, s-maxage=300`을 설정합니다.

## 페이지 경로

| 메서드 | 경로 | 용도 |
| --- | --- | --- |
| GET | `/` | 대표 글, 최신 글, 사이트 소개를 표시하는 루트 페이지입니다. |
| GET | `/novel` | 소설 목록 페이지입니다. |
| GET | `/novel/[slug]` | 한 작품의 상세 정보와 챕터 목록을 표시합니다. |
| GET | `/novel/[slug]/[chapter]` | 소설의 개별 챕터를 표시합니다. |
| GET | `/post` | 페이지네이션 및 태그 필터를 지원할 수 있는 포스트 목록입니다. |
| GET | `/post/[slug]` | 개별 포스트를 표시합니다. |
| GET | `/gallery` | 컬렉션 필터를 지원할 수 있는 갤러리 목록입니다. |
| GET | `/gallery/[slug]` | 공유 가능한 상세 페이지가 필요할 때 사용하는 갤러리 항목 페이지입니다. |
| GET | `/contact` | 문의 양식 페이지입니다. |
| GET | `/admin` | Cloudflare Access로 보호되는 운영자 대시보드입니다. |

## 공개 API 경로

서버 컴포넌트는 D1을 직접 조회할 수 있습니다. 아래 엔드포인트는 클라이언트 측 로딩, 페이지네이션, 필터링이 필요할 때만 사용합니다.

| 메서드 | 경로 | 쿼리/본문 | 용도 |
| --- | --- | --- | --- |
| GET | `/api/home` | 없음 | 대표 항목, 최신 포스트, 사이트 메타데이터 등 루트 페이지의 콘텐츠를 반환합니다. |
| GET | `/api/novels` | `page`, `limit`, `status` | 발행된 소설 요약 목록을 반환합니다. |
| GET | `/api/novels/[slug]` | 없음 | 발행된 소설과 챕터 메타데이터를 반환합니다. |
| GET | `/api/novels/[slug]/chapters/[chapter]` | 없음 | 발행된 개별 챕터를 반환합니다. |
| GET | `/api/posts` | `page`, `limit`, `tag` | 발행된 포스트 요약 목록을 반환합니다. |
| GET | `/api/posts/[slug]` | 없음 | 발행된 개별 포스트를 반환합니다. |
| GET | `/api/gallery` | `page`, `limit`, `collection` | 발행된 갤러리 항목 요약 목록을 반환합니다. |
| GET | `/api/gallery/[slug]` | 없음 | 상세 페이지를 제공하는 경우 발행된 갤러리 항목을 반환합니다. |
| POST | `/api/contact` | `name`, `email`, `message`, `turnstileToken` | 문의를 검증하고 기록하거나 전송합니다. Cloudflare Turnstile 및 rate limiting을 적용합니다. |

## 운영자 API 경로

이 절의 모든 경로에는 유효한 Cloudflare Access 세션이 필요합니다. 운영자가 한 명이라면 애플리케이션 차원의 계정, 비밀번호, 세션 테이블은 필요하지 않습니다.

| 메서드 | 경로 | 본문 | 용도 |
| --- | --- | --- | --- |
| GET | `/api/admin/status` | 없음 | 마지막 동기화 시간, 캐시된 콘텐츠 수, 최근 동기화 오류를 표시합니다. |
| POST | `/api/admin/sync` | 선택 `contentType`: `all`, `novel`, `post`, `gallery` | 변경된 Notion 페이지를 가져와 D1/R2 캐시를 갱신합니다. |
| POST | `/api/admin/publish` | `contentType`, `slug`, `published` | Notion 인증 정보를 노출하지 않고 캐시된 콘텐츠의 발행 상태를 명시적으로 변경합니다. |
| POST | `/api/admin/revalidate` | 선택 `path` | 콘텐츠 변경 후 관련 Cloudflare 캐시를 무효화하거나 갱신합니다. D1과 별개로 CDN 응답 캐시를 둘 때만 추가합니다. |
| GET | `/api/admin/content/[contentType]` | `page`, `limit`, `status` | 초안과 동기화 상태를 포함한 캐시 콘텐츠를 대시보드에 목록으로 제공합니다. |
| PATCH | `/api/admin/content/[contentType]/[slug]` | `published`, 선택 메타데이터 재정의 | Notion 외부에서 로컬 발행 메타데이터를 관리하기로 한 경우 이를 변경합니다. |

## 초기에는 불필요한 경로

- `/api/auth/*`: Cloudflare Access가 운영자 영역을 보호합니다.
- `/api/notion/*`: 브라우저에 범용 Notion 프록시 엔드포인트를 노출하지 않습니다.
- 공개 비밀 키를 사용하는 `/api/revalidate`: Access로 보호한 운영자 동작을 사용합니다.
- 회원가입, 비밀번호 재설정, 로그아웃: 애플리케이션 수준의 사용자 계정 시스템이 없습니다.

## 구현 메모

- 발행 상태, 슬러그, 날짜, 태그, Notion 페이지 ID는 D1에 보관합니다.
- D1 행 크기나 조회 패턴상 필요할 때만 렌더링된 대용량 본문 및 이미지 메타데이터를 R2에 보관합니다. 소규모 개인 블로그는 D1부터 시작합니다.
- 자동 동기화가 필요하면 Scheduled Worker Trigger에서 `POST /api/admin/sync`와 같은 동기화 서비스를 호출합니다. Scheduled Trigger는 공개 HTTP 엔드포인트가 아닙니다.
