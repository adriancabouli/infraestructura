'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';

export default function NuevoExpedientePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [expteCode, setExpteCode] = useState('');
  const [anio, setAnio] = useState<string>('');
  const [edificio, setEdificio] = useState('');
  const [caratula, setCaratula] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [tipoTramite, setTipoTramite] = useState('');
  const [seGiroA, setSeGiroA] = useState('');
  const [dependenciaActual, setDependenciaActual] = useState('');
  const [ultimaGestion, setUltimaGestion] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [numeroResolucion, setNumeroResolucion] = useState('');

  function limpiarFormulario() {
    setExpteCode('');
    setAnio('');
    setEdificio('');
    setCaratula('');
    setEtiqueta('');
    setTipoTramite('');
    setSeGiroA('');
    setDependenciaActual('');
    setUltimaGestion('');
    setFechaIngreso('');
    setNumeroResolucion(''); 
    setErr(null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/login');
    });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const anioNum = anio.trim() === '' ? null : Number(anio);
    if (anioNum !== null && Number.isNaN(anioNum)) {
      setLoading(false);
      setErr('Año inválido');
      return;
    }

    const { data, error } = await supabase
      .from('expedientes')
      .insert({
        expte_code: expteCode.trim() || null,
        anio: anioNum,
        fecha_ingreso: fechaIngreso ? fechaIngreso : null,
        edificio: edificio.trim() || null,
        caratula: caratula.trim() || null,
        etiqueta: etiqueta.trim() || null,
        tipo_tramite: tipoTramite.trim() || null,
        se_giro_a: seGiroA.trim() || null,
        dependencia_actual: dependenciaActual.trim() || null,
        ultima_gestion: ultimaGestion.trim() || null,
        resolucion: numeroResolucion.trim() || null,
      })
      .select('id')
      .single();

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    router.push(`/expedientes/${data.id}`);
  }

  return (
    <AppShell
      title="Nuevo expediente"
      right={
        <Link className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50" href="/expedientes">
          Volver
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-zinc-600">N° Expediente:</label>
            <input
              value={expteCode}
              onChange={e => setExpteCode(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="Ej: 153624"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600">Año</label>
            <input
              value={anio}
              onChange={e => setAnio(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="Ej: 2025"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600">Fecha de ingreso</label>
            <input
              type="date"
              value={fechaIngreso}
              onChange={e => setFechaIngreso(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600">Edificio</label>
            <input
              value={edificio}
              onChange={e => setEdificio(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="Ej: PALACIO - TALCAHUANO 550"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600">Etiqueta</label>
            <select
              value={etiqueta}
              onChange={e => setEtiqueta(e.target.value)}
              className="select-arrow mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            >
              <option value="">Seleccionar…</option>
              <option value="PENDIENTE RESOLVER">PENDIENTE RESOLVER</option>
              <option value="EN TRÁMITE PARA ESTA DIRECCIÓN">EN TRÁMITE PARA ESTA DIRECCIÓN</option>
              <option value="FINALIZÓ PARA ESTA DIRECCIÓN">FINALIZÓ PARA ESTA DIRECCIÓN</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600">N° Resolución</label>
            <input
              value={numeroResolucion}
              onChange={e => setNumeroResolucion(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="Ej: 123/2025"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium text-zinc-600">Carátula / Referencia</label>
            <input
              value={caratula}
              onChange={e => setCaratula(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="Descripción"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600">Trámite</label>
            <select
              value={tipoTramite}
              onChange={e => setTipoTramite(e.target.value)}
              className="select-arrow mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            >
              <option value="">Seleccionar…</option>
              <option value="PE">PE</option>
              <option value="CD">CD</option>
              <option value="LP">LP</option>
              <option value="OTROS">Otros</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600">Se giró a</label>
            <input
              value={seGiroA}
              onChange={e => setSeGiroA(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600">Dependencia actual</label>
            <input
              value={dependenciaActual}
              onChange={e => setDependenciaActual(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600">Última gestión</label>
            <input
              value={ultimaGestion}
              onChange={e => setUltimaGestion(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={limpiarFormulario}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Limpiar formulario
        </button>

        <button
          disabled={loading}
          className="rounded-xl bg-[var(--brand-900)] px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {loading ? 'Guardando…' : 'Crear expediente'}
        </button>
      </div>
      </form>
    </AppShell>
  );
}