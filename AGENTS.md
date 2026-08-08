<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 배포 대상: Cloudflare Workers

**아직 구현하지 않았습니다.** 배포 직전에 `@opennextjs/cloudflare` 어댑터와 `wrangler.jsonc`를 추가할 예정입니다. 그때까지 `next build` 결과물은 Workers에 그대로 올라가지 않습니다. 어댑터가 없다는 이유로 임의로 추가하지 마세요.

버전 호환은 확인해 뒀습니다. `@opennextjs/cloudflare@1.20.2`의 peer 조건이 `next: >=15.5.21 <16 || >=16.2.11`이고 현재 Next 16.3.0이 이를 만족합니다.

**`proxy.ts`(미들웨어)를 다시 만들지 마세요.** Next 16의 Proxy는 Node.js 런타임 고정인데 OpenNext는 Node 미들웨어를 만나면 빌드를 중단합니다. 이 때문에 한 번 만들었다가 삭제했습니다. 인가는 `lib/admin-guard.ts`가 진입점마다 수행하므로 미들웨어가 필요 없습니다.

## 순수 정적 내보내기는 불가능합니다

`output: 'export'`를 켜지 마세요. `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`의 미지원 목록에 이 프로젝트가 쓰는 Cookies, Request 기반 Route Handler, Server Actions가 들어 있습니다. D1 조회와 Notion 동기화도 서버를 요구합니다.

실제 구성은 하이브리드입니다. 공개 페이지는 정적 에셋으로 엣지에서 서빙되고 `/admin`과 `/api/admin/*`만 Worker가 실행합니다. `next build` 출력의 `○`(정적) / `ƒ`(동적) 표시로 확인하세요. **공개 경로가 `ƒ`로 바뀌면 회귀입니다.**

## 지금부터 지켜야 할 제약

나중에 어댑터를 붙일 때 되돌리는 일이 없도록, 서버 코드는 workerd에서 도는 것을 전제로 작성합니다.

- `node:` 내장 모듈을 import하지 않습니다. 암호 연산은 WebCrypto 기반 라이브러리(`jose`)를 씁니다.
- `process.env`는 모듈 최상단이 아니라 함수 안에서 읽습니다. Workers는 전역 스코프에서 환경 바인딩 접근을 막습니다. `lib/access.ts`의 `getConfig()`가 이 패턴입니다.
- 전역 스코프에서 `fetch` 등 I/O를 하지 않습니다. 지연 초기화하세요. `createRemoteJWKSet`은 호출 시점이 아니라 첫 검증 때 네트워크를 씁니다.
- 루트 레이아웃(`app/layout.tsx`)에서 `cookies()`나 `headers()`를 호출하지 않습니다. 사이트 전체가 동적 렌더링으로 전환되어 정적 에셋의 이점이 사라집니다. 네비게이션에 로그인 상태를 반영하고 싶다는 이유로 이걸 도입하려 한 적이 있는데, 대신 푸터에 무조건 노출되는 링크를 두는 쪽으로 정리했습니다.

## 환경변수

`CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, `ADMIN_ALLOWED_EMAILS`는 wrangler `vars`로, `NOTION_API_KEY`는 `wrangler secret`으로 넣습니다. 전체 목록과 설명은 `.env.example`에 있습니다.

# 관리자 인증

Cloudflare Access가 엣지에서 1차로 막고, 앱이 JWT를 다시 검증하는 2계층입니다. 어느 한쪽만으로 끝내지 마세요.

앱 전체를 덮는 인가 계층은 없습니다. **관리자 데이터에 닿는 모든 진입점이 각자 `lib/admin-guard.ts`를 호출해야 합니다.** 라우트 핸들러는 `withAdmin()`, 페이지·서버 액션은 `requireAdmin()`입니다. 구체적인 규칙은 `ENDPOINTS.md`의 「구현 메모」를 따릅니다.
