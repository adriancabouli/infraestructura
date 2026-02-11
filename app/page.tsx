'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;

      if (data.session) {
        router.replace('/expedientes');
      } else {
        router.replace('/login');
      }
    });

    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen grid place-items-center text-sm text-zinc-500">
      Redireccionando…
    </div>
  );
}