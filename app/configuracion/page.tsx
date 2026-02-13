'use client';

import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { Building } from 'lucide-react';

export default function ConfiguracionPage() {
  return (
    <AppShell title='Configuración'>
      <div className='space-y-4'>
        <div className='text-sm text-zinc-600'>
          Panel de configuración del sistema.
        </div>

        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {/* Card Edificios */}
          <Link
            href='/edificios'
            className='rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:bg-zinc-50'
            >
            <div className='flex items-center gap-3'>
                <Building className='h-5 w-5 text-zinc-700' />

                <div>
                <div className='text-sm font-semibold'>Edificios</div>
                <div className='mt-1 text-xs text-zinc-500'>
                    Administrar edificios del sistema
                </div>
                </div>
            </div>
            </Link>
        </div>
      </div>
    </AppShell>
  );
}