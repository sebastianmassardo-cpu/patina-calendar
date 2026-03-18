'use client';

import { useEffect, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { supabase } from '@/lib/supabase';

type OrderRow = {
  id: string;
  comprador: string;
  deadline: string;
  dias_restantes: number | null;
  copas: number | null;
  estado_pago: string | null;
  por_pagar: string | null;
  tipo_entrega: string | null;
  nota: string | null;
  urgency: string | null;
  color: string | null;
};

type SelectedEvent = {
  title: string;
  start: string;
  comprador: string;
  copas: number;
  diasRestantes: number;
  estadoPago: string;
  porPagar: string;
  tipoEntrega: string;
  nota: string;
  urgency: string;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
  extendedProps: Omit<SelectedEvent, 'title' | 'start'>;
};

function fallbackColor(urgency: string | null) {
  if (urgency === 'urgent') return '#dc2626';
  if (urgency === 'soon') return '#f97316';
  if (urgency === 'attention') return '#eab308';
  return '#2563eb';
}

export default function SupabaseCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(null);
  const [updatedAt, setUpdatedAt] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function loadEvents() {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('deadline', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      setErrorMessage(error.message);
      return;
    }

    setErrorMessage('');

    const mapped: CalendarEvent[] = (data as OrderRow[]).map((row) => ({
      id: row.id,
      title: `${row.id} - ${row.comprador} - ${row.copas ?? 0} copas`,
      start: row.deadline,
      allDay: true,
      backgroundColor: row.color || fallbackColor(row.urgency),
      borderColor: row.color || fallbackColor(row.urgency),
      extendedProps: {
        comprador: row.comprador,
        copas: row.copas ?? 0,
        diasRestantes: row.dias_restantes ?? 0,
        estadoPago: row.estado_pago ?? '',
        porPagar: row.por_pagar ?? '',
        tipoEntrega: row.tipo_entrega ?? '',
        nota: row.nota ?? '',
        urgency: row.urgency ?? 'normal',
      },
    }));

    setEvents(mapped);
    setUpdatedAt(new Date().toISOString());
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadEvents();
    }, 0);

    const interval = window.setInterval(() => {
      void loadEvents();
    }, 30000);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, []);

  const formattedUpdatedAt = useMemo(() => {
    if (!updatedAt) return 'Waiting for data...';
    return new Date(updatedAt).toLocaleString();
  }, [updatedAt]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Patina Orders Calendar
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Live calendar powered by Supabase
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Excel changes continue syncing from the watcher running on this PC.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Last update: {formattedUpdatedAt}
          </p>
          {errorMessage ? (
            <p className="mt-2 text-sm text-red-600">
              Supabase error: {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-3xl bg-white p-3 shadow-sm md:p-5">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek',
              }}
              events={events}
              height="auto"
              eventClick={(info) => {
                const nextSelectedEvent = {
                  title: info.event.title,
                  start: info.event.startStr,
                  ...(info.event.extendedProps as CalendarEvent['extendedProps']),
                } satisfies SelectedEvent;

                setSelectedEvent(nextSelectedEvent);
              }}
            />
          </div>

          <aside className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Order details
            </h2>

            {!selectedEvent ? (
              <p className="mt-4 text-sm text-slate-500">
                Tap or click an order to view details.
              </p>
            ) : (
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">
                  {selectedEvent.title}
                </div>
                <div><strong>Deadline:</strong> {selectedEvent.start}</div>
                <div><strong>Buyer:</strong> {selectedEvent.comprador}</div>
                <div><strong>Cups:</strong> {selectedEvent.copas}</div>
                <div><strong>Days remaining:</strong> {selectedEvent.diasRestantes}</div>
                <div><strong>Payment status:</strong> {selectedEvent.estadoPago}</div>
                <div><strong>Amount due:</strong> {selectedEvent.porPagar || '-'}</div>
                <div><strong>Delivery type:</strong> {selectedEvent.tipoEntrega}</div>
                <div><strong>Urgency:</strong> {selectedEvent.urgency}</div>
                <div><strong>Note:</strong> {selectedEvent.nota || '-'}</div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
