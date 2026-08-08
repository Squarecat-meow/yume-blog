import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  return NextResponse.redirect(new URL('/login', req.url));
}

export const config = {
  matcher: ['/admin/:path*'],
};
