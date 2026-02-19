'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';

type EdificioRow = {
  id: string;
  nombre: string;
  activo: boolean | null;
  created_at?: string | null;
};

function normalize(s: string) {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function SpinnerOverlay() {
  return (
    <div className='absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[1px]'>
      <div className='h-14 w-14 animate-spin rounded-full border-[3px] border-zinc-300 border-t-zinc-900' />
    </div>
  );
}

export default function EdificiosAdminPage() {
  const router = useRouter();

  const [rows, setRows] = useState<EdificioRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // crear
  const [newNombre, setNewNombre] = useState('');
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  // editar
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // eliminar (soft delete)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/login');
    });
  }, [router]);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from('edificios')
      .select('id,nombre,activo,created_at')
      .order('nombre', { ascending: true })
      .limit(100000);

    if (!error && data) setRows((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const qq = normalize(q);
    return rows.filter(r => {
      const isActive = r.activo !== false; // null/true => activo
      if (!showInactive && !isActive) return false;
      if (!qq) return true;
      return normalize(r.nombre).includes(qq);
    });
  }, [rows, q, showInactive]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter(r => r.activo !== false).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [rows]);

  async function createEdificio() {
    setCreateErr(null);

    const n = newNombre.trim();
    if (!n) {
      setCreateErr('Completá el nombre.');
      return;
    }

    // evita duplicados simples (client-side)
    const exists = rows.some(r => normalize(r.nombre) === normalize(n) && r.activo !== false);
    if (exists) {
      setCreateErr('Ya existe un edificio activo con ese nombre.');
      return;
    }

    setCreating(true);

    const { data, error } = await supabase
      .from('edificios')
      .insert({ nombre: n, activo: true })
      .select('id,nombre,activo,created_at')
      .single();

    setCreating(false);

    if (error) {
      setCreateErr(error.message);
      return;
    }

    setRows(prev => {
      const next = [data as any, ...prev];
      next.sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? ''));
      return next;
    });
    setNewNombre('');
  }

  function startEdit(r: EdificioRow) {
    setSaveErr(null);
    setEditId(r.id);
    setEditNombre(r.nombre ?? '');
  }

  function cancelEdit() {
    setEditId(null);
    setEditNombre('');
    setSaveErr(null);
  }

  async function saveEdit(id: string) {
    setSaveErr(null);

    const n = editNombre.trim();
    if (!n) {
      setSaveErr('El nombre no puede estar vacío.');
      return;
    }

    const exists = rows.some(r => r.id !== id && normalize(r.nombre) === normalize(n) && r.activo !== false);
    if (exists) {
      setSaveErr('Ya existe un edificio activo con ese nombre.');
      return;
    }

    setSavingId(id);

    const { error } = await supabase
      .from('edificios')
      .update({ nombre: n })
      .eq('id', id);

    setSavingId(null);

    if (error) {
      setSaveErr(error.message);
      return;
    }

    setRows(prev => {
      const next = prev.map(r => (r.id === id ? { ...r, nombre: n } : r));
      next.sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? ''));
      return next;
    });

    cancelEdit();
  }

  async function toggleActivo(id: string, nextActivo: boolean) {
    setSaveErr(null);
    setSavingId(id);

    const { error } = await supabase
      .from('edificios')
      .update({ activo: nextActivo })
      .eq('id', id);

    setSavingId(null);

    if (error) {
      setSaveErr(error.message);
      return;
    }

    setRows(prev => prev.map(r => (r.id === id ? { ...r, activo: nextActivo } : r)));
  }

  async function softDelete(id: string) {
    setDeleteErr(null);
    setDeletingId(id);

    const { error } = await supabase
      .from('edificios')
      .update({ activo: false })
      .eq('id', id);

    setDeletingId(null);

    if (error) {
      setDeleteErr(error.message);
      return;
    }

    setRows(prev => prev.map(r => (r.id === id ? { ...r, activo: false } : r)));
    setConfirmDeleteId(null);
  }

  return (
    <AppShell title='Edificios'>
      <div className='space-y-4'>
        {/* stats */}
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
          <div className='rounded-2xl border border-zinc-200 bg-zinc-50 p-4'>
            <div className='text-xs font-medium text-zinc-500'>Total</div>
            <div className='mt-1 text-2xl font-semibold'>{stats.total}</div>
          </div>
          <div className='rounded-2xl border border-zinc-200 bg-zinc-50 p-4'>
            <div className='text-xs font-medium text-zinc-500'>Activos</div>
            <div className='mt-1 text-2xl font-semibold'>{stats.active}</div>
          </div>
          <div className='rounded-2xl border border-zinc-200 bg-zinc-50 p-4'>
            <div className='text-xs font-medium text-zinc-500'>Inactivos</div>
            <div className='mt-1 text-2xl font-semibold'>{stats.inactive}</div>
          </div>
        </div>

        {/* crear */}
        <div className='rounded-2xl border border-zinc-200 bg-white p-4'>
          <div className='text-sm font-semibold'>Agregar edificio</div>

          {createErr ? (
            <div className='mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
              {createErr}
            </div>
          ) : null}

          <div className='mt-3 flex flex-col gap-2 sm:flex-row sm:items-center'>
            <input
              value={newNombre}
              onChange={e => setNewNombre(e.target.value)}
              placeholder='Nombre del edificio…'
              className='w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10'
            />
            <button
              type='button'
              onClick={createEdificio}
              disabled={creating}
              className='rounded-xl bg-[var(--brand-900)] px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 cursor-pointer'
            >
              {creating ? 'Agregando…' : 'Agregar'}
            </button>
          </div>
        </div>

        {/* filtros */}
        <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder='Buscar edificio…'
            className='rounded-xl border border-zinc-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 md:col-span-2'
          />

          <label className='flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm'>
            <input
              type='checkbox'
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
            />
            Mostrar inactivos
          </label>
        </div>

        {/* tabla */}
        <div className='relative overflow-hidden rounded-2xl border border-zinc-200 bg-white min-h-[300px]'>
          {loading && <SpinnerOverlay />}
          <div className='flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3'>
            <div className='text-sm font-medium'>Listado</div>
            {loading ? (
              <div className='text-xs text-zinc-500'>Cargando…</div>
            ) : (
              <div className='text-xs text-zinc-500'>{filtered.length} resultados</div>
            )}
          </div>

          {saveErr ? (
            <div className='m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
              {saveErr}
            </div>
          ) : null}

          <div className='overflow-auto'>
            <table className='min-w-full text-left text-sm'>
              <thead className='bg-zinc-50 text-xs uppercase text-zinc-500'>
                <tr>
                  <th className='px-4 py-3'>Nombre</th>
                  <th className='px-4 py-3 w-[120px]'>Estado</th>
                  <th className='px-4 py-3 w-[260px]'></th>
                </tr>
              </thead>

              <tbody className='divide-y divide-zinc-100'>
                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td className='px-4 py-6 text-zinc-500' colSpan={3}>
                      Sin resultados.
                    </td>
                  </tr>
                ) : (
                  filtered.map(r => {
                    const isActive = r.activo !== false;
                    const isEditing = editId === r.id;

                    return (
                      <tr key={r.id} className='hover:bg-zinc-50'>
                        <td className='px-4 py-3'>
                          {isEditing ? (
                            <input
                              value={editNombre}
                              onChange={e => setEditNombre(e.target.value)}
                              className='w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10'
                            />
                          ) : (
                            <div className='text-zinc-900'>
                              {r.nombre}
                              {!isActive ? (
                                <span className='ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600'>
                                  Inactivo
                                </span>
                              ) : null}
                            </div>
                          )}
                        </td>

                        <td className='px-4 py-3'>
                          <button
                            type='button'
                            disabled={savingId === r.id}
                            onClick={() => toggleActivo(r.id, !isActive)}
                            className={
                              'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 disabled:cursor-default ' +
                              (isActive
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300')
                            }
                          >
                            {savingId === r.id ? 'Guardando…' : isActive ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>

                        <td className='px-4 py-3'>
                          <div className='flex flex-wrap items-center justify-end gap-2'>
                            {isEditing ? (
                              <>
                                <button
                                  type='button'
                                  onClick={() => cancelEdit()}
                                  disabled={savingId === r.id}
                                  className='rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 cursor-pointer'
                                >
                                  Cancelar
                                </button>
                                <button
                                  type='button'
                                  onClick={() => saveEdit(r.id)}
                                  disabled={savingId === r.id}
                                  className='rounded-lg bg-[var(--brand-900)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 cursor-pointer'
                                >
                                  {savingId === r.id ? 'Guardando…' : 'Guardar'}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type='button'
                                  onClick={() => startEdit(r)}
                                  disabled={savingId === r.id}
                                  className='rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 cursor-pointer'
                                >
                                  Editar
                                </button>

                                <button
                                  type='button'
                                  onClick={() => setConfirmDeleteId(r.id)}
                                  disabled={deletingId === r.id}
                                  className='rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 cursor-pointer'
                                >
                                  Eliminar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* modal eliminar */}
        {confirmDeleteId ? (
          <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4'>
            <div className='w-full max-w-md rounded-2xl bg-white p-5 shadow-xl'>
              <div className='text-base font-semibold text-zinc-900'>Eliminar edificio</div>
              <div className='mt-2 text-sm text-zinc-600'>
                Esto lo va a marcar como <span className='font-semibold'>inactivo</span>. No se borra de la base.
              </div>

              {deleteErr ? (
                <div className='mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                  {deleteErr}
                </div>
              ) : null}

              <div className='mt-4 flex items-center justify-end gap-2'>
                <button
                  type='button'
                  onClick={() => {
                    setConfirmDeleteId(null);
                    setDeleteErr(null);
                  }}
                  disabled={deletingId === confirmDeleteId}
                  className='rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60'
                >
                  Cancelar
                </button>

                <button
                  type='button'
                  onClick={async () => {
                    const id = confirmDeleteId;
                    if (id) await softDelete(id);
                  }}
                  disabled={deletingId === confirmDeleteId}
                  className='rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60'
                >
                  {deletingId === confirmDeleteId ? 'Eliminando…' : 'Confirmar eliminar'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}