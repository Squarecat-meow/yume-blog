'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home', emoji: '🏠' },
    { href: '/post', label: 'Post', emoji: '📝' },
    { href: '/novel', label: 'Novel', emoji: '📚' },
    { href: '/gallery', label: 'Gallery', emoji: '🖼️' },
    { href: '/contact', label: 'Contact', emoji: '📞' },
  ];

  return (
    <nav className="font-sans">
      <ul className="flex items-center gap-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group relative flex items-center gap-1"
              >
                <div
                  className={`transition-all duration-300 ${
                    isActive
                      ? 'opacity-100 translate-x-0 rotate-0'
                      : 'opacity-0 translate-x-1/2 rotate-90 group-hover:opacity-100 group-hover:translate-0 group-hover:rotate-0'
                  }`}
                >
                  {item.emoji}
                </div>
                <span
                  className={
                    isActive ? 'font-semibold text-black' : 'text-gray-600'
                  }
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
        <li>
          <Link href={'/login'}>🔑</Link>
        </li>
      </ul>
    </nav>
  );
}
