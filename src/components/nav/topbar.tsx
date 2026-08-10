'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function Topbar() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/field-notes?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="flex items-center gap-3.5 px-7 py-3.5 border-b border-rule bg-paper sticky top-0 z-20">
      <form onSubmit={onSearch} className="flex-1 max-w-[420px] relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint text-sm">⌕</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ingredients, locations, farmers, flavour, R&D…"
          className="w-full pl-8 pr-3 py-2.5 border border-rule rounded-full bg-bg text-sm text-ink"
        />
      </form>
      <Button variant="rust" onClick={() => router.push('/field-notes/new')}>
        + Capture Field Note
      </Button>
    </div>
  );
}
