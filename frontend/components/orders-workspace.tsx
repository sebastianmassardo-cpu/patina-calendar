'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { supabase } from '@/lib/supabase';
import {
  type Order,
  type OrderRow,
  fallbackColor,
  formatDaysRemaining,
  formatOrderDate,
  getUrgencyLabel,
  isZeroAmount,
  mapOrderRow,
  normalizeText,
} from '@/lib/orders';

type OrdersWorkspaceProps = {
  view: 'calendar' | 'orders';
};

type OrderFilter = 'all' | 'open' | 'completed' | 'urgent';

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function paymentTone(paymentStatus: string) {
  const normalized = normalizeText(paymentStatus);

  if (normalized === 'pagado') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalized === 'abonado') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-rose-200 bg-rose-50 text-rose-700';
}

function orderTone(orderStatus: string) {
  const normalized = normalizeText(orderStatus);

  if (normalized === 'entregado') {
    return 'border-slate-200 bg-slate-100 text-slate-700';
  }

  if (normalized === 'en proceso') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  return 'border-stone-200 bg-stone-100 text-stone-700';
}

function urgencyTone(urgency: string) {
  if (urgency === 'urgent') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  if (urgency === 'soon') {
    return 'border-orange-200 bg-orange-50 text-orange-700';
  }

  if (urgency === 'attention') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function completionTone(completed: boolean) {
  if (completed) {
    return 'border-slate-300 bg-slate-100 text-slate-700';
  }

  return 'border-[#d7c1ad] bg-white/80 text-[#6b5748]';
}

function filterLabel(filter: OrderFilter) {
  if (filter === 'open') return 'In progress';
  if (filter === 'completed') return 'Completed';
  if (filter === 'urgent') return 'Urgent';
  return 'All orders';
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: string;
}) {
  return (
    <span
      className={joinClasses(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.04em]',
        tone
      )}
    >
      {label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/70 bg-white/70 p-4 shadow-[0_16px_40px_rgba(84,54,34,0.08)] backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8f7766]">
        {label}
      </p>
      <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#24313a]">
        {value}
      </div>
      <p className="mt-2 text-sm text-[#6d6258]">
        {caption}
      </p>
    </div>
  );
}

function EmptyDetailState({
  orders,
  onPickOrder,
}: {
  orders: Order[];
  onPickOrder: (orderId: string) => void;
}) {
  const focusOrders = orders
    .filter((order) => !order.completed)
    .slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,250,243,0.98),rgba(245,235,223,0.92))] p-6 shadow-[0_22px_50px_rgba(84,54,34,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a7d68]">
          Detail panel
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#24313a]">
          Pick an order to inspect the full resume
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#6a5e55]">
          Click any event in the calendar or any card in the orders view to see payment, delivery, urgency, and notes in one place.
        </p>
      </div>

      <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_40px_rgba(84,54,34,0.07)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7d68]">
          Upcoming focus
        </p>
        <h3 className="mt-1 text-lg font-semibold text-[#24313a]">
          Next orders to watch
        </h3>

        <div className="mt-4 space-y-3">
          {focusOrders.length ? (
            focusOrders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => onPickOrder(order.id)}
                className="flex w-full items-center justify-between rounded-2xl border border-[#eadfce] bg-[#fffaf3] px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-[#d6b59f] hover:shadow-[0_16px_30px_rgba(84,54,34,0.08)]"
              >
                <div>
                  <div className="font-semibold text-[#24313a]">
                    {order.id}
                  </div>
                  <div className="text-sm text-[#6d6258]">
                    {order.buyer}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-[#24313a]">
                    {formatOrderDate(order.deadline)}
                  </div>
                  <div className="text-xs text-[#9a7d68]">
                    {formatDaysRemaining(order.daysRemaining)}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-[#dac6b5] bg-[#fffaf3] px-4 py-6 text-sm text-[#6d6258]">
              All current orders are marked as completed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderDetailPanel({
  order,
  orders,
  onPickOrder,
}: {
  order: Order | null;
  orders: Order[];
  onPickOrder: (orderId: string) => void;
}) {
  if (!order) {
    return <EmptyDetailState orders={orders} onPickOrder={onPickOrder} />;
  }

  return (
    <div className="rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,250,243,0.98),rgba(250,241,231,0.92))] p-6 shadow-[0_26px_60px_rgba(84,54,34,0.1)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a7d68]">
            Order resume
          </p>
          <h2
            className={joinClasses(
              'mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#24313a]',
              order.completed && 'opacity-60 line-through'
            )}
          >
            {order.id}
          </h2>
          <p className="mt-2 text-base text-[#6a5e55]">
            {order.buyer}
          </p>
        </div>

        <div className="rounded-2xl border border-[#eadfce] bg-white/80 px-4 py-3 text-right shadow-[0_12px_24px_rgba(84,54,34,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7d68]">
            Deadline
          </p>
          <p className="mt-2 text-lg font-semibold text-[#24313a]">
            {formatOrderDate(order.deadline)}
          </p>
          <p className="mt-1 text-sm text-[#6d6258]">
            {formatDaysRemaining(order.daysRemaining)}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <StatusPill
          label={order.completed ? 'Completed' : 'Active'}
          tone={completionTone(order.completed)}
        />
        <StatusPill
          label={order.paymentStatus || 'Payment pending'}
          tone={paymentTone(order.paymentStatus)}
        />
        <StatusPill
          label={order.orderStatus || 'Order status pending'}
          tone={orderTone(order.orderStatus)}
        />
        <StatusPill
          label={getUrgencyLabel(order.urgency)}
          tone={urgencyTone(order.urgency)}
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#eadfce] bg-white/85 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7d68]">
            Cups
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#24313a]">
            {order.cups}
          </p>
        </div>

        <div className="rounded-2xl border border-[#eadfce] bg-white/85 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7d68]">
            Amount due
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#24313a]">
            {order.amountDue || '0'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#eadfce] bg-white/85 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7d68]">
            Delivery
          </p>
          <p className="mt-2 text-base font-semibold text-[#24313a]">
            {order.deliveryType || '-'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#eadfce] bg-white/85 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7d68]">
            Remaining
          </p>
          <p className="mt-2 text-base font-semibold text-[#24313a]">
            {formatDaysRemaining(order.daysRemaining)}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-[24px] border border-[#eadfce] bg-white/85 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7d68]">
              Buyer
            </p>
            <p className="mt-2 text-sm leading-6 text-[#24313a]">
              {order.buyer}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7d68]">
              Order status
            </p>
            <p className="mt-2 text-sm leading-6 text-[#24313a]">
              {order.orderStatus || '-'}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7d68]">
              Payment status
            </p>
            <p className="mt-2 text-sm leading-6 text-[#24313a]">
              {order.paymentStatus || '-'}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7d68]">
              Note
            </p>
            <p className="mt-2 text-sm leading-6 text-[#24313a]">
              {order.note || 'No note registered for this order.'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[24px] border border-dashed border-[#d8c4b4] bg-[#fffaf3] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7d68]">
          Quick action
        </p>
        <p className="mt-2 text-sm leading-6 text-[#6a5e55]">
          This order stays visible even when fully completed, so you keep the history without cluttering active tracking.
        </p>
      </div>
    </div>
  );
}

export default function OrdersWorkspace({ view }: OrdersWorkspaceProps) {
  const pathname = usePathname();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<OrderFilter>('all');

  async function loadOrders() {
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
    setOrders((data as OrderRow[]).map(mapOrderRow));
    setUpdatedAt(new Date().toISOString());
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadOrders();
    }, 0);

    const interval = window.setInterval(() => {
      void loadOrders();
    }, 30000);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, []);

  const totalOrders = orders.length;
  const activeOrders = orders.filter((order) => !order.completed);
  const completedOrders = orders.filter((order) => order.completed);
  const urgentOrders = activeOrders.filter((order) => (
    order.urgency === 'urgent' || order.urgency === 'soon'
  ));
  const paymentPendingOrders = activeOrders.filter((order) => !isZeroAmount(order.amountDue));
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;

  const searchTerm = search.trim().toLowerCase();
  const filteredOrders = orders
    .filter((order) => {
      if (filter === 'open' && order.completed) return false;
      if (filter === 'completed' && !order.completed) return false;
      if (filter === 'urgent' && !['urgent', 'soon'].includes(order.urgency)) return false;

      if (!searchTerm) return true;

      const haystack = [
        order.id,
        order.buyer,
        order.paymentStatus,
        order.orderStatus,
        order.deliveryType,
        order.note,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(searchTerm);
    })
    .sort((left, right) => {
      if (left.completed !== right.completed) {
        return left.completed ? 1 : -1;
      }

      return left.deadline.localeCompare(right.deadline);
    });

  const formattedUpdatedAt = updatedAt
    ? new Date(updatedAt).toLocaleString()
    : 'Waiting for data...';

  const calendarEvents = orders.map((order) => ({
    id: order.id,
    title: order.title,
    start: order.deadline,
    allDay: true,
    backgroundColor: order.color || fallbackColor(order.urgency),
    borderColor: order.color || fallbackColor(order.urgency),
    extendedProps: {
      order,
      completed: order.completed,
    },
  }));

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-[1380px]">
        <section className="relative overflow-hidden rounded-[36px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,250,243,0.98),rgba(239,226,207,0.88))] p-6 shadow-[0_28px_90px_rgba(84,54,34,0.12)] md:p-8">
          <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[#c8704d]/15 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-36 w-36 rounded-full bg-[#6e8b74]/16 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8b705c] shadow-[0_12px_25px_rgba(84,54,34,0.06)]">
                Patina workflow
              </div>

              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-[#24313a] md:text-5xl">
                Track every order without losing the finished ones
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-[#645951]">
                The calendar stays tied to Supabase, and Supabase keeps receiving updates from the Excel watcher running on this PC. This refresh only changes how the data is viewed.
              </p>

              <div className="mt-5 flex flex-wrap gap-3 text-sm text-[#6d6258]">
                <span className="rounded-full border border-white/80 bg-white/70 px-4 py-2 shadow-[0_12px_25px_rgba(84,54,34,0.05)]">
                  Last sync seen: {formattedUpdatedAt}
                </span>
                <span className="rounded-full border border-white/80 bg-white/70 px-4 py-2 shadow-[0_12px_25px_rgba(84,54,34,0.05)]">
                  Auto-refreshing every 30 seconds
                </span>
              </div>
            </div>

            <div className="flex flex-col items-start gap-4 xl:items-end">
              <nav className="inline-flex rounded-full border border-white/80 bg-white/75 p-1 shadow-[0_16px_32px_rgba(84,54,34,0.08)] backdrop-blur">
                <Link
                  href="/supabase-calendar"
                  className={joinClasses(
                    'rounded-full px-5 py-2.5 text-sm font-semibold transition',
                    pathname === '/supabase-calendar'
                      ? 'bg-[#24313a] text-white shadow-[0_10px_22px_rgba(36,49,58,0.22)]'
                      : 'text-[#5e5248] hover:bg-white/80'
                  )}
                >
                  Calendar
                </Link>
                <Link
                  href="/orders"
                  className={joinClasses(
                    'rounded-full px-5 py-2.5 text-sm font-semibold transition',
                    pathname === '/orders'
                      ? 'bg-[#24313a] text-white shadow-[0_10px_22px_rgba(36,49,58,0.22)]'
                      : 'text-[#5e5248] hover:bg-white/80'
                  )}
                >
                  Orders
                </Link>
              </nav>

              <p className="text-sm text-[#716359]">
                View: <span className="font-semibold text-[#24313a]">{view === 'calendar' ? 'Calendar board' : 'Orders board'}</span>
              </p>
            </div>
          </div>

          <div className="relative mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total orders"
              value={String(totalOrders)}
              caption="Everything currently synced from the spreadsheet."
            />
            <MetricCard
              label="In progress"
              value={String(activeOrders.length)}
              caption="Still active and visible in the tracking flow."
            />
            <MetricCard
              label="Need attention"
              value={String(urgentOrders.length)}
              caption="Urgent or soon deadlines that deserve a closer look."
            />
            <MetricCard
              label="Open payments"
              value={String(paymentPendingOrders.length)}
              caption="Orders that still show an outstanding amount due."
            />
          </div>
        </section>

        {errorMessage ? (
          <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-[0_12px_28px_rgba(127,29,29,0.08)]">
            Supabase error: {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_380px]">
          <section className="space-y-6">
            {view === 'calendar' ? (
              <div className="rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,252,247,0.96),rgba(246,236,222,0.88))] p-5 shadow-[0_24px_60px_rgba(84,54,34,0.08)] md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7d68]">
                      Calendar board
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#24313a]">
                      Deadline view with completed orders still visible
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#6a5e55]">
                      Finished orders stay on the board with a strike-through so the workflow is cleaner without losing history.
                    </p>
                  </div>

                  <div className="rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-semibold text-[#6b5748] shadow-[0_12px_25px_rgba(84,54,34,0.06)]">
                    {completedOrders.length} completed still visible
                  </div>
                </div>

                <div className="mt-6 overflow-hidden rounded-[28px] border border-white/80 bg-white/75 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                      left: 'prev,next today',
                      center: 'title',
                      right: 'dayGridMonth,timeGridWeek',
                    }}
                    buttonText={{
                      today: 'Today',
                      dayGridMonth: 'Month',
                      timeGridWeek: 'Week',
                    }}
                    events={calendarEvents}
                    eventDisplay="block"
                    dayMaxEventRows={4}
                    height="auto"
                    eventClassNames={(arg) => (
                      arg.event.extendedProps.completed ? ['completed-order'] : []
                    )}
                    eventContent={(info) => {
                      const order = info.event.extendedProps.order as Order;

                      return (
                        <div className="flex min-w-0 items-center gap-2 overflow-hidden rounded-full px-2 py-1 text-[11px] md:text-xs">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/60 bg-white/85" />
                          <span
                            className={joinClasses(
                              'truncate font-semibold text-white',
                              order.completed && 'opacity-70 line-through'
                            )}
                          >
                            {order.title}
                          </span>
                        </div>
                      );
                    }}
                    eventClick={(info) => {
                      setSelectedOrderId(info.event.id);
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,252,247,0.96),rgba(246,236,222,0.9))] p-5 shadow-[0_24px_60px_rgba(84,54,34,0.08)] md:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7d68]">
                      Orders board
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#24313a]">
                      Friendly tracking view for every synced order
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#6a5e55]">
                      Search across buyers and order IDs, then narrow the list by active, completed, or urgent work.
                    </p>
                  </div>

                  <div className="rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-semibold text-[#6b5748] shadow-[0_12px_25px_rgba(84,54,34,0.06)]">
                    Showing {filteredOrders.length} of {orders.length} orders
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <label className="block w-full xl:max-w-md">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7d68]">
                      Search
                    </span>
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Order, buyer, delivery, note..."
                      className="w-full rounded-2xl border border-[#dfcfbe] bg-white/90 px-4 py-3 text-sm text-[#24313a] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition focus:border-[#c2987f] focus:ring-2 focus:ring-[#c2987f]/20"
                    />
                  </label>

                  <div className="w-full xl:w-auto">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7d68]">
                      Filter
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(['all', 'open', 'completed', 'urgent'] as OrderFilter[]).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setFilter(item)}
                          className={joinClasses(
                            'rounded-full px-4 py-2 text-sm font-semibold transition',
                            filter === item
                              ? 'bg-[#24313a] text-white shadow-[0_12px_24px_rgba(36,49,58,0.2)]'
                              : 'border border-white/80 bg-white/80 text-[#65584e] hover:bg-white'
                          )}
                        >
                          {filterLabel(item)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {filteredOrders.length ? (
                    filteredOrders.map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => setSelectedOrderId(order.id)}
                        className={joinClasses(
                          'group relative w-full overflow-hidden rounded-[26px] border p-5 text-left shadow-[0_18px_35px_rgba(84,54,34,0.07)] transition',
                          selectedOrderId === order.id
                            ? 'border-[#c2987f] bg-white shadow-[0_22px_45px_rgba(84,54,34,0.12)]'
                            : 'border-white/80 bg-white/82 hover:-translate-y-0.5 hover:border-[#d5b9a3] hover:bg-white'
                        )}
                      >
                        <div
                          className="absolute inset-y-0 left-0 w-1.5"
                          style={{ backgroundColor: order.color }}
                        />

                        <div className="pl-3">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={joinClasses(
                                    'text-lg font-semibold tracking-[-0.03em] text-[#24313a]',
                                    order.completed && 'opacity-60 line-through'
                                  )}
                                >
                                  {order.id}
                                </span>
                                <StatusPill
                                  label={order.completed ? 'Completed' : 'Active'}
                                  tone={completionTone(order.completed)}
                                />
                                <StatusPill
                                  label={getUrgencyLabel(order.urgency)}
                                  tone={urgencyTone(order.urgency)}
                                />
                              </div>

                              <p className="mt-2 text-base text-[#5f544c]">
                                {order.buyer}
                              </p>
                            </div>

                            <div className="text-left lg:text-right">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7d68]">
                                Deadline
                              </p>
                              <p className="mt-2 text-base font-semibold text-[#24313a]">
                                {formatOrderDate(order.deadline)}
                              </p>
                              <p className="mt-1 text-sm text-[#6a5e55]">
                                {formatDaysRemaining(order.daysRemaining)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl bg-[#fbf5ec] px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a7d68]">
                                Payment
                              </p>
                              <p className="mt-2 text-sm font-semibold text-[#24313a]">
                                {order.paymentStatus || '-'}
                              </p>
                              <p className="mt-1 text-xs text-[#6a5e55]">
                                Due: {order.amountDue || '0'}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-[#fbf5ec] px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a7d68]">
                                Order status
                              </p>
                              <p className="mt-2 text-sm font-semibold text-[#24313a]">
                                {order.orderStatus || '-'}
                              </p>
                              <p className="mt-1 text-xs text-[#6a5e55]">
                                Delivery: {order.deliveryType || '-'}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-[#fbf5ec] px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a7d68]">
                                Cups
                              </p>
                              <p className="mt-2 text-sm font-semibold text-[#24313a]">
                                {order.cups}
                              </p>
                              <p className="mt-1 text-xs text-[#6a5e55]">
                                {order.completed ? 'Archived visibly' : 'Still active on board'}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-[#fbf5ec] px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a7d68]">
                                Quick note
                              </p>
                              <p className="mt-2 text-sm text-[#24313a]">
                                {order.note || 'No note'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[26px] border border-dashed border-[#d9c6b5] bg-[#fffaf3] px-5 py-10 text-center text-sm text-[#6d6258]">
                      No orders match the current search and filter.
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <aside>
            <OrderDetailPanel
              order={selectedOrder}
              orders={orders}
              onPickOrder={setSelectedOrderId}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}
