import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { ACCESS_COOKIE, extractAccessToken, verifyAccessJwt } from '@/lib/access';

/**
 * 관리자 영역 조기 차단.
 *
 * 이것만으로 인가가 끝나지 않는다. Next.js 문서가 proxy를 인가 수단으로 쓰지 말라고
 * 명시하고 있고 미들웨어 우회 전례(CVE-2025-29927)도 있으므로,
 * 실제 인가는 각 페이지·라우트 핸들러의 `@/lib/admin-guard`가 담당한다.
 */
export async function proxy(req: NextRequest) {
  const token = extractAccessToken(
    req.headers,
    req.cookies.get(ACCESS_COOKIE)?.value,
  );

  if (await verifyAccessJwt(token)) {
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // 미인증자에게 관리자 경로의 존재를 알리지 않는다.
  return new NextResponse(null, { status: 404 });
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
