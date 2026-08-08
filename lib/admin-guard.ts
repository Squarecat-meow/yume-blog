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
 * 실제 인가 지점. proxy는 조기 차단용일 뿐이므로
 * 관리자 데이터에 닿는 모든 페이지·라우트 핸들러·서버 액션이 이 함수를 호출해야 한다.
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

/** 라우트 핸들러용. `ok`가 false면 `response`를 그대로 반환하면 된다. */
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
