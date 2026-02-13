'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import EtiquetaSelect from '@/components/EtiquetaSelect';

const ETIQUETAS_OPCIONES = [
  'EN TRÁMITE PARA ESTA DIRECCIÓN',
  'FINALIZÓ PARA ESTA DIRECCIÓN',
  'PENDIENTE RESOLVER',
] as const;

const TRAMITES_OPCIONES = ['PE', 'CD', 'LP', 'OTROS'] as const;

type GestionMini = {
  id: string;
  created_at: string | null;
  fecha: string | null;
  gestion: string | null;
  dependencia_actual: string | null;
};

type Expediente = {
  id: string;
  expte_code: string;
  anio: number | null;
  edificio: string | null;
  caratula: string | null;

  fecha_ingreso: string | null;
  ultima_gestion: string | null;

  se_giro_a: string | null;
  tipo_tramite: string | null;

  etiqueta: string | null;
  resolucion: string | null;

  dependencia_actual: string | null;

  created_at: string | null;

  // join con historial (gestiones)
  gestiones?: GestionMini[] | null;
};

function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function formatDateDMY(date: string | null) {
  if (!date) return '';

  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const yyyy = m[1];
    const mm = m[2];
    const dd = m[3];
    return `${dd}/${mm}/${yyyy}`;
  }

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function ExpedientesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [anio, setAnio] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [tramite, setTramite] = useState('');

  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [q, anio, etiqueta, tramite]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/login');
    });
  }, [router]);

  async function load() {
    setLoading(true);

    // ✅ Traemos última gestión por expediente ordenada por created_at de gestiones
    const { data, error } = await supabase
      .from('expedientes')
      .select(
        `
        id,
        expte_code,
        anio,
        edificio,
        caratula,
        fecha_ingreso,
        ultima_gestion,
        se_giro_a,
        tipo_tramite,
        created_at,
        etiqueta,
        resolucion,
        dependencia_actual,
        gestiones:gestiones (
          id,
          created_at,
          fecha,
          gestion,
          dependencia_actual
        )
      `
      )
      .or('activo.eq.true,activo.is.null')
      .order('created_at', { ascending: false })
      // orden dentro del join: lo "último" real por inserción
      .order('created_at', { ascending: false, referencedTable: 'gestiones' })
      .order('id', { ascending: false, referencedTable: 'gestiones' })
      // ✅ nos quedamos solo con la última gestión por expediente
      .limit(1, { referencedTable: 'gestiones' })
      .limit(100000);

    if (!error && data) setRows(data as any);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const anios = useMemo(
    () =>
      Array.from(new Set(rows.map(r => r.anio).filter(Boolean))).sort(
        (a, b) => Number(b) - Number(a)
      ),
    [rows]
  );

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();

    return rows.filter(r => {
      if (anio && String(r.anio ?? '') !== anio) return false;
      if (etiqueta && (r.etiqueta ?? '').toLowerCase() !== etiqueta.toLowerCase()) return false;
      if (
        tramite &&
        (r.tipo_tramite ?? '').trim().toUpperCase() !== tramite.trim().toUpperCase()
      )
        return false;
      const lastGest = r.gestiones && r.gestiones.length ? r.gestiones[0] : null;

      // ✅ dependencia actual mostrada = última de historial si existe
      const lastDep = lastGest?.dependencia_actual ?? r.dependencia_actual ?? '';

      if (ql) {
        const s = `${r.expte_code} ${r.edificio ?? ''} ${r.caratula ?? ''} ${lastDep}`.toLowerCase();
        if (!s.includes(ql)) return false;
      }

      return true;
    });
  }, [rows, q, anio, etiqueta, tramite]);

  const stats = useMemo(() => {
    const total = rows.length;
    const edificios = new Set(filtered.map(r => r.edificio).filter(Boolean)).size;
    return { total, edificios };
  }, [rows, filtered]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [saveRowErr, setSaveRowErr] = useState<string | null>(null);
  const [deleteRowId, setDeleteRowId] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [deleteOk, setDeleteOk] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function eliminarExpediente(id: string) {
    setDeleteRowId(id);
    setDeleteErr(null);
    setDeleteOk(null);

    const { error } = await supabase
      .from('expedientes')
      .update({ activo: false })
      .eq('id', id);

    setDeleteRowId(null);

    if (error) {
      setDeleteErr(error.message);
      return;
    }

    setRows(prev => prev.filter(r => r.id !== id));
    setDeleteOk('Expediente eliminado (oculto).');
    setTimeout(() => setDeleteOk(null), 2500);
  }

  async function updateEtiqueta(rowId: string, newEtiqueta: string | null) {
    setSavingRowId(rowId);
    setSaveRowErr(null);

    const etiquetaValue = newEtiqueta && newEtiqueta.trim() ? newEtiqueta : null;

    const { error } = await supabase
      .from('expedientes')
      .update({ etiqueta: etiquetaValue })
      .eq('id', rowId);

    setSavingRowId(null);

    if (error) {
      setSaveRowErr(error.message);
      return;
    }

    setRows(prev =>
      prev.map(r => (r.id === rowId ? { ...r, etiqueta: etiquetaValue } : r))
    );
  }

  function imprimirTabla() {
    const htmlRows = (pageRows ?? [])
      .map(r => {
        const lastGest = r.gestiones && r.gestiones.length ? r.gestiones[0] : null;
  
        const shownDep = lastGest?.dependencia_actual ?? r.dependencia_actual ?? '';
        const shownUltimaGestion = lastGest?.gestion ?? r.ultima_gestion ?? '';
        const shownFechaGiro = lastGest?.fecha ?? '';
  
        return `
          <tr>
            <td>${r.expte_code ?? ''}</td>
            <td>${r.anio ?? ''}</td>
            <td>${r.edificio ?? ''}</td>
            <td>${r.caratula ?? ''}</td>
            <td>${r.fecha_ingreso ? formatDateDMY(r.fecha_ingreso) : ''}</td>
            <td>${shownUltimaGestion ?? ''}</td>
            <td>${r.tipo_tramite ?? ''}</td>
            <td>${r.etiqueta ?? ''}</td>
            <td>${r.resolucion ?? ''}</td>
            <td>${shownFechaGiro ? formatDateDMY(shownFechaGiro) : ''}</td>
            <td>${shownDep ?? ''}</td>
          </tr>
        `;
      })
      .join('');
  
    const html = `
    <html>
      <head>
        <title>Expedientes - Impresión</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { font-size: 18px; margin: 0 0 12px; color:#005e9a; }
          .meta { font-size: 12px; color: #555; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #e5e5e5; padding: 8px; vertical-align: top; }
          th { background: #f5f5f5; text-align: left; }
          th:nth-child(4),
          td:nth-child(4) {
            max-width: 150px;
            white-space: normal;
          }       
          /* Dependencia actual (última columna larga) */
          th:nth-child(11),
          td:nth-child(11) {
            max-width: 100px;
            white-space: normal;
          }

        </style>
      </head>
      <body>
        <h1>Expedientes (vista actual)</h1>
        <div class="meta">
          Página: ${page} / ${pageCount} · Mostrando: ${(pageRows ?? []).length} filas · Total filtrado: ${filtered.length}<br/>
          Filtros: Trámite: ${tramite || 'Todos'} · Año: ${anio || 'Todos'} · Etiqueta: ${etiqueta || 'Todas'} · Búsqueda: ${q || '—'}
        </div>
  
        <table>
          <thead>
            <tr>
              <th>Exp.</th>
              <th>Año</th>
              <th>Edificio</th>
              <th>Carátula/Referencia</th>
              <th>Fecha ingreso</th>
              <th>Última gestión</th>
              <th>Trámite</th>
              <th>Etiqueta</th>
              <th>Resol.</th>
              <th>Fecha giro</th>
              <th>Dependencia actual</th>
            </tr>
          </thead>
          <tbody>
            ${htmlRows}
          </tbody>
        </table>
  
        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
    </html>
    `;
  
    const w = window.open('', '_blank', 'width=1100,height=750');
    if (!w) return;
  
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  return (
    <AppShell
      title="Expedientes"
      right={
        <>
          <Link
            href="/expedientes/nuevo"
            className="rounded-lg bg-[var(--brand-900)] px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Nuevo
          </Link>
          <button
            onClick={logout}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Salir
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-medium text-zinc-500">Total</div>
            <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-medium text-zinc-500">Filtrados</div>
            <div className="mt-1 text-2xl font-semibold">{filtered.length}</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-medium text-zinc-500">Edificios (filtrado)</div>
            <div className="mt-1 text-2xl font-semibold">{stats.edificios}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por expte / edificio / carátula / dependencia…"
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 md:col-span-2"
          />
          <select
              value={tramite}
              onChange={e => setTramite(e.target.value)}
              className="select-arrow rounded-xl border border-zinc-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            >
              <option value="">Trámite (todos)</option>
              {TRAMITES_OPCIONES.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
          </select>          
          <select
            value={anio}
            onChange={e => setAnio(e.target.value)}
            className="select-arrow rounded-xl border border-zinc-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
          >
            <option value="">Año (todos)</option>
            {anios.map(a => (
              <option key={a as any} value={String(a)}>
                {a}
              </option>
            ))}
          </select>
          <select
            value={etiqueta}
            onChange={e => setEtiqueta(e.target.value)}
            className="select-arrow rounded-xl border border-zinc-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
          >
            <option value="">Etiqueta (todas)</option>
            {ETIQUETAS_OPCIONES.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {confirmDeleteId ? (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <div className="text-base font-semibold text-zinc-900">Eliminar expediente</div>
              <div className="mt-2 text-sm text-zinc-600">
                Esto lo va a ocultar del sistema. Podés volver a activarlo si después lo necesitás.
              </div>

              {deleteErr ? (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {deleteErr}
                </div>
              ) : null}

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  disabled={deleteRowId === confirmDeleteId}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const id = confirmDeleteId;
                    setConfirmDeleteId(null);
                    if (id) await eliminarExpediente(id);
                  }}
                  disabled={deleteRowId === confirmDeleteId}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  Confirmar eliminar
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-zinc-200">

         {deleteErr ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {deleteErr}
            </div>
          ) : null}

          {deleteOk ? (
            <div className="eliminado-ok border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {deleteOk}
            </div>
          ) : null}
          <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
            <div className="text-sm font-medium">Planilla</div>

            <div className="flex items-center gap-2">
              {loading ? (
                <div className="text-xs text-zinc-500">Cargando…</div>
              ) : (
                <div className="text-xs text-zinc-500">{filtered.length} resultados</div>
              )}

              <button
                type="button"
                onClick={imprimirTabla}
                disabled={loading || !pageRows || pageRows.length === 0}
                className="rounded-lg bg-[var(--brand-900)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Imprimir
              </button>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Exp.</th>
                  <th className="px-4 py-3">Año</th>
                  <th className="px-4 py-3">Edificio</th>
                  <th className="px-4 py-3">Carátula/Referencia</th>
                  <th className="min-w-[120px] px-4 py-3">Fecha de ingreso</th>
                  <th className="px-4 py-3">Última gestión</th>
                  <th className="px-4 py-3">Trámite</th>
                  <th className="px-4 py-3">Etiqueta</th>
                  <th className="px-4 py-3">Resol.</th>
                  <th className="px-4 py-3">Fecha de giro</th>
                  <th className="px-4 py-3">Dependencia actual</th>
                  <th className="px-4 py-3 w-[80px]"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100 bg-white">
                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-zinc-500" colSpan={13}>
                      Sin resultados.
                    </td>
                  </tr>
                ) : (
                  pageRows.map(r => {
                    const lastGest = r.gestiones && r.gestiones.length ? r.gestiones[0] : null;

                    // ✅ mostrado en tabla: última dependencia del historial
                    const shownDep = lastGest?.dependencia_actual ?? r.dependencia_actual ?? null;

                    // ✅ mostrado en tabla: última gestión del historial
                    const shownUltimaGestion = lastGest?.gestion ?? r.ultima_gestion ?? null;
                    const shownFechaGiro = lastGest?.fecha ?? null;

                    return (
                      <tr key={r.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3 w-[120px] break-words">
                          <Link
                            href={`/expedientes/${r.id}`}
                            className="font-semibold text-zinc-900 hover:underline"
                          >
                            {r.expte_code}
                          </Link>
                        </td>

                        <td className="px-4 py-3">
                          {r.anio ?? <span className="text-zinc-400">—</span>}
                        </td>

                        <td className="px-4 py-3">
                          {r.edificio ?? <span className="text-zinc-400">—</span>}
                        </td>

                        <td className="px-4 py-3 max-w-[210px] whitespace-normal break-words">
                          <div className="text-zinc-700">
                            {r.caratula ?? <span className="text-zinc-400">—</span>}
                          </div>
                        </td>

                        <td className="min-w-[120px] px-4 py-3">
                          {r.fecha_ingreso ? (
                            formatDateDMY(r.fecha_ingreso)
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-zinc-700 max-w-[150px] break-words">
                            {shownUltimaGestion ? (
                              shownUltimaGestion.length > 80 ? (
                                shownUltimaGestion.slice(0, 80) + '…'
                              ) : (
                                shownUltimaGestion
                              )
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {r.tipo_tramite ?? <span className="text-zinc-400">—</span>}
                        </td>

                        <td className="px-4 py-3">
                          <EtiquetaSelect
                            value={r.etiqueta}
                            options={ETIQUETAS_OPCIONES as any}
                            className="min-w-[120px] w-[120px]"
                            disabled={savingRowId === r.id}
                            onChange={next => updateEtiqueta(r.id, next)}
                          />
                        </td>

                        <td className="px-4 py-3 uppercase">
                          {r.resolucion ?? <span className="text-zinc-400">—</span>}
                        </td>
                
                        <td className="px-4 py-3 min-w-[120px]">
                          {shownFechaGiro ? (
                            formatDateDMY(shownFechaGiro)
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 w-[80px] max-w-[80px] break-words whitespace-normal">
                          {shownDep ?? <span className="text-zinc-400">—</span>}
                        </td>

                        <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(r.id)}
                              disabled={deleteRowId === r.id}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60 active:scale-[0.97]"
                            >
                              {deleteRowId === r.id ? 'Eliminando…' : 'Eliminar'}
                            </button>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-600">
            <div>
              Página <span className="font-medium">{page}</span> de{' '}
              <span className="font-medium">{pageCount}</span> · {filtered.length} resultados
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50"
              >
                Anterior
              </button>

              {Array.from({ length: pageCount }, (_, i) => i + 1)
                .filter(n => n === 1 || n === pageCount || Math.abs(n - page) <= 2)
                .reduce<number[]>((acc, n) => {
                  if (acc.length && n - acc[acc.length - 1] > 1) acc.push(-1);
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, idx) =>
                  n === -1 ? (
                    <span key={`dots-${idx}`} className="px-1 text-zinc-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={
                        'rounded-lg border px-3 py-1.5 text-xs font-medium ' +
                        (n === page
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50')
                      }
                    >
                      {n}
                    </button>
                  )
                )}

              <button
                type="button"
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>

        {saveRowErr ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {saveRowErr}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}