# 유메의 블로그

Next.js 16 App Router 기반 개인 블로그입니다. 콘텐츠는 Notion에서 가져와 Cloudflare D1/R2에 캐시하고, 운영자 영역은 Cloudflare Access로 보호합니다.

- 엔드포인트 설계: [`ENDPOINTS.md`](./ENDPOINTS.md)
- 코드 작성 규칙: [`AGENTS.md`](./AGENTS.md)

## 개발

```bash
cp .env.example .env.local   # 값 채우기
pnpm install
pnpm dev
```

Cloudflare Access 애플리케이션을 아직 만들지 않았다면 `.env.local`에 `ADMIN_DEV_BYPASS=true`를 두세요. `NODE_ENV=development`일 때만 동작하므로 프로덕션 빌드에서는 무시됩니다. 이 플래그가 없으면 `/admin`은 로컬에서도 404입니다(fail-closed).

## 배포 전 준비 (Cloudflare Workers)

아직 아무것도 세팅하지 않았습니다. 배포 직전에 아래 순서로 진행합니다.

> **미들웨어 관련 (처리 완료)** — Next 16의 Proxy는 Node.js 런타임 고정이고 `@opennextjs/cloudflare`는 Node 미들웨어를 만나면 빌드를 중단합니다(`Node.js middleware is not currently supported`). 이 때문에 `proxy.ts`를 삭제했고, 빌드 산출물에 `functions["/_middleware"]`가 생성되지 않는 것을 확인했습니다. **미들웨어를 다시 추가하지 마세요.** 인가는 `lib/admin-guard.ts`가 진입점마다 수행합니다.

### 1. Cloudflare Access 애플리케이션 생성

Zero Trust 대시보드 → **Access → Applications → Add an application → Self-hosted**

- Application domain: 블로그 도메인, path: `admin`
- Policy: Action `Allow` / Include → `Emails` → 본인 이메일
- 로그인 수단은 **One-time PIN**이 가장 간단합니다 (OAuth 앱 등록 불필요). Settings → Authentication에서 활성화
- 생성 후 Overview 탭의 **Application Audience (AUD) Tag** 복사

`/api/admin`도 보호해야 하므로 같은 방식으로 하나 더 만듭니다. **AUD 태그는 앱마다 따로 발급됩니다.** 두 값을 쉼표로 이어 `CF_ACCESS_AUD`에 넣으세요. 도메인 전체를 한 앱으로 묶으면 공개 블로그까지 Access 뒤로 들어가니 안 됩니다.

### 2. OpenNext 어댑터 설치

```bash
pnpm add -D @opennextjs/cloudflare wrangler
```

`open-next.config.ts`(`defineCloudflareConfig`)와 `wrangler.jsonc`를 추가하고, `next.config.ts`에 `initOpenNextCloudflareForDev()`를 호출해 로컬 개발에서도 바인딩이 잡히게 합니다.

CLI는 `opennextjs-cloudflare`이고 `build` / `preview` / `deploy` / `upload` / `populate-cache` 서브커맨드를 제공합니다. package.json 스크립트 예시:

```json
"preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
"deploy":  "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
```

`wrangler.jsonc`의 정확한 형태(`main`, `assets`, `compatibility_flags`)는 버전에 따라 바뀌므로 [OpenNext Cloudflare 공식 문서](https://opennext.js.org/cloudflare)를 그 시점에 확인하세요. `compatibility_date`가 6개월 이상 지나면 빌드가 경고를 냅니다.

> 버전 호환은 확인해 뒀습니다. `@opennextjs/cloudflare@1.20.2`의 peer 조건이 `next: >=15.5.21 <16 || >=16.2.11`이고 현재 Next 16.3.0이 이를 만족합니다.

### 3. 환경변수

`wrangler.jsonc`의 `vars`에 넣습니다:

| 이름 | 비고 |
| --- | --- |
| `CF_ACCESS_TEAM_DOMAIN` | `https://<team>.cloudflareaccess.com` |
| `CF_ACCESS_AUD` | 앱이 여러 개면 쉼표로 나열 |
| `ADMIN_ALLOWED_EMAILS` | 쉼표 구분 |

시크릿은 `wrangler secret put`으로 넣습니다 (`NOTION_API_KEY` 등). 어떤 엔드포인트도 이 값을 반환하지 않습니다.

**`ADMIN_DEV_BYPASS`는 프로덕션에 절대 넣지 마세요.** `NODE_ENV=development`와 AND 조건이라 실제로는 무력화되지만, 애초에 존재하지 않는 편이 낫습니다.

세 값 중 하나라도 비면 관리자 접근이 전부 차단됩니다(fail-closed). 배포 후 `/admin`이 404라면 여기부터 확인하세요.

### 4. 배포 후 확인

1. Access 정책을 통과한 세션으로 `/admin` 접근 → 정상 렌더
2. `pnpm build` 출력에서 공개 경로가 `○`(정적)로 남아 있는지 — `ƒ`로 바뀌었으면 회귀입니다
3. **Access를 우회할 수 있는 경로 확인.** `*.workers.dev` 서브도메인이나 프리뷰 URL이 열려 있으면 직접 접근해 404가 나오는지 봅니다. 앱 내부에 JWT 검증을 둔 이유가 정확히 이 시나리오입니다
4. 가능하면 다른 Access 애플리케이션의 JWT로 `/admin`에 접근해 차단되는지 — `aud` 검증이 실제로 도는지 확인하는 유일한 방법입니다

## 참고

- 관리자 페이지 진입점은 푸터의 🔑 링크입니다. 앱 자체 로그인 화면은 없고 Cloudflare Access가 대신 띄웁니다.
- 빌드 시 `Failed to find font override values for font 'Chiron GoRound TC'` 경고가 나오는 것은 정상입니다. Next의 폰트 메트릭 테이블에 이 폰트가 아직 없어서 CLS 보정용 fallback 생성만 건너뛸 뿐, 폰트 자체는 정상 로드됩니다.
