import { requireAdmin } from '@/lib/admin-guard';

// 프리렌더된 정적 응답이 캐시에서 나가면 검증 코드가 아예 실행되지 않는다.
export const dynamic = 'force-dynamic';

export default async function Admin() {
  const identity = await requireAdmin();

  return (
    <section className="flex-1 flex flex-col items-center justify-center py-2">
      <h1 className="font-song text-3xl mb-4">관리자 페이지</h1>
      <p className="text-sm text-slate-400">
        {identity.email ?? identity.commonName}
      </p>
    </section>
  );
}
