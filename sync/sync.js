require('dotenv').config();
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EXCEL_FILE = process.env.EXCEL_FILE;
const SHEET_NAME = process.env.SHEET_NAME;

function parseExcelDate(value) {
  if (!value) return null;

  if (value instanceof Date && !isNaN(value)) {
    return value;
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const normalized = trimmed.replace(/\//g, '-');
    const parts = normalized.split('-');

    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts.map(Number);
      if (dd && mm && yyyy) {
        const dt = new Date(yyyy, mm - 1, dd);
        if (!isNaN(dt)) return dt;
      }
    }

    const fallback = new Date(trimmed);
    if (!isNaN(fallback)) return fallback;
  }

  return null;
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getUrgency(daysRemaining) {
  const n = Number(daysRemaining);
  if (isNaN(n)) return 'unknown';
  if (n <= 3) return 'urgent';
  if (n <= 10) return 'soon';
  if (n <= 30) return 'attention';
  return 'normal';
}

function getColor(daysRemaining) {
  const urgency = getUrgency(daysRemaining);
  if (urgency === 'urgent') return '#dc2626';
  if (urgency === 'soon') return '#f97316';
  if (urgency === 'attention') return '#eab308';
  return '#2563eb';
}

function cleanText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function getValue(row, ...possibleKeys) {
  for (const key of possibleKeys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key];
    }
  }
  return '';
}

function isRealRow(row) {
  const id = cleanText(getValue(row, 'ID Orden'));
  const buyer = cleanText(getValue(row, 'Comprador'));
  const deadline = cleanText(getValue(row, 'Deadline'));

  if (!id || id === '0') return false;
  if (!buyer || buyer === '0') return false;
  if (!deadline || deadline === '0') return false;

  return true;
}

async function syncOrders() {
  const workbook = XLSX.readFile(EXCEL_FILE, { cellDates: true });
  const sheet = workbook.Sheets[SHEET_NAME];

  if (!sheet) {
    throw new Error(`Sheet "${SHEET_NAME}" not found`);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const orders = rows
    .filter(isRealRow)
    .map((row) => {
      const deadlineDate = parseExcelDate(getValue(row, 'Deadline'));
      if (!deadlineDate) return null;

      const id = cleanText(getValue(row, 'ID Orden'));
      const comprador = cleanText(getValue(row, 'Comprador'));
      const dias_restantes = Number(getValue(row, 'Dias Restantes') || 0);
      const copas = Number(getValue(row, 'Copas') || 0);
      const estado_pago = cleanText(getValue(row, 'Estado Pago'));
      const por_pagar = cleanText(getValue(row, 'Por Pagar', ' Por Pagar ', 'Por Pagar '));
      const tipo_entrega = cleanText(getValue(row, 'Tipo Entrega'));
      const nota = cleanText(getValue(row, 'Nota'));

      return {
        id,
        comprador,
        deadline: formatDateISO(deadlineDate),
        dias_restantes,
        copas,
        estado_pago,
        por_pagar,
        tipo_entrega,
        nota,
        urgency: getUrgency(dias_restantes),
        color: getColor(dias_restantes),
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  if (!orders.length) {
    console.log('No valid orders found.');
    return;
  }

  const { error } = await supabase.from('orders').upsert(orders, {
    onConflict: 'id',
  });

  if (error) {
    throw error;
  }

  console.log(`Synced ${orders.length} orders successfully.`);
}

module.exports = { syncOrders };

if (require.main === module) {
  syncOrders().catch((err) => {
    console.error('Sync failed:', err);
  });
}