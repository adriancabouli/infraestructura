'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import EtiquetaSelect from '@/components/EtiquetaSelect';

const ETIQUETAS_OPCIONES = [
  'EN TRÁMITE PARA ESTA DIRECCIÓN',
  'FINALIZÓ PARA ESTA DIRECCIÓN',
  'PENDIENTE RESOLVER',
] as const;

type Expediente = {
  id: string;
  expte_code: string;
  anio: number | null;
  edificio: string | null;
  caratula: string | null;

  fecha_ingreso: string | null;

  etiqueta: string | null;
  ultima_gestion: string | null;
  se_giro_a: string | null;
  tipo_tramite: string | null;

  resolucion: string | null;
  dependencia_actual: string | null;
  last_user_update: string | null;
};

type Gestion = {
  id: string;
  created_at: string | null;
  fecha: string | null;
  gestion: string | null;
  se_giro_a: string | null;
  dependencia_actual: string | null;
  last_user_update: string | null;
};

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

function KV({ k, v }: { k: string; v: any }) {
  return (
    <div className='rounded-xl border border-zinc-200 bg-white p-3'>
      <div className='text-xs font-medium text-zinc-500'>{k}</div>
      <div className='mt-1 text-sm text-zinc-900'>
        {v ? String(v) : <span className='text-zinc-400'>—</span>}
      </div>
    </div>
  );
}

const EDIFICIOS = [
  'PALACIO - TALCAHUANO 550',
  'CUERPO DE PERITOS - BARTOLOMÉ MITRE 718/20',
  'ARCHIVO GENERAL - HIPÓLITO YRIGOYEN 2041/61',
  'NOTI.Y SUBASTAS-JEAN JEAURES 545',
  'MORGUE -JUNIN 760',
  'OVD - LAVALLE 1250',
  'CUERPO MÉDICO FORENSE/OFICINA DE LA MUJER - LAVALLE 1429',
  'O.S.P.J.N- LAVALLE 1653',
  'ARCHIVO-O.S.P.J.N- RIVADAVIA 765/67',
  'TALCAHUANO 450/52',
  'FARMACIA DE LA O.S.P.J -TUCUMÁN 1393/99',
  'TUCUMÁN 1511/23',
  'VILLARINO 2010 - DEPÓSITO AUTOMOTORES/ ÁREA DE TALLERES/ARCHIVO GENERAL PJN',
  'POLO CIRCO - COMBATE DE LOS POZOS s/n',
  'DaJuDeCO',
  'OTROS EDIFICIOS',
  'VIAMONTE 1197 CABA',
  'Mandamientos -Libertad 731',
] as const;

const TRAMITES = ['LP', 'CD', 'OTROS'] as const;

export default function ExpedienteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [exp, setExp] = useState<Expediente | null>(null);

  const [gest, setGest] = useState<Gestion[]>([]);
  const [lastGest, setLastGest] = useState<Gestion | null>(null);

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');

  // editables (se guardan en expedientes)
  const [editEdificio, setEditEdificio] = useState('');
  const [editTramite, setEditTramite] = useState('');

  // ✅ Resolución: ahora es "draft" local + botón Guardar
  const [resDraft, setResDraft] = useState('');
  const [savingResolucion, setSavingResolucion] = useState(false);
  const [resolucionErr, setResolucionErr] = useState<string | null>(null);

  // historial (inputs)
  const [hFecha, setHFecha] = useState<string>('');
  const [hGestion, setHGestion] = useState<string>('');
  const [hSeGiroA, setHSeGiroA] = useState<string>('');
  const [hDepActual, setHDepActual] = useState<string>('');

  const [savingHist, setSavingHist] = useState(false);
  const [histErr, setHistErr] = useState<string | null>(null);

  // etiqueta editable
  const [savingEtiqueta, setSavingEtiqueta] = useState(false);
  const [etiquetaErr, setEtiquetaErr] = useState<string | null>(null);

  const [savingEdificio, setSavingEdificio] = useState(false);
  const [savingTramite, setSavingTramite] = useState(false);

  const [fieldErr, setFieldErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      if (!session) {
        router.push('/login');
        return;
      }
      setUserEmail(session.user.email ?? '');
    });
  }, [router]);

  async function load() {
    setLoading(true);

    const { data: expData, error: expErr } = await supabase
      .from('expedientes')
      .select('*')
      .eq('id', id)
      .single();

    const { data: gData } = await supabase
      .from('gestiones')
      .select('id, created_at, fecha, gestion, se_giro_a, dependencia_actual, last_user_update')
      .eq('expediente_id', id)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });

    const { data: lastData } = await supabase
      .from('gestiones')
      .select('id, created_at, fecha, gestion, se_giro_a, dependencia_actual, last_user_update')
      .eq('expediente_id', id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!expErr && expData) {
      setExp(expData as any);
      setEditEdificio(expData.edificio ?? '');
      setEditTramite(expData.tipo_tramite ?? '');
      setResDraft(expData.resolucion ?? ''); // ✅ set draft
    }

    setGest((gData as any) ?? []);
    setLastGest(lastData && lastData.length ? (lastData[0] as any) : null);

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateEtiqueta(next: string | null) {
    if (!exp) return;

    setSavingEtiqueta(true);
    setEtiquetaErr(null);

    const etiquetaValue = next && next.trim() ? next : null;

    const { error } = await supabase
      .from('expedientes')
      .update({ etiqueta: etiquetaValue, last_user_update: userEmail || null })
      .eq('id', exp.id);

    setSavingEtiqueta(false);

    if (error) {
      setEtiquetaErr(error.message);
      return;
    }

    setExp(prev =>
      prev ? { ...prev, etiqueta: etiquetaValue, last_user_update: userEmail || null } : prev
    );
  }

  async function updateEdificio(next: string) {
    if (!exp) return;

    setSavingEdificio(true);
    setFieldErr(null);

    const edificioValue = next && next.trim() ? next : null;

    const { error } = await supabase
      .from('expedientes')
      .update({ edificio: edificioValue, last_user_update: userEmail || null })
      .eq('id', exp.id);

    setSavingEdificio(false);

    if (error) {
      setFieldErr(error.message);
      return;
    }

    setExp(prev =>
      prev ? { ...prev, edificio: edificioValue, last_user_update: userEmail || null } : prev
    );
    setEditEdificio(edificioValue ?? '');
  }

  async function updateTramite(next: string) {
    if (!exp) return;

    setSavingTramite(true);
    setFieldErr(null);

    const tramiteValue = next && next.trim() ? next : null;

    const { error } = await supabase
      .from('expedientes')
      .update({ tipo_tramite: tramiteValue, last_user_update: userEmail || null })
      .eq('id', exp.id);

    setSavingTramite(false);

    if (error) {
      setFieldErr(error.message);
      return;
    }

    setExp(prev =>
      prev ? { ...prev, tipo_tramite: tramiteValue, last_user_update: userEmail || null } : prev
    );
    setEditTramite(tramiteValue ?? '');
  }

  // ✅ guardar resolución SOLO al click
  async function saveResolucion() {
    if (!exp) return;

    setSavingResolucion(true);
    setResolucionErr(null);

    const resolucionValue = resDraft && resDraft.trim() ? resDraft.trim() : null;

    const { error } = await supabase
      .from('expedientes')
      .update({ resolucion: resolucionValue, last_user_update: userEmail || null })
      .eq('id', exp.id);

    setSavingResolucion(false);

    if (error) {
      setResolucionErr(error.message);
      return;
    }

    setExp(prev =>
      prev ? { ...prev, resolucion: resolucionValue, last_user_update: userEmail || null } : prev
    );
  }

  async function cargarHistorial() {
    if (!exp) return;

    setHistErr(null);

    if (!hFecha) {
      setHistErr('Seleccioná una fecha.');
      return;
    }

    if (!hGestion.trim()) {
      setHistErr('Completá "Última gestión".');
      return;
    }

    setSavingHist(true);

    const { error } = await supabase.from('gestiones').insert({
      expediente_id: exp.id,
      fecha: hFecha,
      gestion: hGestion.trim(),
      se_giro_a: hSeGiroA.trim() || null,
      dependencia_actual: hDepActual.trim() || null,
      last_user_update: userEmail || null,
    });

    setSavingHist(false);

    if (error) {
      setHistErr(error.message);
      return;
    }

    setHFecha('');
    setHGestion('');
    setHSeGiroA('');
    setHDepActual('');

    await supabase
      .from('expedientes')
      .update({ last_user_update: userEmail || null })
      .eq('id', exp.id);
      
    await load();
  }

  function imprimirHistorial() {
    if (!exp) return;
  
    const historialHtml = (gest ?? [])
      .map(
        g => `
          <div class="item">
            <div class="fecha">${formatDateDMY(g.fecha)}</div>
            <div class="gestion">${g.gestion ?? '—'}</div>
            <div class="extra">
              ${g.se_giro_a ? 'Se giró a: ' + g.se_giro_a : ''}
              ${g.se_giro_a && g.dependencia_actual ? ' · ' : ''}
              ${g.dependencia_actual ? 'Dep. actual: ' + g.dependencia_actual : ''}
            </div>
            ${g.last_user_update ? `<div class="user">Usuario: ${g.last_user_update}</div>` : ''}
          </div>
        `
      )
      .join('');
  
    const html = `
    <html>
      <head>
        <title>Registro histórico - Expediente ${exp.expte_code ?? ''}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { font-size: 18px; margin: 0 0 12px;color:#005e9a ;}
          .meta { font-size: 12px; color: #555; margin-bottom: 15px; padding-bottom:10px;}
  
          .item { margin-bottom: 14px; padding: 8px 15px 18px 15px; border: 1px solid #eee;border-radius:15px;background-color:#f7f7f7!important}
          .fecha { font-size: 12px; color: #666; margin-top:10px;margin-bottom:10px }
          .gestion { font-size: 14px; font-weight: 600; margin: 4px 0; }
          .extra { font-size: 12px; color: #444; }
          .user { font-size: 11px; color: #777; margin-top: 4px; }
        </style>
      </head>
      <body>
        <h1>Registro histórico - Expediente ${exp.expte_code ?? ''}</h1>
  
        <div class="meta">
          Carátula: ${exp.caratula ?? ''}<br/>
          Edificio: ${exp.edificio ?? ''}<br/>
          Año: ${exp.anio ?? ''}
        </div>
  
        ${historialHtml}
  
        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
    </html>
    `;
  
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
  
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  if (loading) {
    return (
      <AppShell title='Expediente'>
        <div className='text-sm text-zinc-500'>Cargando…</div>
      </AppShell>
    );
  }

  if (!exp) {
    return (
      <AppShell title='Expediente'>
        <div className='text-sm text-zinc-500'>No encontrado.</div>
      </AppShell>
    );
  }

  const shownUltimaGestion = lastGest?.gestion ?? exp.ultima_gestion;
  const shownSeGiroA = lastGest?.se_giro_a ?? exp.se_giro_a;
  const shownDepActual = lastGest?.dependencia_actual ?? exp.dependencia_actual;
  const shownLastUserUpdate = lastGest?.last_user_update ?? exp.last_user_update ?? null;

  const resolucionDirty = (resDraft ?? '') !== (exp.resolucion ?? '');

  return (
    <AppShell
      title={`Expediente ${exp.expte_code}`}
      right={
        <Link
          className='rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50'
          href='/expedientes'
        >
          Volver
        </Link>
      }
    >
      <div className='space-y-6'>
        {/* Bloque superior */}
        <div className='rounded-2xl border border-zinc-200 bg-zinc-50 p-4'>
          <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
            <div>
              <div className='text-xs font-medium text-zinc-500'>Edificio</div>
              <select
                value={editEdificio}
                onChange={e => {
                  const v = e.target.value;
                  setEditEdificio(v);
                  updateEdificio(v);
                }}
                disabled={savingEdificio}
                className='margin-top-5 select-arrow mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60'
              >
                <option value=''>Seleccionar…</option>
                {EDIFICIOS.map(x => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className='text-xs font-medium text-zinc-500'>Fecha de ingreso</div>
              <div className='margin-top-5 mt-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900'>
                {exp.fecha_ingreso ? formatDateDMY(exp.fecha_ingreso) : <span className='text-zinc-400'>—</span>}
              </div>
            </div>
          </div>

          <div className='mt-4 text-xs font-medium text-zinc-500'>Carátula/Referencia</div>
          <div className='mt-2 text-sm text-zinc-700'>{exp.caratula ?? ''}</div>
        </div>

        {/* Datos */}
        <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
          <KV k='Año' v={exp.anio} />

          <div className='rounded-xl border border-zinc-200 bg-white p-3'>
            <div className='flex items-center justify-between gap-2'>
              <div className='text-xs font-medium text-zinc-500'>Etiqueta</div>
              {savingEtiqueta ? <div className='text-[11px] text-zinc-400'>Guardando…</div> : null}
            </div>

            <div className='mt-2'>
              <EtiquetaSelect
                value={exp.etiqueta}
                options={ETIQUETAS_OPCIONES as any}
                disabled={savingEtiqueta}
                className='w-full'
                onChange={next => updateEtiqueta(next)}
              />
            </div>

            {etiquetaErr ? <div className='mt-2 text-xs text-red-600'>{etiquetaErr}</div> : null}
          </div>

          <div className='rounded-xl border border-zinc-200 bg-white p-3'>
            <div className='text-xs font-medium text-zinc-500'>Tipo trámite</div>
            <select
              value={editTramite}
              onChange={e => {
                const v = e.target.value;
                setEditTramite(v);
                updateTramite(v);
              }}
              disabled={savingTramite}
              className='select-arrow mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60'
            >
              <option value=''>Seleccionar…</option>
              {TRAMITES.map(x => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <KV k='Se giró a' v={shownSeGiroA} />
          <KV k='Dependencia actual' v={shownDepActual} />
          <KV k='Última gestión' v={shownUltimaGestion} />
        </div>

        {/* ✅ Resolución con botón Guardar */}
        <div className='rounded-xl border border-zinc-200 bg-white p-3'>
          <div className='flex items-center justify-between gap-2'>
            <div className='text-xs font-medium text-zinc-500'>Resolución</div>
            {savingResolucion ? <div className='text-[11px] text-zinc-400'>Guardando…</div> : null}
          </div>

          <div className='mt-2 flex items-center gap-2'>
            <input
              value={resDraft}
              placeholder='NO TIENE'
              onChange={e => setResDraft(e.target.value)}
              className='w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10'
            />

            <button
              type='button'
              onClick={saveResolucion}
              disabled={savingResolucion || !resolucionDirty}
              className='shrink-0 rounded-xl bg-[var(--brand-900)] px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60'
            >
              Guardar
            </button>
          </div>

          {resolucionErr ? <div className='mt-2 text-xs text-red-600'>{resolucionErr}</div> : null}
        </div>

        <div className='rounded-xl border border-zinc-200 bg-white p-3 ultimo-movimiento-usuario'>
          <div className='text-xs text-zinc-600'>
            Último movimiento de usuario:{' '}
            {shownLastUserUpdate ? (
              <span className='font-medium text-zinc-900'>{shownLastUserUpdate}</span>
            ) : (
              <span className='text-zinc-400'>—</span>
            )}
          </div>
        </div>

        {/* Cargar historial */}
        <div className='rounded-2xl border border-zinc-200 bg-white p-4'>
          <div className='mb-3'>
            <div className='text-xs font-medium text-zinc-500 agregar-movimiento'>Agregar movimiento</div>
            <div className='text-sm font-semibold agregar-movimiento-title'>Cargar historial</div>
          </div>

          {histErr ? (
            <div className='mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>{histErr}</div>
          ) : null}

          <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
            <div>
              <label className='text-xs font-medium text-zinc-600'>Fecha</label>
              <input
                type='date'
                value={hFecha}
                onChange={e => setHFecha(e.target.value)}
                className='mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10'
              />
            </div>

            <div className='md:col-span-2'>
              <label className='text-xs font-medium text-zinc-600'>Última gestión</label>
              <input
                value={hGestion}
                onChange={e => setHGestion(e.target.value)}
                className='mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10'
                placeholder='Detalle de la gestión…'
              />
            </div>

            <div>
              <label className='text-xs font-medium text-zinc-600'>Se giró a</label>
              <input
                value={hSeGiroA}
                onChange={e => setHSeGiroA(e.target.value)}
                className='mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10'
              />
            </div>

            <div>
              <label className='text-xs font-medium text-zinc-600'>Dependencia actual</label>
              <input
                value={hDepActual}
                onChange={e => setHDepActual(e.target.value)}
                className='mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10'
              />
            </div>
          </div>

          <div className='mt-4 flex justify-end'>
            <button
              type='button'
              onClick={cargarHistorial}
              disabled={savingHist}
              className='rounded-xl bg-[var(--brand-900)] px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60'
            >
              {savingHist ? 'Cargando…' : 'Cargar historial'}
            </button>
          </div>
        </div>

        {fieldErr ? <div className='text-xs text-red-600'>{fieldErr}</div> : null}

        {/* Historial */}
        <div>
          <div className='mb-2 flex items-center justify-between gap-3'>
            <h2 className='text-base font-semibold'>Registro histórico</h2>

            <div className='flex items-center gap-2'>
              <div className='text-xs text-zinc-500'>{gest.length} registros</div>

              <button
                type='button'
                onClick={imprimirHistorial}
                className='rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50'
              >
                Imprimir
              </button>
            </div>
          </div>

          <div id='print-historial' className='rounded-2xl border border-zinc-200 bg-white p-4 bg-soft-gray'>
            {gest.length === 0 ? (
              <div className='text-sm text-zinc-500'>Sin movimientos.</div>
            ) : (
              <ol className='space-y-4'>
                {gest.map(g => (
                  <li key={g.id} className='relative pl-6'>
                    <span className='historial-element absolute left-0 top-1.5 h-2 w-2 rounded-full bg-zinc-900' />
                    <div className='flex items-start justify-between gap-3'>
                      <div className='text-sm font-medium max-w-[1100px]'>{g.gestion ?? '—'}</div>
                      <div className='text-xs text-zinc-500 fecha-historial'>{formatDateDMY(g.fecha)}</div>
                    </div>
                    <div className='mt-1 text-xs text-zinc-600'>
                      {g.se_giro_a ? `Se giró a: ${g.se_giro_a}` : null}
                      {g.se_giro_a && g.dependencia_actual ? ' · ' : null}
                      {g.dependencia_actual ? `Dep. actual: ${g.dependencia_actual}` : null}
                    </div>
                    {g.last_user_update ? (
                      <div className='mt-1 text-[11px] text-zinc-500'>
                        Usuario: <span className='font-medium text-zinc-700'>{g.last_user_update}</span>
                      </div>
                    ) : null}                   
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}