import { getUserOrRedirect } from '@/lib/supabase/auth';
import { Sidebar } from '@/components/nav/sidebar';
import { Topbar } from '@/components/nav/topbar';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await getUserOrRedirect();

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
