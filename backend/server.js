const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');

const app = express();
app.use(cors());

const EXCEL_FILE = 'C:/Users/sebas/OneDrive/Documentos/Pátina/Planilla Patina.xlsx';
const SHEET_NAME = 'Calendario';

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

function getOrdersFromExcel() {
  const workbook = XLSX.readFile(EXCEL_FILE, { cellDates: true });
  const sheet = workbook.Sheets[SHEET_NAME];

  if (!sheet) {
    throw new Error(`Sheet "${SHEET_NAME}" not found in Excel file`);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rows
    .filter(isRealRow)
    .map((row) => {
      const deadlineDate = parseExcelDate(getValue(row, 'Deadline'));
      if (!deadlineDate) return null;

      const orderId = cleanText(getValue(row, 'ID Orden'));
      const buyer = cleanText(getValue(row, 'Comprador'));
      const cups = Number(getValue(row, 'Copas') || 0);
      const daysRemaining = Number(getValue(row, 'Dias Restantes') || 0);
      const paymentStatus = cleanText(getValue(row, 'Estado Pago'));
      const amountDue = cleanText(getValue(row, 'Por Pagar', ' Por Pagar ', 'Por Pagar '));
      const deliveryType = cleanText(getValue(row, 'Tipo Entrega'));
      const note = cleanText(getValue(row, 'Nota'));

      return {
        id: orderId,
        title: `${orderId} · ${buyer} · ${cups} copas`,
        start: formatDateISO(deadlineDate),
        allDay: true,
        backgroundColor: getColor(daysRemaining),
        borderColor: getColor(daysRemaining),
        extendedProps: {
          comprador: buyer,
          copas: cups,
          diasRestantes: daysRemaining,
          estadoPago: paymentStatus,
          porPagar: amountDue,
          tipoEntrega: deliveryType,
          nota: note,
          urgency: getUrgency(daysRemaining)
        }
      };
    })
    .filter(Boolean);
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/events', (req, res) => {
  try {
    const events = getOrdersFromExcel();
    res.json({
      events,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message
    });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});