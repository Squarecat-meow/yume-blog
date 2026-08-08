import 'server-only';

import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import {
  ACCESS_COOKIE,
  extractAccessToken,
  verifyAccessJwt,
  type AccessIdentity,
} from '@/lib/access';

/**
 * 관리자 영역의 유일한 인가 지점.
 *
 * Cloudflare Access가 엣지에서 1차로 막지만 Access를 거치지 않는 경로가 열려 있을 수 있으므로
 * 앱에서도 직접 검증한다. 관리자 데이터에 닿는 모든 페이지·라우트 핸들러·서버 액션이
 * 각자 여기를 호출해야 한다. 한 곳에 몰아서 막아주는 계층은 없다.
 *
 * `app/admin/layout.tsx`에서 한 번에 처리하려는 시도는 하지 말 것.
 * Partial Rendering 때문에 하위 세그먼트가 그대로 실행되고 RSC 페이로드에 데이터가 실린다.
 * (`node_modules/next/dist/docs/01-app/02-guides/authentication.md` 「Layouts and auth checks」)
 */

/** 한 번의 렌더 패스에서 JWT를 중복 검증하지 않도록 메모이즈한다. */
const getAdminIdentity = cache(async (): Promise<AccessIdentity | null> => {
  const [headerList, cookieStore] = await Promise.all([headers(), cookies()]);
  const token = extractAccessToken(
    headerList,
    cookieStore.get(ACCESS_COOKIE)?.value,
  );
  return verifyAccessJwt(token);
});

/**
 * 서버 컴포넌트 / 서버 액션용.
 *
 * 앱에 로그인 개념이 없고 미인증자에게 `/admin`의 존재를 알릴 이유도 없으므로
 * 리다이렉트가 아니라 404를 낸다.
 */
export async function requireAdmin(): Promise<AccessIdentity> {
  const identity = await getAdminIdentity();
  if (!identity) notFound();
  return identity;
}

type AdminApiResult =
  | { ok: true; identity: AccessIdentity }
  | { ok: false; response: Response };

/**
 * 라우트 핸들러용 저수준 API. `ok`가 false면 `response`를 그대로 반환하면 된다.
 * 대부분의 경우 `withAdmin()`을 쓰는 편이 낫다.
 */
export async function requireAdminApi(): Promise<AdminApiResult> {
  const identity = await getAdminIdentity();
  if (!identity) {
    return {
      ok: false,
      response: Response.json({ error: 'forbidden' }, { status: 403 }),
    };
  }
  return { ok: true, identity };
}

type AdminRouteHandler<TContext> = (
  request: Request,
  context: TContext,
  identity: AccessIdentity,
) => Response | Promise<Response>;

/**
 * `/api/admin/*` 라우트 핸들러를 감싼다. 검증을 통과해야만 핸들러가 실행되고,
 * 통과한 신원이 세 번째 인자로 넘어온다.
 *
 * 가드 호출을 잊는 실수를 구조적으로 막기 위한 기본형이다.
 *
 * ```ts
 * export const POST = withAdmin(async (req, _ctx, identity) => {
 *   return Response.json({ syncedBy: identity.email });
 * });
 * ```
 */
export function withAdmin<TContext>(handler: AdminRouteHandler<TContext>) {
  return async (request: Request, context: TContext): Promise<Response> => {
    const auth = await requireAdminApi();
    if (!auth.ok) return auth.response;
    return handler(request, context, auth.identity);
  };
}
