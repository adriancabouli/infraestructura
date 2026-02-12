'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

function NavItem({ href, label }: { href: string; label: string }) {
  const path = usePathname();

  const active =
    path === href ||
    (href !== '/expedientes' && path.startsWith(href + '/'));

  return (
    <Link
      href={href}
      className={
        'block rounded-lg px-4 py-2 text-sm transition ' +
        (active
          ? 'bg-[var(--brand-900)] text-white'
          : 'text-zinc-700 hover:bg-zinc-100')
      }
    >
      {label}
    </Link>
  );
}

export default function AppShell({
    title,
    right,
    children,
  }: {
    title: string;
    right?: React.ReactNode;
    children: React.ReactNode;
  }) {
    
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user;
        if (!user) return;

        setUserName(
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          null
        );
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen">
      <div className="mx-auto px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-4">
              <div className="text-xs font-medium text-zinc-500">
                {userName ? `Bienvenido/a` : 'Sistema'}
              </div>
              <div className="text-lg font-semibold name">
                {userName ?? 'Infraestructura'}
              </div>
            </div>

            <nav className="space-y-1">
              <NavItem href="/expedientes" label="Expedientes" />
              <NavItem href="/expedientes/nuevo" label="Nuevo expediente" />
            </nav>
          </aside>

          <main className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-zinc-500">Infraestructura - CSJN</div>
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              </div>
              <div className="flex items-center gap-2">{right}</div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}