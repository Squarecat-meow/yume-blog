import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

/**
 * Cloudflare Access JWT 검증.
 *
 * Access가 엣지에서 1차로 막아주지만, `*.workers.dev`나 프리뷰 URL처럼
 * Access를 거치지 않는 경로가 열려 있을 수 있으므로 앱에서도 직접 검증한다.
 *
 * 이 모듈은 proxy와 서버 컴포넌트 양쪽에서 임포트되므로
 * `next/headers` 같은 렌더 전용 API에 의존하지 않는다.
 * 서버 컴포넌트·라우트 핸들러용 래퍼는 `@/lib/admin-guard`에 있다.
 */

export const ACCESS_COOKIE = 'CF_Authorization';
const ACCESS_HEADER = 'cf-access-jwt-assertion';

export type AccessIdentity = {
  sub: string;
  /** 사용자 로그인인 경우 */
  email?: string;
  /** 서비스 토큰인 경우 */
  commonName?: string;
};

type AccessConfig = {
  issuer: string;
  /** Access 애플리케이션마다 AUD가 따로 발급되므로 여러 개를 받는다. */
  audience: string[];
  allowedEmails: string[];
  jwks: ReturnType<typeof createRemoteJWKSet>;
};

function parseList(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

let cachedConfig: AccessConfig | null = null;

function normalizeTeamDomain(raw: string): string {
  const withScheme = raw.startsWith('http') ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, '');
}

/** 환경변수가 하나라도 비면 null을 반환해 fail-closed로 동작한다. */
function getConfig(): AccessConfig | null {
  if (cachedConfig) return cachedConfig;

  const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN;
  const audience = parseList(process.env.CF_ACCESS_AUD);
  const allowedEmails = parseList(process.env.ADMIN_ALLOWED_EMAILS).map(
    (entry) => entry.toLowerCase(),
  );

  if (!teamDomain || audience.length === 0 || allowedEmails.length === 0) {
    return null;
  }

  const issuer = normalizeTeamDomain(teamDomain);
  cachedConfig = {
    issuer,
    audience,
    allowedEmails,
    // 모듈 스코프에 두어 JWKS 응답이 요청 간 재사용되도록 한다.
    jwks: createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)),
  };
  return cachedConfig;
}

/**
 * 두 조건을 모두 요구해 프로덕션 빌드에서는 플래그가 켜져 있어도 무력화되게 한다.
 */
function isDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.ADMIN_DEV_BYPASS === 'true'
  );
}

const DEV_IDENTITY: AccessIdentity = {
  sub: 'dev-bypass',
  email: 'dev@localhost',
};

/**
 * Access는 토큰을 헤더와 쿠키 양쪽에 실어 보낸다. 헤더를 우선한다.
 *
 * `Cf-Access-Authenticated-User-Email` 헤더는 쓰지 않는다.
 * Access를 반드시 거쳤다는 보장이 없으면 위조 가능한 평문 헤더다.
 */
export function extractAccessToken(
  headers: Headers,
  cookieValue: string | undefined,
): string | undefined {
  return headers.get(ACCESS_HEADER) ?? cookieValue ?? undefined;
}

export async function verifyAccessJwt(
  token: string | undefined,
): Promise<AccessIdentity | null> {
  if (isDevBypassEnabled()) return DEV_IDENTITY;
  if (!token) return null;

  const config = getConfig();
  if (!config) {
    console.error(
      '[access] CF_ACCESS_TEAM_DOMAIN / CF_ACCESS_AUD / ADMIN_ALLOWED_EMAILS 중 비어 있는 값이 있어 관리자 접근을 차단합니다.',
    );
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, config.jwks, {
      // audience를 빠뜨리면 같은 팀의 다른 Access 애플리케이션 토큰으로도 통과된다.
      // 배열을 넘기면 그중 하나와 일치할 때만 통과한다.
      issuer: config.issuer,
      audience: config.audience,
      algorithms: ['RS256'],
    });
    return toIdentity(payload, config.allowedEmails);
  } catch {
    return null;
  }
}

function toIdentity(
  payload: JWTPayload,
  allowedEmails: string[],
): AccessIdentity | null {
  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  const email =
    typeof payload.email === 'string' ? payload.email.toLowerCase() : undefined;
  const commonName =
    typeof payload.common_name === 'string' ? payload.common_name : undefined;

  // 서비스 토큰은 email 없이 common_name만 담는다. AUD 검증은 이미 통과한 상태다.
  if (!email) {
    if (!commonName) return null;
    return { sub: sub || commonName, commonName };
  }

  if (!allowedEmails.includes(email)) return null;
  return { sub: sub || email, email };
}
