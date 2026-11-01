# Dōgara

App de escritorio (Windows y Linux) que abre YouTube en su propia ventana y le suma funciones por módulos. Stack: Electron, TypeScript, React y Vite (con electron-vite), y electron-builder para los instaladores.

El plan completo, con el catálogo de módulos y el roadmap, está en `docs/plan.md`.

Los autores están aprendiendo a programar: explicá en español qué hace cada cambio, en lenguaje simple, y trabajá de a una tarea chica por vez.

## Estructura

- `src/main/`: proceso principal (ventanas, menú, acceso al sistema).
- `src/preload/`: único puente entre la página de YouTube y la app.
- `src/renderer/`: pantallas propias en React.
- `src/shared/`: código sin dependencias de Electron, compartido y fácil de probar.
- `tests/`: pruebas con Vitest.

Previstas para más adelante: `src/modules/` (una carpeta por módulo) y `src/themes/`.

## Reglas

- **Seguridad:** la ventana de YouTube corre con `sandbox`, `contextIsolation` y sin `nodeIntegration`. Nunca desactivar estas opciones. Lo que se exponga en el preload queda al alcance de la página, así que debe ser lo mínimo posible.
- **Navegación:** solo los sitios de `src/shared/navigation.ts` se abren dentro de la app.
- **Sin cuenta de Google:** Google bloquea el login dentro de Electron y decidimos no eludir ese control, así que no cambiamos el user agent ni nos hacemos pasar por otro navegador. Lo que dependa de una cuenta (suscripciones, historial) se guarda en la computadora del usuario.
- **Selectores de YouTube:** van todos en `src/shared/youtubeSelectors.ts`, porque YouTube los cambia seguido.
- **Rendimiento:** preferir CSS a JavaScript para ocultar elementos, usar un único observador de cambios compartido y animar solo `transform` y `opacity`.
- **Módulos:** cada uno se activa por separado y `onDisable` deshace todo lo que hizo `onEnable`.
- **Legal:** nada de "YouTube" en el nombre o el icono, y ninguna función para descargar videos.

## Antes de dar algo por terminado

Ejecutá `npm run typecheck`, `npm test` y `npm run build`, y probá el cambio en la app con `npm run dev`.
