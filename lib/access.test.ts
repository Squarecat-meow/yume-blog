import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { SignJWT, exportJWK, generateKeyPair, type KeyObject } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Cloudflare Access JWT 검증 테스트.
 *
 * 실제 Access 테넌트 없이 검증하기 위해 로컬에 JWKS 엔드포인트를 띄우고
 * 직접 만든 RSA 키로 토큰을 서명한다. 서명·`iss`·`aud`·`exp`가 실제로
 * 검사되는지를 보는 것이 목적이므로 라이브러리를 목킹하지 않는다.
 */

const ALLOWED_EMAIL = 'yozumina@serafuku.moe';
const AUD_PAGE = 'aud-admin-page';
const AUD_API = 'aud-admin-api';

let server: http.Server;
let issuer: string;
let signingKey: KeyObject;
let attackerKey: KeyObject;
let verifyAccessJwt: typeof import('./access')['verifyAccessJwt'];

beforeAll(async () => {
  const good = await generateKeyPair('RS256');
  const evil = await generateKeyPair('RS256');
  signingKey = good.privateKey as KeyObject;
  attackerKey = evil.privateKey as KeyObject;

  const jwk = {
    ...(await exportJWK(good.publicKey)),
    kid: 'k1',
    alg: 'RS256',
    use: 'sig',
  };

  server = http.createServer((req, res) => {
    if (req.url === '/cdn-cgi/access/certs') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ keys: [jwk] }));
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  issuer = `http://localhost:${(server.address() as AddressInfo).port}`;

  // access.ts는 최초 호출 시점에 환경변수를 읽고 캐시하므로 import보다 먼저 채운다.
  // 애플리케이션을 두 개 등록한 상황을 재현하고, 공백을 섞어 트리밍도 함께 본다.
  process.env.CF_ACCESS_TEAM_DOMAIN = issuer;
  process.env.CF_ACCESS_AUD = `${AUD_PAGE}, ${AUD_API}`;
  process.env.ADMIN_ALLOWED_EMAILS = ALLOWED_EMAIL;
  delete process.env.ADMIN_DEV_BYPASS;

  ({ verifyAccessJwt } = await import('./access'));
});

afterAll(() => {
  server.close();
});

type SignOptions = {
  key?: KeyObject;
  aud?: string;
  expiresIn?: string;
  iss?: string;
};

function sign(
  claims: Record<string, unknown>,
  { key, aud = AUD_PAGE, expiresIn = '5m', iss }: SignOptions = {},
) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(iss ?? issuer)
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key ?? signingKey);
}

describe('verifyAccessJwt', () => {
  it('유효한 토큰의 신원을 반환한다', async () => {
    const token = await sign({ sub: 'u1', email: ALLOWED_EMAIL });
    await expect(verifyAccessJwt(token)).resolves.toMatchObject({
      sub: 'u1',
      email: ALLOWED_EMAIL,
    });
  });

  it('등록된 두 번째 애플리케이션의 aud도 통과시킨다', async () => {
    const token = await sign({ sub: 'u1', email: ALLOWED_EMAIL }, { aud: AUD_API });
    await expect(verifyAccessJwt(token)).resolves.not.toBeNull();
  });

  // 이 검사가 빠지면 같은 팀의 다른 Access 애플리케이션 토큰으로 관리자 영역이 뚫린다.
  it('목록에 없는 aud를 거부한다', async () => {
    const token = await sign(
      { sub: 'u1', email: ALLOWED_EMAIL },
      { aud: 'aud-some-other-app' },
    );
    await expect(verifyAccessJwt(token)).resolves.toBeNull();
  });

  it('JWKS에 없는 키로 서명한 토큰을 거부한다', async () => {
    const token = await sign(
      { sub: 'u1', email: ALLOWED_EMAIL },
      { key: attackerKey },
    );
    await expect(verifyAccessJwt(token)).resolves.toBeNull();
  });

  it('다른 팀 도메인이 발급한 토큰을 거부한다', async () => {
    const token = await sign(
      { sub: 'u1', email: ALLOWED_EMAIL },
      { iss: 'https://someone-else.cloudflareaccess.com' },
    );
    await expect(verifyAccessJwt(token)).resolves.toBeNull();
  });

  it('만료된 토큰을 거부한다', async () => {
    const token = await sign(
      { sub: 'u1', email: ALLOWED_EMAIL },
      { expiresIn: '-1m' },
    );
    await expect(verifyAccessJwt(token)).resolves.toBeNull();
  });

  it('허용 목록에 없는 이메일을 거부한다', async () => {
    const token = await sign({ sub: 'u2', email: 'stranger@example.com' });
    await expect(verifyAccessJwt(token)).resolves.toBeNull();
  });

  it('이메일 대소문자를 구분하지 않는다', async () => {
    const token = await sign({ sub: 'u1', email: ALLOWED_EMAIL.toUpperCase() });
    await expect(verifyAccessJwt(token)).resolves.not.toBeNull();
  });

  // Scheduled Worker가 POST /api/admin/sync를 호출하는 경로.
  it('서비스 토큰은 email 대신 common_name으로 통과시킨다', async () => {
    const token = await sign({ sub: 's1', common_name: 'sync-worker' });
    await expect(verifyAccessJwt(token)).resolves.toMatchObject({
      commonName: 'sync-worker',
    });
  });

  it('토큰이 없으면 거부한다', async () => {
    await expect(verifyAccessJwt(undefined)).resolves.toBeNull();
  });

  it('토큰이 JWT 형식이 아니어도 예외를 던지지 않고 거부한다', async () => {
    await expect(verifyAccessJwt('not-a-jwt')).resolves.toBeNull();
  });
});
