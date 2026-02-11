'use client';

import { Fragment, useMemo } from 'react';
import { Listbox, Transition } from '@headlessui/react';

type Option = {
  value: string;
  label: string;
  className?: string;
};

function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function badgeClassFromValue(value: string) {
  const v = normalize(value);

  if (v.includes('PENDIENTE')) return 'badge badge-pendiente width-100-percent';
  if (v.includes('TRAMITE')) return 'badge badge-tramite width-100-percent';
  if (v.includes('FINALIZO')) return 'badge badge-finalizado width-100-percent';

  return 'badge bg-zinc-100 text-zinc-700';
}

export default function EtiquetaSelect({
  value,
  options,
  disabled,
  onChange,
  className = '',
}: {
  value: string | null;
  options: string[];
  disabled?: boolean;
  onChange: (next: string | null) => void;
  className?: string;
}) {
  const opts: Option[] = useMemo(() => {
    return options.map(o => ({
      value: o,
      label: o,
      className: badgeClassFromValue(o),
    }));
  }, [options]);

  const selected = opts.find(o => o.value === (value ?? '')) ?? null;

  return (
    <Listbox value={value ?? ''} onChange={v => onChange(v ? v : null)} disabled={disabled}>
      <div className={'relative ' + className}>
        <Listbox.Button
          className={
            // 👇 botón multilinea + espacio para flecha
            'button-badge-selector flex w-full items-start justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 pr-8 text-left text-xs outline-none ' +
            'min-h-[44px] leading-4 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60'
          }
        >
          <span className="flex-1">
            {selected ? (
              <span
                className={
                  'inline-flex max-w-full whitespace-normal break-words ' +
                  selected.className
                }
              >
                <span className="block whitespace-normal break-words leading-4 padding-right-20">
                  {selected.label}
                </span>
              </span>
            ) : (
              <span className="text-zinc-400 separador-none">—</span>
            )}
          </span>

          {/* 🔻 Flecha dropdown */}
          <svg
            className="mt-[2px] h-4 w-4 shrink-0 text-zinc-500 flecha-svg"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Listbox.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Listbox.Options
            className={
              'absolute z-50 mt-2 max-h-72 w-[380px] overflow-auto rounded-xl border border-zinc-200 ' +
              'bg-white p-1 shadow-lg focus:outline-none'
            }
          >

            {opts.map(o => (
              <Listbox.Option
                key={o.value}
                value={o.value}
                className={({ active }) =>
                  'cursor-pointer rounded-lg px-3 py-2 ' +
                  (active ? 'bg-zinc-100' : '')
                }
              >
                <div className="flex items-start gap-2">
                  <span className={'mt-0.5 inline-flex ' + o.className}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                  </span>

                  <span className="text-xs leading-4 text-zinc-800 whitespace-normal break-words padding-top-3">
                    {o.label}
                  </span>
                </div>
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}