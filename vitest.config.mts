import { defineConfig } from 'vitest/config';

// 서버 측 순수 로직만 테스트하므로 jsdom과 React Testing Library는 두지 않는다.
// async 서버 컴포넌트는 Vitest가 지원하지 않으므로 E2E로 다룬다.
// (node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md)
export default defineConfig({
  // tsconfig.json의 `@/*` 별칭을 그대로 쓴다. Vite 7부터 네이티브 지원이라
  // vite-tsconfig-paths 플러그인은 필요 없다.
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', '.next'],
  },
});
