const STORAGE_KEY = 'gastos_data';

const AppState = {
  records: [],
  currentView: 'monthly',
  referenceDate: new Date(),
  selectedCategories: [],
  editingId: null
};

function getPeriodRange() {
  const d = AppState.referenceDate;
  if (AppState.currentView === 'weekly') {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.getFullYear(), d.getMonth(), diff);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  }
  if (AppState.currentView === 'monthly') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  if (AppState.currentView === 'yearly') {
    const start = new Date(d.getFullYear(), 0, 1);
    const end = new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start, end };
  }
}

function formatPeriodLabel() {
  const d = AppState.referenceDate;
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  if (AppState.currentView === 'weekly') {
    const range = getPeriodRange();
    const fmt = (date) => `${date.getDate()} ${months[date.getMonth()].slice(0, 3)}`;
    return `Semana del ${fmt(range.start)} al ${fmt(range.end)}, ${range.start.getFullYear()}`;
  }
  if (AppState.currentView === 'monthly') {
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  return `${d.getFullYear()}`;
}

function formatDateDisplay(dateStr) {
  const parts = dateStr.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatCurrency(amount) {
  const abs = Math.abs(amount);
  const [int, dec] = abs.toFixed(2).split('.');
  const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return '$' + formattedInt + ',' + dec;
}

function normalizeCategory(cat) {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function getFilteredRecords() {
  const range = getPeriodRange();
  let records = AppState.records.filter(r => {
    const d = new Date(r.fecha + 'T00:00:00');
    return d >= range.start && d <= range.end;
  });
  if (AppState.selectedCategories.length > 0) {
    records = records.filter(r => AppState.selectedCategories.includes(r.categoria));
  }
  return records.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
}

function getAllRecordsInPeriod() {
  const range = getPeriodRange();
  return AppState.records.filter(r => {
    const d = new Date(r.fecha + 'T00:00:00');
    return d >= range.start && d <= range.end;
  });
}

function renderSummary() {
  const records = getFilteredRecords();
  let totalIngresos = 0;
  let totalEgresos = 0;
  records.forEach(r => {
    totalIngresos += r.ingreso;
    totalEgresos += r.egreso;
  });
  const balance = totalIngresos - totalEgresos;

  document.getElementById('totalIngresos').textContent = formatCurrency(totalIngresos);
  document.getElementById('totalEgresos').textContent = formatCurrency(totalEgresos);

  const balanceEl = document.getElementById('totalBalance');
  balanceEl.textContent = (balance >= 0 ? '' : '-') + formatCurrency(Math.abs(balance));
  const card = balanceEl.closest('.summary-card');
  card.classList.toggle('positive', balance >= 0);
  card.classList.toggle('negative', balance < 0);
}

function renderTable() {
  const records = getFilteredRecords();
  const tbody = document.getElementById('recordsBody');

  if (records.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <i class="fas fa-receipt"></i>
            <p>No hay registros en este período</p>
            <p class="sub">Agregá un nuevo registro o cambiá de período</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = records.map(r => {
    const badgeClass = `cat-badge-${r.categoria}`;
    return `
      <tr>
        <td class="cell-fecha">${formatDateDisplay(r.fecha)}</td>
        <td class="cell-concepto">${r.concepto}</td>
        <td class="cell-categoria"><span class="cat-badge ${badgeClass}">${normalizeCategory(r.categoria)}</span></td>
        <td class="cell-monto ingreso">${r.ingreso > 0 ? formatCurrency(r.ingreso) : '-'}</td>
        <td class="cell-monto egreso">${r.egreso > 0 ? formatCurrency(r.egreso) : '-'}</td>
        <td class="cell-actions">
          <button class="btn-icon" onclick="openEditModal(${r.id})" title="Editar">
            <i class="fas fa-pen"></i>
          </button>
          <button class="btn-icon danger" onclick="deleteRecord(${r.id})" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`;
  }).join('');
}

function renderCategoryFilters() {
  const container = document.getElementById('filters');
  const range = getPeriodRange();
  const periodRecords = AppState.records.filter(r => {
    const d = new Date(r.fecha + 'T00:00:00');
    return d >= range.start && d <= range.end;
  });

  const counts = {};
  periodRecords.forEach(r => {
    counts[r.categoria] = (counts[r.categoria] || 0) + 1;
  });

  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);

  container.innerHTML = `
    <button class="cat-pill ${AppState.selectedCategories.length === 0 ? 'active' : ''}"
            onclick="toggleCategoryFilter('__all__')">
      Todas <span class="count">${allCount}</span>
    </button>
    ${CATEGORIES.map(cat => {
      const count = counts[cat] || 0;
      if (count === 0) return '';
      return `<button class="cat-pill ${AppState.selectedCategories.includes(cat) ? 'active' : ''}"
                      onclick="toggleCategoryFilter('${cat}')">
                ${normalizeCategory(cat)} <span class="count">${count}</span>
              </button>`;
    }).join('')}
  `;
}

function toggleCategoryFilter(cat) {
  if (cat === '__all__') {
    AppState.selectedCategories = [];
  } else {
    const idx = AppState.selectedCategories.indexOf(cat);
    if (idx >= 0) {
      AppState.selectedCategories.splice(idx, 1);
      if (AppState.selectedCategories.length === 0) {
        renderCategoryFilters();
        return;
      }
    } else {
      AppState.selectedCategories.push(cat);
    }
  }
  renderCategoryFilters();
  renderSummary();
  renderTable();
  renderCharts();
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState.records));
  } catch (e) {
    console.warn('No se pudo guardar en localStorage:', e);
  }
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (Array.isArray(data) && data.length > 0) {
        AppState.records = data;
        return;
      }
    }
  } catch (e) {
    console.warn('Error al cargar datos, usando datos de ejemplo');
  }
  AppState.records = generateSampleData();
  saveData();
}

function navigatePeriod(dir) {
  const d = AppState.referenceDate;
  if (AppState.currentView === 'weekly') {
    d.setDate(d.getDate() + dir * 7);
  } else if (AppState.currentView === 'monthly') {
    d.setMonth(d.getMonth() + dir);
  } else {
    d.setFullYear(d.getFullYear() + dir);
  }
  AppState.referenceDate = d;
  renderAll();
}

function changeView(view) {
  AppState.currentView = view;
  document.querySelectorAll('.view-tab').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });
  renderAll();
}

function openNewModal() {
  AppState.editingId = null;
  document.getElementById('modalTitle').textContent = 'Nuevo registro';
  document.getElementById('recordId').value = '';
  document.getElementById('fecha').value = new Date().toISOString().slice(0, 10);
  document.getElementById('concepto').value = '';
  document.getElementById('categoria').value = '';
  document.getElementById('ingreso').value = '';
  document.getElementById('egreso').value = '';
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('concepto').focus();
}

function openEditModal(id) {
  const record = AppState.records.find(r => r.id === id);
  if (!record) return;
  AppState.editingId = id;
  document.getElementById('modalTitle').textContent = 'Editar registro';
  document.getElementById('recordId').value = id;
  document.getElementById('fecha').value = record.fecha;
  document.getElementById('concepto').value = record.concepto;
  document.getElementById('categoria').value = record.categoria;
  document.getElementById('ingreso').value = record.ingreso || '';
  document.getElementById('egreso').value = record.egreso || '';
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('concepto').focus();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  AppState.editingId = null;
}

function handleFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const fecha = form.fecha.value;
  const concepto = form.concepto.value.trim();
  const categoria = form.categoria.value;
  const ingreso = parseFloat(form.ingreso.value) || 0;
  const egreso = parseFloat(form.egreso.value) || 0;

  if (!concepto || !categoria || !fecha) {
    showToast('Completá todos los campos requeridos');
    return;
  }
  if (ingreso === 0 && egreso === 0) {
    showToast('Debe tener ingreso o egreso mayor a 0');
    return;
  }

  const editingId = parseInt(form.recordId.value);
  if (editingId) {
    const idx = AppState.records.findIndex(r => r.id === editingId);
    if (idx >= 0) {
      AppState.records[idx] = { ...AppState.records[idx], fecha, concepto, categoria, ingreso, egreso };
      showToast('Registro actualizado');
    }
  } else {
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    AppState.records.push({ id: newId, fecha, concepto, categoria, ingreso, egreso });
    showToast('Registro creado');
  }

  saveData();
  closeModal();
  renderAll();
}

function deleteRecord(id) {
  const record = AppState.records.find(r => r.id === id);
  if (!record) return;
  if (!confirm(`¿Eliminar "${record.concepto}" del ${formatDateDisplay(record.fecha)}?`)) return;
  AppState.records = AppState.records.filter(r => r.id !== id);
  saveData();
  renderAll();
  showToast('Registro eliminado');
}

function clearAllRecords() {
  if (AppState.records.length === 0) {
    showToast('No hay registros para limpiar');
    return;
  }
  if (!confirm(`¿Eliminar los ${AppState.records.length} registros permanentemente?`)) return;
  if (!confirm('¿Estás seguro? Esta acción no se puede deshacer.')) return;
  AppState.records = [];
  AppState.selectedCategories = [];
  saveData();
  renderAll();
  showToast('Todos los registros fueron eliminados');
}

function importCSV() {
  document.getElementById('fileInput').click();
}

function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    try {
      const result = parseCSV(ev.target.result);
      if (result.records.length === 0) {
        showToast('No se pudieron importar registros');
        if (result.errors.length > 0) {
          showToast(result.errors[0]);
        }
        return;
      }
      const msg = `Se leyeron ${result.imported} registros de ${result.total} líneas.`;
      if (result.errors.length > 0) {
        showToast(msg + ` ${result.errors.length} errores.`);
      } else {
        showToast(msg);
      }
      if (AppState.records.length > 0 && !confirm(`¿Reemplazar los ${AppState.records.length} registros actuales con los ${result.imported} del archivo?`)) {
        return;
      }
      AppState.records = result.records;
      AppState.selectedCategories = [];
      saveData();
      renderAll();
    } catch (err) {
      showToast('Error al importar: ' + err.message);
    }
  };
  reader.readAsText(file, 'UTF-8');
  e.target.value = '';
}

function renderCharts() {
  const records = getFilteredRecords();
  const range = getPeriodRange();
  renderDonutChart(records);
  renderLineChart(records, AppState.currentView, range);
}

function renderAll() {
  document.getElementById('periodLabel').textContent = formatPeriodLabel();
  renderSummary();
  renderCategoryFilters();
  renderTable();
  renderCharts();
  const count = AppState.records.length;
  document.getElementById('recordCount').textContent = `${count} registro${count !== 1 ? 's' : ''}`;
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.remove('show'), 2800);
}

document.addEventListener('DOMContentLoaded', function () {
  loadData();

  const today = new Date();
  AppState.referenceDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  document.getElementById('prevPeriod').addEventListener('click', () => navigatePeriod(-1));
  document.getElementById('nextPeriod').addEventListener('click', () => navigatePeriod(1));

  document.querySelectorAll('.view-tab').forEach(el => {
    el.addEventListener('click', () => changeView(el.dataset.view));
  });

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('addRecord').addEventListener('click', openNewModal);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });
  document.getElementById('recordForm').addEventListener('submit', handleFormSubmit);
  document.getElementById('importBtn').addEventListener('click', importCSV);
  document.getElementById('exportBtn').addEventListener('click', () => exportCSV(AppState.records));
  document.getElementById('clearBtn').addEventListener('click', clearAllRecords);
  document.getElementById('fileInput').addEventListener('change', handleFileImport);

  renderAll();
});
