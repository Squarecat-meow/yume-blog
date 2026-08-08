import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * 가드 누락 검사.
 *
 * `proxy.ts`를 지우면서 `/admin/*`과 `/api/admin/*`을 한 번에 막아주던 matcher가 사라졌다.
 * 이제는 진입점마다 각자 가드를 호출해야 하고, 하나라도 빠뜨리면 그 경로만 조용히 열린다.
 * 이 테스트가 그 그물을 대신한다.
 */

const ROOT = path.join(import.meta.dirname, '..');

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const relative = (file: string) => path.relative(ROOT, file);
const read = (file: string) => fs.readFileSync(file, 'utf-8');

describe('관리자 라우트 핸들러', () => {
  const handlers = walk(path.join(ROOT, 'app/api/admin')).filter((file) =>
    /route\.tsx?$/.test(file),
  );

  it.each(handlers.map(relative))(
    '%s 가 withAdmin() 또는 requireAdminApi()를 호출한다',
    (rel) => {
      const source = read(path.join(ROOT, rel));
      // 이름 언급이 아니라 호출을 본다. `import { withAdmin }`만 있고
      // 실제로 부르지 않는 경우를 잡아내야 한다.
      expect(/\b(withAdmin|requireAdminApi)\s*\(/.test(source)).toBe(true);
    },
  );

  it('검사 대상을 찾는 로직이 살아 있다', () => {
    // 라우트가 아직 없어도 통과하지만, 경로 규칙이 바뀌어 조용히 0건이 되는 것과
    // 실제로 0건인 것을 구분하기 위해 디렉터리 존재 여부를 함께 남긴다.
    const dir = path.join(ROOT, 'app/api/admin');
    expect(fs.existsSync(dir) ? handlers.length > 0 : true).toBe(true);
  });
});

describe('관리자 페이지', () => {
  const pages = walk(path.join(ROOT, 'app/admin')).filter((file) =>
    /page\.tsx?$/.test(file),
  );

  it('최소 한 개 이상 존재한다', () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  it.each(pages.map(relative))('%s 가 requireAdmin()을 호출한다', (rel) => {
    // 이름 언급이 아니라 호출을 본다. import만 남기고 호출을 지우는 실수를 잡는다.
    expect(/\brequireAdmin\s*\(/.test(read(path.join(ROOT, rel)))).toBe(true);
  });

  // 프리렌더된 응답이 캐시에서 나가면 검증 코드가 아예 실행되지 않는다.
  it.each(pages.map(relative))(
    "%s 가 dynamic = 'force-dynamic'을 선언한다",
    (rel) => {
      const source = read(path.join(ROOT, rel));
      expect(/export const dynamic\s*=\s*['"]force-dynamic['"]/.test(source)).toBe(
        true,
      );
    },
  );
});

describe('미들웨어', () => {
  // Next 16의 Proxy는 Node.js 런타임 고정이고 @opennextjs/cloudflare는 이를 거부한다.
  // 되살아나면 Cloudflare 배포가 빌드 단계에서 막힌다.
  it.each(['proxy.ts', 'proxy.js', 'middleware.ts', 'middleware.js'])(
    '%s 가 존재하지 않는다',
    (name) => {
      expect(fs.existsSync(path.join(ROOT, name))).toBe(false);
      expect(fs.existsSync(path.join(ROOT, 'src', name))).toBe(false);
    },
  );
});
