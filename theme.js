const THEME_KEY = 'gastos_theme';

function getPreferredTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.innerHTML = theme === 'dark'
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
  if (typeof renderCharts === 'function') renderCharts();
}

applyTheme(getPreferredTheme());
