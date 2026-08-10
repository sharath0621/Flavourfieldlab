import { getUserOrRedirect } from '@/lib/supabase/auth';
import { getAIProviderName } from '@/lib/ai/service';
import { signOut } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await getUserOrRedirect();
  const provider = getAIProviderName();

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-faint font-semibold mb-1.5">Settings</div>
      <h1 className="font-serif text-[30px] font-semibold mb-1">Settings</h1>
      <p className="text-ink-soft mb-6">Minimal by design for this MVP — see README for what&apos;s next.</p>

      <div className="bg-paper border border-rule rounded px-5 py-4 mb-4">
        <h3 className="text-xs uppercase tracking-wide font-semibold mb-3">Researcher profile</h3>
        <Row k="Email" v={user.email || '—'} />
        <Row k="User ID" v={user.id} />
        <Row k="Role" v="Beverage researcher" />
      </div>

      <div className="bg-paper border border-rule rounded px-5 py-4 mb-4">
        <h3 className="text-xs uppercase tracking-wide font-semibold mb-3">AI provider</h3>
        <Row k="Active provider" v={provider === 'openai' ? 'OpenAI (live)' : 'Mock (rule-based, offline)'} />
        <Row k="Configure via" v="AI_PROVIDER env var — mock | openai" />
        <Row k="Architecture" v="lib/ai/service.ts — provider-swappable" />
      </div>

      <div className="bg-paper border border-rule rounded px-5 py-4 mb-4">
        <h3 className="text-xs uppercase tracking-wide font-semibold mb-3">Data storage</h3>
        <Row k="Database" v="Supabase Postgres" />
        <Row k="File storage" v="Supabase Storage (field-note-media bucket)" />
        <Row k="Search" v="Postgres full-text search (tsvector)" />
      </div>

      <form action={signOut}>
        <button type="submit" className="text-sm text-ink-soft hover:text-ink underline">
          Sign out
        </button>
      </form>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-rule-soft last:border-b-0 text-[13px]">
      <span className="text-ink-soft">{k}</span>
      <span className="font-semibold text-right break-all pl-4">{v}</span>
    </div>
  );
}
