import { Sidebar } from '@/components/nav/sidebar';
import { Topbar } from '@/components/nav/topbar';

export const dynamic = 'force-dynamic';

// Public access mode — no session guard. Anyone with the link lands straight
// in the workspace (see lib/supabase/auth.ts for the trade-offs).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Topbar />
        <div className="px-8 py-7 pb-20 max-w-[1180px]">{children}</div>
      </div>
    </div>
  );
}
