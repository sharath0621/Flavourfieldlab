import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm bg-paper border border-rule rounded p-8 shadow-card">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 border-[1.5px] border-ink rounded-full" />
          <div className="font-serif font-semibold text-lg">Flavour Field Lab</div>
        </div>
        <p className="text-sm text-ink-soft mb-6">Sign in to your field research OS.</p>
        <LoginForm />
      </div>
    </div>
  );
}
