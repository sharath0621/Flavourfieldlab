'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Field, Input, Label } from '@/components/ui/form-controls';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    });
    if (error) {
      setErrorMsg(error.message);
      setStatus('error');
    } else {
      setStatus('sent');
    }
  }

  if (status === 'sent') {
    return (
      <div className="text-center">
        <p className="text-sm text-ink-soft">
          Check <strong>{email}</strong> for a sign-in link.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </Field>
      <Button type="submit" variant="rust" className="w-full justify-center" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending link…' : 'Send magic link'}
      </Button>
      {status === 'error' && <p className="text-xs text-conf-low mt-2">{errorMsg}</p>}
    </form>
  );
}
