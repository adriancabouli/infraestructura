'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import { Folder, PlusCircle, Settings } from 'lucide-react';

function NavItem({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
}) {
  const path = usePathname();

  const isExact =
    path === href ||
    (href === '/configuracion' && path.startsWith('/edificios'));

  const isExpChild =
    href === '/expedientes' &&
    path.startsWith('/expedientes/') &&
    path !== '/expedientes/nuevo';

  return (
    <Link
      href={href}
      className={
        'flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition ' +
        (isExact
          ? 'bg-[var(--brand-900)] text-white'
          : isExpChild
          ? 'bg-zinc-100 text-zinc-800'
          : 'text-zinc-700 hover:bg-zinc-100')
      }
    >
      {icon}
      <span>{label}</span>
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

  const pathname = usePathname();

  function TitleIcon() {
    if (pathname.startsWith('/expedientes/nuevo')) {
      return <PlusCircle className='h-6 w-6 text-zinc-700' />;
    }

    if (pathname.startsWith('/expedientes')) {
      return <Folder className='h-6 w-6 text-zinc-700' />;
    }

    if (pathname.startsWith('/configuracion') || pathname.startsWith('/edificios')) {
      return <Settings className='h-6 w-6 text-zinc-700' />;
    }

    return null;
  }

  return (
    <div className='min-h-screen'>
      <div className='mx-auto px-4 py-6'>
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]'>

          {/* SIDEBAR */}
          <aside className='flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]'>
            {/* USER */}
            <div className='mb-4'>
              <div className='text-xs font-medium text-zinc-500'>
                {userName ? `Bienvenido/a` : 'Sistema'}
              </div>
              <div className='text-lg font-semibold name'>
                {userName ?? 'Infraestructura'}
              </div>
            </div>

            {/* NAV PRINCIPAL */}
            <nav className='space-y-1 overflow-y-auto'>
              <NavItem
                href='/expedientes'
                label='Expedientes'
                icon={<Folder className='h-4 w-4' />}
              />
              <NavItem
                href='/expedientes/nuevo'
                label='Nuevo expediente'
                icon={<PlusCircle className='h-4 w-4' />}
              />
            </nav>

            {/* CONFIGURACION ABAJO SIEMPRE */}
            <div className='mt-auto'>
              <NavItem
                href='/configuracion'
                label='Configuración'
                icon={<Settings className='h-4 w-4' />}
              />
            </div>
          </aside>

          {/* MAIN */}
          <main className='space-y-4'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <div className='text-xs font-medium text-zinc-500'>
                  Infraestructura - CSJN
                </div>
                <h1 className='flex items-center gap-2 text-2xl font-semibold tracking-tight title-header'>
                  <TitleIcon />
                  {title}
                </h1>
              </div>
              <div className='flex items-center gap-2'>{right}</div>
            </div>

            <div className='rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm'>
              {children}
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}