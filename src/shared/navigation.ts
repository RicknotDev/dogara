// Sitios que pueden abrirse dentro de la ventana de la app.
// Todo lo demás se abre en el navegador del sistema.
const ALLOWED_DOMAINS = ['youtube.com'];
const ALLOWED_HOSTS = ['youtu.be', 'consent.google.com'];

function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function isAllowedInApp(url: string): boolean {
  const parsed = parseUrl(url);
  if (parsed?.protocol !== 'https:') return false;

  const host = parsed.hostname;
  return (
    ALLOWED_HOSTS.includes(host) ||
    ALLOWED_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))
  );
}

// Google bloquea el inicio de sesión dentro de Electron, así que la app funciona sin cuenta.
export function isGoogleSignIn(url: string): boolean {
  return parseUrl(url)?.hostname === 'accounts.google.com';
}

// YouTube redirige solo a esta variante para comprobar si hay una sesión; no la pidió el usuario.
export function isPassiveSignIn(url: string): boolean {
  return isGoogleSignIn(url) && parseUrl(url)?.searchParams.get('passive') === 'true';
}

// Evita que una página abra programas del sistema con enlaces como file: o ms-settings:.
export function canOpenExternally(url: string): boolean {
  const protocol = parseUrl(url)?.protocol;
  return protocol === 'https:' || protocol === 'http:';
}
