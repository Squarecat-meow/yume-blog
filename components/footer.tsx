import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full px-6 lg:px-36 bg-white z-2 font-sans">
      <hr className="border-slate-400" />
      <div className="py-6 flex items-center justify-between gap-4 text-sm text-slate-400">
        <span>© {new Date().getFullYear()} 유메. All rights reserved.</span>
        {/* Cloudflare Access가 앞단에서 막으므로 노출되어도 무방하다. */}
        <Link
          href="/admin"
          aria-label="관리자 페이지"
          className="transition-opacity opacity-40 hover:opacity-100"
        >
          🔑
        </Link>
      </div>
    </footer>
  );
}
