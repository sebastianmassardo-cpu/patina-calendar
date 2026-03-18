export type OrderRow = {
  id: string;
  comprador: string;
  deadline: string;
  dias_restantes: number | null;
  copas: number | null;
  estado_pago: string | null;
  por_pagar: string | null;
  estado_orden: string | null;
  tipo_entrega: string | null;
  nota: string | null;
  urgency: string | null;
  color: string | null;
};

export type Order = {
  id: string;
  buyer: string;
  deadline: string;
  daysRemaining: number;
  cups: number;
  paymentStatus: string;
  amountDue: string;
  orderStatus: string;
  deliveryType: string;
  note: string;
  urgency: string;
  color: string;
  completed: boolean;
  title: string;
};

export function fallbackColor(urgency: string | null) {
  if (urgency === 'urgent') return '#c35a37';
  if (urgency === 'soon') return '#d88a3d';
  if (urgency === 'attention') return '#c7a458';
  return '#4f7b67';
}

export function normalizeText(value: string | null) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isZeroAmount(value: string | null) {
  const digits = String(value ?? '').match(/\d/g);
  if (!digits?.length) return false;
  return digits.every((digit) => digit === '0');
}

export function isCompletedOrder(
  paymentStatus: string | null,
  amountDue: string | null,
  orderStatus: string | null
) {
  return (
    normalizeText(paymentStatus) === 'pagado' &&
    isZeroAmount(amountDue) &&
    normalizeText(orderStatus) === 'entregado'
  );
}

export function getUrgencyLabel(urgency: string) {
  if (urgency === 'urgent') return 'Urgent';
  if (urgency === 'soon') return 'Soon';
  if (urgency === 'attention') return 'Attention';
  return 'Normal';
}

export function formatOrderDate(dateString: string) {
  if (!dateString) return '-';

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
}

export function formatDaysRemaining(daysRemaining: number) {
  if (daysRemaining <= 0) return 'Due now';
  if (daysRemaining === 1) return '1 day left';
  return `${daysRemaining} days left`;
}

export function mapOrderRow(row: OrderRow): Order {
  const buyer = row.comprador ?? '';
  const cups = row.copas ?? 0;
  const paymentStatus = row.estado_pago ?? '';
  const amountDue = row.por_pagar ?? '';
  const orderStatus = row.estado_orden ?? '';
  const urgency = row.urgency ?? 'normal';

  return {
    id: row.id,
    buyer,
    deadline: row.deadline,
    daysRemaining: row.dias_restantes ?? 0,
    cups,
    paymentStatus,
    amountDue,
    orderStatus,
    deliveryType: row.tipo_entrega ?? '',
    note: row.nota ?? '',
    urgency,
    color: row.color || fallbackColor(urgency),
    completed: isCompletedOrder(paymentStatus, amountDue, orderStatus),
    title: `${row.id} - ${buyer}`,
  };
}
