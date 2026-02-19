'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
type EdificioRow = { id: string; nombre: string };

export default function EdificiosMultiSelect({
  valueIds,
  onChangeIds,
  disabled,
  className,
  allowCreate = true,
  invalid,
}: {
  valueIds: string[];
  onChangeIds: (next: string[]) => void;
  disabled?: boolean;
  className?: string;
  allowCreate?: boolean;
  invalid?: boolean;
}) {
  const computedInvalid = invalid ?? false;
  const [opts, setOpts] = useState<EdificioRow[]>([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);

  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as any)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('edificios')
        .select('id,nombre')
        .eq('activo', true)
        .order('nombre', { ascending: true });

      setOpts((data as any) ?? []);
    })();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return opts;
    return opts.filter(o => (o.nombre ?? '').toLowerCase().includes(qq));
  }, [opts, q]);

  const selected = useMemo(() => {
    const map = new Map(opts.map(o => [o.id, o.nombre]));
    return valueIds
      .map(id => ({ id, nombre: map.get(id) ?? '' }))
      .filter(x => x.nombre);
  }, [opts, valueIds]);

  async function createAndSelect(nombre: string) {
    const n = nombre.trim();
    if (!n) return;

    setCreating(true);

    const { data, error } = await supabase
      .from('edificios')
      .insert({ nombre: n, activo: true })
      .select('id,nombre')
      .single();

    setCreating(false);
    if (error) return;

    setOpts(prev => {
      const next = [...prev, data as any];
      next.sort((a, b) => a.nombre.localeCompare(b.nombre));
      return next;
    });

    const id = (data as any).id as string;
    if (!valueIds.includes(id)) onChangeIds([...valueIds, id]);
    setQ('');
    setOpen(false);
  }

  function toggle(id: string) {
    if (valueIds.includes(id)) onChangeIds(valueIds.filter(x => x !== id));
    else onChangeIds([...valueIds, id]);
  }

  return (
    <div ref={boxRef} className={className}>
      <div
        className={
          'relative min-h-[40px] w-full rounded-xl border bg-white px-3 py-2 pr-10 text-sm outline-none seleccionar-edificios-combo-box transition-colors focus:ring-2 ' +
          (computedInvalid ? '!border-red-300 focus:ring-red-500/10' : 'border-zinc-200 focus:ring-zinc-900/10') +
          ' ' +
          (disabled ? 'opacity-60' : 'cursor-pointer')
        }
        onClick={() => {
          if (disabled) return;
          setOpen(o => !o);
        }}
      >
        <span
          className={
            'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-transform ' +
            (open ? 'rotate-180' : 'rotate-0')
          }
        >
          <svg width='16' height='16' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
            <path d='M5 7.5L10 12.5L15 7.5' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
        </span>

        {selected.length ? (
          <div className='flex flex-wrap gap-2'>
            {selected.map(s => (
              <span key={s.id} className='inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs'>
                {s.nombre}
                <button
                  type='button'
                  disabled={disabled}
                  className='text-zinc-500 hover:text-zinc-900 remove_building'
                  onClick={e => {
                    e.stopPropagation();
                    onChangeIds(valueIds.filter(x => x !== s.id));
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <span className='text-zinc-400 seleccionar-edificios-text'>Seleccionar edificios…</span>
        )}
      </div>

      {/* DROPDOWN ANIMADO (siempre montado) */}
      <div
        className={
          'grid transition-[grid-template-rows,opacity] duration-200 ease-out ' +
          (open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none')
        }
      >
        <div className='min-h-0 overflow-hidden'>
          <div className='mt-2 rounded-xl border border-zinc-200 bg-white p-2 lista_edificios'>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder='Buscar edificio…'
              disabled={disabled}
              className='w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10'
            />

            <div className='mt-2 max-h-[260px] overflow-auto'>
              {filtered.length === 0 ? (
                <div className='px-2 py-2 text-xs text-zinc-500'>Sin resultados.</div>
              ) : (
                filtered.map(o => (
                  <label key={o.id} className='flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-zinc-50'>
                    <input type='checkbox' checked={valueIds.includes(o.id)} onChange={() => toggle(o.id)} disabled={disabled} />
                    <span className='text-sm text-zinc-800'>{o.nombre}</span>
                  </label>
                ))
              )}
            </div>

            {allowCreate && q.trim() ? (
              <div className='mt-2 border-t border-zinc-100 pt-2'>
                <button
                  type='button'
                  disabled={disabled || creating}
                  onClick={() => createAndSelect(q)}
                  className='w-full rounded-lg bg-[var(--brand-900)] px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-40'
                >
                  {creating ? 'Agregando…' : `Agregar "${q.trim()}"`}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}