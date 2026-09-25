// Set the theme class before first paint to avoid a light/dark flash (kept in sync by src/lib/theme.ts).
// A static file rather than an inline <script>, so the production CSP can stay `script-src 'self'`.
try {
  var t = localStorage.getItem('tabp.theme')
  var dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
} catch (e) {}
