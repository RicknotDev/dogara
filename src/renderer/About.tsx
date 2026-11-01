export function About() {
  const version = new URLSearchParams(window.location.search).get('version');

  return (
    <main className="about">
      <h1>Dōgara</h1>
      <p className="version">Versión {version}</p>
      <p>App de escritorio open source que abre YouTube en su propia ventana y le suma funciones.</p>
      <p className="notice">
        Dōgara es un proyecto independiente. No está afiliado, respaldado ni patrocinado por Google
        ni por YouTube. YouTube es una marca registrada de Google LLC.
      </p>
      <p className="license">Licencia GPL-3.0</p>
    </main>
  );
}
