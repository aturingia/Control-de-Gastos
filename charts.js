let donutChartInstance = null;
let lineChartInstance = null;

const CATEGORY_COLORS = {
  'viáticos': '#FF6B35',
  'despensas': '#F7931E',
  'servicios': '#FFC857',
  'suntuarios': '#E84855',
  'créditos': '#8B5CF6',
  'prestamos': '#EC4899',
  'refacciones': '#F59E0B',
  'alquiler': '#EF4444',
  'trabajo': '#10B981',
  'sueldo': '#3B82F6',
  'insumos': '#A78BFA',
  'e-commerce': '#F97316',
  'otros': '#6B7280'
};

function getChartTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    gridColor: isDark ? 'rgba(245, 237, 230, 0.08)' : 'rgba(45, 27, 0, 0.08)',
    textColor: isDark ? '#A09080' : '#7A6A5A',
    borderColor: isDark ? 'rgba(245, 237, 230, 0.1)' : 'rgba(45, 27, 0, 0.1)',
  };
}

function renderDonutChart(records) {
  const canvas = document.getElementById('donutChart');
  if (!canvas) return;

  if (donutChartInstance) { donutChartInstance.destroy(); donutChartInstance = null; }

  const expenses = records.filter(r => r.egreso > 0);
  const isEmpty = expenses.length === 0;

  const wrapper = canvas.parentElement;
  wrapper.classList.toggle('empty', isEmpty);

  if (isEmpty) return;

  const totals = {};
  expenses.forEach(r => {
    totals[r.categoria] = (totals[r.categoria] || 0) + r.egreso;
  });

  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const labels = sorted.map(([cat]) => cat.charAt(0).toUpperCase() + cat.slice(1));
  const data = sorted.map(([, val]) => val);
  const colors = sorted.map(([cat]) => CATEGORY_COLORS[cat] || CATEGORY_COLORS['otros']);

  const ctx = canvas.getContext('2d');
  const theme = getChartTheme();

  donutChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#FFFFFF',
        borderWidth: 3,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 14,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { size: 12 },
            color: theme.textColor
          }
        },
        tooltip: {
          backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#fff',
          titleColor: getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#000',
          bodyColor: getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#000',
          borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#ddd',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function (ctx) {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return ` $${ctx.parsed.toLocaleString('es-AR', { minimumFractionDigits: 2 })}  (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

function renderLineChart(records, viewType, range) {
  const canvas = document.getElementById('lineChart');
  if (!canvas) return;

  if (lineChartInstance) { lineChartInstance.destroy(); lineChartInstance = null; }

  const isEmpty = records.length === 0;
  const wrapper = canvas.parentElement;
  wrapper.classList.toggle('empty', isEmpty);

  if (isEmpty) return;

  const dailyMap = {};
  records.forEach(r => {
    if (!dailyMap[r.fecha]) dailyMap[r.fecha] = { ingreso: 0, egreso: 0 };
    dailyMap[r.fecha].ingreso += r.ingreso;
    dailyMap[r.fecha].egreso += r.egreso;
  });

  const labels = [];
  const ingresos = [];
  const egresos = [];
  const theme = getChartTheme();

  if (viewType === 'monthly') {
    const start = new Date(range.start);
    const end = new Date(range.end);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      labels.push(d.getDate().toString());
      ingresos.push(dailyMap[key]?.ingreso || 0);
      egresos.push(dailyMap[key]?.egreso || 0);
    }
  } else if (viewType === 'weekly') {
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const start = new Date(range.start);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      labels.push(dayNames[i]);
      ingresos.push(dailyMap[key]?.ingreso || 0);
      egresos.push(dailyMap[key]?.egreso || 0);
    }
  } else if (viewType === 'yearly') {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const year = range.start.getFullYear();
    for (let m = 0; m < 12; m++) {
      const prefix = `${year}-${String(m + 1).padStart(2, '0')}`;
      let ingTotal = 0;
      let egrTotal = 0;
      Object.entries(dailyMap).forEach(([key, val]) => {
        if (key.startsWith(prefix)) {
          ingTotal += val.ingreso;
          egrTotal += val.egreso;
        }
      });
      labels.push(monthNames[m]);
      ingresos.push(ingTotal);
      egresos.push(egrTotal);
    }
  }

  const maxVal = Math.max(...ingresos, ...egresos, 1);
  const ctx = canvas.getContext('2d');

  lineChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Ingresos',
          data: ingresos,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          borderWidth: 2.5,
          pointBackgroundColor: '#10B981',
          pointBorderColor: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#fff',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.35,
          fill: true
        },
        {
          label: 'Egresos',
          data: egresos,
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          borderWidth: 2.5,
          pointBackgroundColor: '#EF4444',
          pointBorderColor: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#fff',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.35,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2.2,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: { size: 12 },
            color: theme.textColor
          }
        },
        tooltip: {
          backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#fff',
          titleColor: getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#000',
          bodyColor: getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#000',
          borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#ddd',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function (ctx) {
              return ` ${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: theme.textColor,
            font: { size: 11 },
            maxTicksLimit: 15
          }
        },
        y: {
          beginAtZero: true,
          max: maxVal * 1.15,
          grid: {
            color: theme.gridColor,
            drawBorder: false
          },
          ticks: {
            color: theme.textColor,
            font: { size: 11 },
            callback: function (val) {
              if (val >= 1000) return '$' + (val / 1000).toFixed(0) + 'k';
              return '$' + val.toFixed(0);
            }
          }
        }
      }
    }
  });
}

function destroyCharts() {
  if (donutChartInstance) { donutChartInstance.destroy(); donutChartInstance = null; }
  if (lineChartInstance) { lineChartInstance.destroy(); lineChartInstance = null; }
}
