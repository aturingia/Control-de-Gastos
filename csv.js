const CATEGORIES = [
  'viáticos', 'despensas', 'servicios', 'suntuarios',
  'créditos', 'prestamos', 'refacciones', 'alquiler',
  'trabajo', 'sueldo', 'insumos', 'e-commerce', 'otros'
];

const CSV_COLUMNS = ['fecha', 'concepto', 'categoria', 'ingreso', 'egreso'];

function detectDelimiter(text) {
  const firstLine = text.split('\n')[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

function parseCSVLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseDate(str) {
  str = str.trim();
  let parts;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  parts = str.split('/');
  if (parts.length === 3) {
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
    return `${y}-${m}-${d}`;
  }
  parts = str.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  return null;
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) throw new Error('El archivo CSV está vacío o solo tiene encabezados');

  const delimiter = detectDelimiter(text);
  const headers = parseCSVLine(lines[0], delimiter).map(h => h.toLowerCase().trim());

  const missing = CSV_COLUMNS.filter(col => !headers.includes(col));
  if (missing.length > 0) {
    throw new Error(`Faltan columnas requeridas: ${missing.join(', ')}`);
  }

  const records = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line, delimiter);
    const raw = {};
    headers.forEach((h, idx) => { raw[h] = (values[idx] || '').trim(); });

    const fecha = parseDate(raw.fecha || '');
    if (!fecha) { errors.push(`Línea ${i + 1}: fecha inválida "${raw.fecha}"`); continue; }

    const concepto = (raw.concepto || '').replace(/^"|"$/g, '');
    if (!concepto) { errors.push(`Línea ${i + 1}: concepto vacío`); continue; }

    let categoria = (raw.categoria || '').toLowerCase().trim();
    if (!CATEGORIES.includes(categoria)) categoria = 'otros';

    const parseNum = str => {
      let s = (str || '0').replace(/[$\s]/g, '');
      if (s.includes(',')) {
        s = s.replace(/\./g, '').replace(',', '.');
      }
      return parseFloat(s) || 0;
    };
    const ingreso = parseNum(raw.ingreso);
    const egreso = parseNum(raw.egreso);

    if (ingreso === 0 && egreso === 0) {
      errors.push(`Línea ${i + 1}: debe tener ingreso o egreso mayor a 0`);
      continue;
    }

    records.push({ id: Date.now() + i, fecha, concepto, categoria, ingreso, egreso });
  }

  return { records, errors, total: lines.length - 1, imported: records.length };
}

function exportCSV(records) {
  const header = CSV_COLUMNS.join(',');
  const rows = records.map(r => {
    const concepto = r.concepto.includes(',') || r.concepto.includes('"')
      ? `"${r.concepto.replace(/"/g, '""')}"`
      : r.concepto;
    return [r.fecha, concepto, r.categoria, r.ingreso.toFixed(2), r.egreso.toFixed(2)].join(',');
  });
  const csv = '\uFEFF' + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gastos_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateSampleData() {
  const records = [];
  let id = 1;

  const add = (fecha, concepto, categoria, ingreso, egreso) => {
    records.push({ id: id++, fecha, concepto, categoria, ingreso, egreso });
  };

  add('2025-01-02', 'Sueldo mensual', 'sueldo', 45000, 0);
  add('2025-01-03', 'Supermercado mensual', 'despensas', 0, 3200.50);
  add('2025-01-05', 'Pago de alquiler', 'alquiler', 0, 8500);
  add('2025-01-08', 'Netflix', 'servicios', 0, 499);
  add('2025-01-10', 'Cena restaurante', 'suntuarios', 0, 1250);
  add('2025-01-12', 'Pago tarjeta crédito', 'créditos', 0, 3500);
  add('2025-01-15', 'Farmacia', 'otros', 0, 650);
  add('2025-01-18', 'Trabajo freelance', 'trabajo', 5000, 0);
  add('2025-01-22', 'Gasolina', 'viáticos', 0, 800);
  add('2025-01-25', 'Préstamo a María', 'prestamos', 0, 2000);
  add('2025-01-28', 'Reparación auto', 'refacciones', 0, 1500);
  add('2025-01-30', 'Internet', 'servicios', 0, 899);
  add('2025-02-01', 'Sueldo mensual', 'sueldo', 45000, 0);
  add('2025-02-03', 'Despensa semanal', 'despensas', 0, 2850);
  add('2025-02-05', 'Alquiler febrero', 'alquiler', 0, 8500);
  add('2025-02-08', 'Luz y agua', 'servicios', 0, 950);
  add('2025-02-11', 'Cena San Valentín', 'suntuarios', 0, 2500);
  add('2025-02-14', 'Abono tarjeta', 'créditos', 0, 3500);
  add('2025-02-17', 'Proyecto web', 'trabajo', 8000, 0);
  add('2025-02-20', 'Gasolina', 'viáticos', 0, 750);
  add('2025-02-23', 'Pago préstamo recibido', 'prestamos', 2000, 0);
  add('2025-02-26', 'Cine y cena', 'suntuarios', 0, 980);
  add('2025-03-01', 'Sueldo mensual', 'sueldo', 47000, 0);
  add('2025-03-03', 'Despensa mensual', 'despensas', 0, 3100);
  add('2025-03-05', 'Alquiler marzo', 'alquiler', 0, 8500);
  add('2025-03-08', 'Agua + gas', 'servicios', 0, 1100);
  add('2025-03-11', 'Ropa nueva', 'suntuarios', 0, 1800);
  add('2025-03-14', 'Tarjeta crédito', 'créditos', 0, 3500);
  add('2025-03-17', 'Consultoría', 'trabajo', 6000, 0);
  add('2025-03-20', 'Comida rápida', 'viáticos', 0, 600);
  add('2025-03-23', 'Préstamo familiar', 'prestamos', 0, 1500);
  add('2025-03-26', 'Refacción cocina', 'refacciones', 0, 2200);
  add('2025-03-29', 'Farmacia y salud', 'otros', 0, 750);

  return records;
}
