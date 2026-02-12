'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // evita “pantalla a medio cargar” mientras se resuelve la sesión
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;

      if (data.session) {
        router.replace('/expedientes'); // replace evita volver al login con back
        return;
      }

      setChecking(false);
    });

    return () => {
      alive = false;
    };
  }, [router]);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      if (error.message === 'Invalid login credentials') {
        setErr('Email o contraseña incorrecta');
      } else {
        setErr(error.message);
      }
      return;
    }

    router.replace('/expedientes');
  }

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center px-4 main-login">
        <div className="text-sm text-zinc-500 cargando-login">Cargando…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 main-login">
      <div className="w-full max-w-[420px] rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm shadow-login">
        <div className="mb-5">
          <div className="text-xs font-medium text-zinc-500 margin-bottom-10 login-head">Control de Expedientes - Infraestructura</div>
          <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
        </div>

        <form onSubmit={onLogin} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-zinc-600">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>

          {err ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-[var(--brand-900)] px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}