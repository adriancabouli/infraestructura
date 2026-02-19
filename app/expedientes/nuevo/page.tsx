'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import EdificiosMultiSelect from '@/components/EdificiosMultiSelect';

export default function NuevoExpedientePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState('');

  const [expteCode, setExpteCode] = useState('');
  const [anio, setAnio] = useState<string>('');
  const [edificioIds, setEdificioIds] = useState<string[]>([]);
  const [caratula, setCaratula] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [tipoTramite, setTipoTramite] = useState('');
  const [seGiroA, setSeGiroA] = useState('');
  const [dependenciaActual, setDependenciaActual] = useState('');
  const [ultimaGestion, setUltimaGestion] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [numeroResolucion, setNumeroResolucion] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  function isEmpty(v: string) {
    return !v || !v.trim();
  }

  function fieldClass(invalid: boolean) {
    return (
      'mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ' +
      (invalid
        ? 'border-red-300 focus:ring-red-500/10'
        : 'border-zinc-200 focus:ring-zinc-900/10')
    );
  }

  function limpiarFormulario() {
    setExpteCode('');
    setAnio('');
    setEdificioIds([]);
    setCaratula('');
    setEtiqueta('');
    setTipoTramite('');
    setSeGiroA('');
    setDependenciaActual('');
    setUltimaGestion('');
    setFechaIngreso('');
    setNumeroResolucion('');
    setErr(null);
    setSubmitted(false);
    setObservaciones('');
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/login');
        return;
      }

      setUserEmail(data.session.user?.email ?? null);
    });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setErr(null);

    // VALIDACIÓN CAMPOS OBLIGATORIOS
    const missing: string[] = [];

    if (isEmpty(expteCode)) missing.push('N° Expediente');
    if (isEmpty(anio)) missing.push('Año');
    if (!fechaIngreso) missing.push('Fecha de ingreso');
    if (!edificioIds || edificioIds.length === 0) missing.push('Edificio(s)');
    if (isEmpty(caratula)) missing.push('Carátula / Referencia');
    if (isEmpty(etiqueta)) missing.push('Etiqueta');
    if (isEmpty(numeroResolucion)) missing.push('N° Resolución');
    if (isEmpty(tipoTramite)) missing.push('Trámite');
    if (isEmpty(seGiroA)) missing.push('Se giró a');
    if (isEmpty(dependenciaActual)) missing.push('Dependencia actual');
    if (isEmpty(ultimaGestion)) missing.push('Última gestión');

    if (missing.length) {
      setErr('Faltan completar: ' + missing.join(', ') + '.');
      return;
    }

    const anioNum = Number(anio);
    if (Number.isNaN(anioNum)) {
      setErr('Año inválido');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('expedientes')
      .insert({
        activo: true,
        expte_code: expteCode.trim(),
        anio: anioNum,
        last_user_update: userEmail,
        fecha_ingreso: fechaIngreso,
        edificio: null,
        caratula: caratula.trim(),
        etiqueta: etiqueta.trim(),
        tipo_tramite: tipoTramite.trim(),
        se_giro_a: seGiroA.trim(),
        dependencia_actual: dependenciaActual.trim(),
        ultima_gestion: ultimaGestion.trim(),
        resolucion: numeroResolucion.trim(),
        observaciones: observaciones.trim(),
      })
      .select('id')
      .single();

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    if (edificioIds.length) {
      const payload = edificioIds.map(edificio_id => ({
        expediente_id: data.id,
        edificio_id,
      }));
    
      const { error: relErr } = await supabase
        .from('expediente_edificios')
        .insert(payload);
    
      if (relErr) {
        setErr(relErr.message);
        return;
      }
    }

    router.push(`/expedientes/${data.id}`);
  }

  return (
    <AppShell
      title="Ingresar nuevo"
      right={
        <Link
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
          href="/expedientes"
        >
          Volver
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-zinc-600">N° Expediente:</label>
            <input
              value={expteCode}
              onChange={e => setExpteCode(e.target.value)}
              className={fieldClass(submitted && isEmpty(expteCode))}
              placeholder="Ej: 153624"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600">Año</label>
            <input
              value={anio}
              onChange={e => setAnio(e.target.value)}
              className={fieldClass(submitted && isEmpty(anio))}
              placeholder="Ej: 2025"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600">Fecha de ingreso</label>
            <input
              type="date"
              value={fechaIngreso}
              onChange={e => setFechaIngreso(e.target.value)}
              className={fieldClass(submitted && !fechaIngreso)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600">Edificio(s)</label>
            <EdificiosMultiSelect
              valueIds={edificioIds}
              onChangeIds={setEdificioIds}
              disabled={loading}
              invalid={submitted && edificioIds.length === 0}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600">Etiqueta</label>
            <select
              value={etiqueta}
              onChange={e => setEtiqueta(e.target.value)}
              className={
                'select-arrow ' + fieldClass(submitted && isEmpty(etiqueta)) + ' pr-10'
              }
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
              className={fieldClass(submitted && isEmpty(numeroResolucion))}
              placeholder="Ej: 123/2025"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium text-zinc-600">Carátula / Referencia</label>
            <input
              value={caratula}
              onChange={e => setCaratula(e.target.value)}
              className={fieldClass(submitted && isEmpty(caratula))}
              placeholder="Descripción"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600">Trámite</label>
            <select
              value={tipoTramite}
              onChange={e => setTipoTramite(e.target.value)}
              className={
                'select-arrow ' + fieldClass(submitted && isEmpty(tipoTramite)) + ' pr-10'
              }
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
              className={fieldClass(submitted && isEmpty(seGiroA))}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600">Dependencia actual</label>
            <input
              value={dependenciaActual}
              onChange={e => setDependenciaActual(e.target.value)}
              className={fieldClass(submitted && isEmpty(dependenciaActual))}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600">Última gestión</label>
            <input
              value={ultimaGestion}
              onChange={e => setUltimaGestion(e.target.value)}
              className={fieldClass(submitted && isEmpty(ultimaGestion))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium text-zinc-600">
              Observaciones
            </label>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              className={fieldClass(false)}
              rows={3}
              placeholder="Notas internas…"
            />
          </div>         
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={limpiarFormulario}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 cursor-pointer"
          >
            Limpiar formulario
          </button>

          <button
            disabled={loading}
            className="rounded-xl bg-[var(--brand-900)] px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Guardando…' : 'Crear expediente'}
          </button>
        </div>
      </form>
    </AppShell>
  );
}