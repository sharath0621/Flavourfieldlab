'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/field-notes', label: 'Field Notes', icon: '✎' },
  { href: '/ingredients', label: 'Ingredients', icon: '❦' },
  { href: '/research', label: 'Research', icon: '◔' },
  { href: '/rd', label: 'R&D Opportunities', icon: '◆' },
  { href: '/map', label: 'Map', icon: '⚲' },
  { href: '/settings', label: 'Settings', icon: '⚙' }
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-[230px] shrink-0 bg-bg-alt border-r border-rule px-[18px] py-[22px] sticky top-0 h-screen flex flex-col">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-[26px] h-[26px] border-[1.5px] border-ink rounded-full relative" />
        <div className="font-serif font-semibold text-[15.5px] tracking-wide">Flavour Field Lab</div>
      </div>
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink-faint ml-[34px] mb-[26px]">Field research OS</div>
      <nav className="flex flex-col gap-0.5">
        {LINKS.map((link) => {
          const active = pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded text-[13px] font-medium uppercase tracking-wide text-ink-soft',
                active ? 'bg-paper text-rust shadow-[inset_2px_0_0_theme(colors.rust)]' : 'hover:bg-paper hover:text-ink'
              )}
            >
              <span className="w-4 text-center text-[13px] opacity-85">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-4 border-t border-rule text-[11px] text-ink-faint">
        <span className="inline-block text-[9.5px] tracking-[0.1em] font-bold text-rust bg-rust-bg px-1.5 py-0.5 rounded-sm mb-1.5">
          MVP 01
        </span>
        <br />
        Capture → Understand → Research → Discover
      </div>
    </aside>
  );
}
