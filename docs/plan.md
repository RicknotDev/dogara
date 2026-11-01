# Dōgara — Planificación del proyecto

Actualizado: 1 de noviembre de 2026 · ricky y nellys

## Resumen

Dōgara es una app de escritorio open source para Windows y Linux que abre YouTube en su propia ventana y le suma temas, bloqueo de anuncios, controles avanzados de audio y video, modos sin distracciones y un modo TV.

**Se usa sin cuenta de Google.** Google bloquea el inicio de sesión dentro de Electron y decidimos no eludir ese control. Por eso, las suscripciones, el historial y las listas se guardan en la computadora de cada usuario.

El proyecto se construye por módulos independientes que se activan desde los ajustes, y se publica en GitHub con instaladores automáticos.

### Cambios respecto del plan original

| Tema | Antes | Ahora |
| --- | --- | --- |
| Nombre | Kinora (provisorio) | Dōgara; `dogara` donde hacen falta caracteres simples |
| Logo | Sin definir | Rayo blanco sobre fondo negro |
| Cuenta de Google | Se conservaban cuenta, suscripciones e historial | Sin cuenta; esos datos pasan a ser locales |
| Módulos | 36 | 42: 3 nuevos por no tener cuenta y 3 que estaban sin versión asignada |
| Variables de temas | `--k-*` | `--dg-*` |
| Licencia | GPL-3.0 recomendada | GPL-3.0 aplicada |

## Decisiones tomadas

El stack es Electron con TypeScript, para Windows y Linux, e incluye todas las funciones pedidas más las 16 ideas extra.

| Tema | Decisión | Por qué |
| --- | --- | --- |
| Base de la app | Electron | Trae Chromium completo: audio, video, gamepads y ventanas flotantes funcionan como en Chrome |
| Cuenta | Sin inicio de sesión | Google bloquea el login en Electron. No se cambia el user agent ni se finge ser otro navegador |
| Datos del usuario | Locales | Suscripciones, historial y listas quedan en la computadora, sin servidor propio |
| Lenguaje | TypeScript | Es JavaScript con tipos: el editor marca errores antes de ejecutar, ideal para aprender |
| Pantallas propias | React + Vite | Ajustes, onboarding y editor de temas; Vite compila rápido |
| Instaladores | electron-builder | Windows: instalador `.exe` y versión portable. Linux: AppImage, `.deb` y `.rpm` |
| Publicación | GitHub Actions | Cada versión nueva genera los instaladores sola |
| Bloqueo de anuncios | `@ghostery/adblocker-electron` | Usa las mismas listas que uBlock Origin y funciona bien dentro de Electron |
| macOS | Fuera por ahora | Se puede sumar más adelante sin reescribir nada |

### Qué implica no tener cuenta

- **Se pierde:** suscripciones, historial y listas de la cuenta, "me gusta" y comentarios propios, y los beneficios de YouTube Premium.
- **Videos con restricción de edad:** en general piden iniciar sesión, así que no se podrían ver.
- **Inicio vacío:** la portada de YouTube sin cuenta solo dice "Busca algo para comenzar". El módulo Suscripciones locales la reemplaza.
- **Se conserva:** buscar y reproducir videos, y todas las funciones que trabajan sobre el reproductor o la interfaz.

### Alcance acordado

- **Funciones originales:** temas (custom y predefinidos), bloqueador opcional, onboarding, menos distracciones, modo concentración, animaciones, mini reproductor, modo TV, velocidades personalizadas, ecualizador, normalización, subtítulos avanzados, perfiles de calidad, buffer (experimental), atajos, audio en segundo plano, capítulos y marcadores.
- **Ideas extra aceptadas:** SponsorBlock, Return YouTube Dislike, DeArrow, transcripción con búsqueda, ajustes por canal, bucle A-B, cuadro por cuadro y captura, temporizador de apagado, modo ambiente, límite de tiempo diario, estadísticas locales, notas con marca de tiempo, controles multimedia del sistema, Discord Rich Presence, perfiles de usuario y galería de temas.
- **Agregados por no tener cuenta:** suscripciones locales, historial local y listas locales.

## Arquitectura

La app tiene tres capas: el proceso principal maneja el sistema, YouTube corre aislado en su ventana, y el preload es la única puerta entre ambos.

- **Proceso principal:** ventanas, bloqueador, atajos, bandeja del sistema y datos guardados.
- **Ventana de YouTube:** corre aislada, con `sandbox` y `contextIsolation`, y ahí viven los módulos.
- **Preload:** el único puente entre las dos anteriores.

Los módulos viven dentro de la ventana de YouTube, pero cualquier cosa que toque el sistema (guardar ajustes, abrir el mini reproductor, atajos globales) la piden al proceso principal a través del preload. Así, una página web nunca tiene acceso directo a la computadora.

### Estructura del repositorio

```
dogara/
├─ src/
│  ├─ main/             proceso principal: ventanas, bloqueador, atajos, bandeja
│  ├─ preload/          puente seguro entre YouTube y la app
│  ├─ renderer/         pantallas propias en React (ajustes, onboarding, editor)
│  ├─ modules/          una carpeta por módulo
│  │  ├─ speed/         index.ts, settings.ts, styles.css
│  │  ├─ equalizer/
│  │  └─ ...
│  ├─ themes/           temas predefinidos (.css)
│  └─ shared/           tipos, selectores de YouTube, utilidades
├─ resources/           icono de la app
├─ docs/                documentación: plan, temas, módulos, contribución
├─ tests/               pruebas automáticas
├─ .github/workflows/   compilación y releases automáticas
├─ CLAUDE.md
├─ README.md
└─ package.json
```

### Cómo se ve un módulo

Todos los módulos siguen el mismo formato, así agregar uno nuevo es copiar uno existente y cambiarlo:

```ts
export default defineModule({
  id: 'speed',
  name: 'Velocidades personalizadas',
  defaultEnabled: true,
  settings: { presets: [1.15, 1.35, 1.75] },
  onEnable(ctx) { /* se ejecuta al activarlo */ },
  onDisable(ctx) { /* deshace todo lo que hizo */ },
});
```

## Catálogo de módulos

Son 42 módulos repartidos en cinco versiones; cada uno se puede activar o desactivar por separado. La columna Versión indica en qué entrega aparece (ver Roadmap). Los marcados con ★ son nuevos o no tenían versión en el plan original.

| Módulo | Qué hace | Área | Versión |
| --- | --- | --- | --- |
| Núcleo de módulos | Carga, activa y desactiva cada módulo; guarda su configuración | Base | v0.1 |
| Ajustes | Pantalla con todos los módulos y sus opciones | Base | v0.1 |
| Onboarding | Asistente del primer arranque: explica el uso sin cuenta, importa suscripciones, bloqueador sí/no, tema, módulos recomendados | Base | v0.1 |
| Bloqueador de anuncios | Listas de uBlock (EasyList, uBlock filters); activable en cualquier momento | Base | v0.1 |
| Motor de temas | Aplica temas CSS con variables; cambio en vivo sin reiniciar | Temas | v0.1 |
| Menos distracciones | Ocultar Shorts, comentarios, recomendaciones y tendencias, cada uno por separado | Interfaz | v0.1 |
| Modo concentración | Solo reproductor, título y descripción | Interfaz | v0.1 |
| Velocidades personalizadas | Cualquier velocidad entre 0.25x y 4x, con presets editables (1.15x, 1.35x, 1.75x) | Reproductor | v0.1 |
| Atajos de teclado | Editor de atajos; locales y globales | Sistema | v0.1 |
| Audio en segundo plano | Sigue sonando minimizado; control desde la bandeja del sistema | Sistema | v0.1 |
| Suscripciones locales ★ | Reemplaza el botón "Suscribirse" y arma un inicio con los videos nuevos de tus canales; importa desde Google Takeout | Cuenta local | v0.1 |
| Ecualizador | 10 bandas con presets: voz, bajos, podcast, plano | Audio | v0.2 |
| Normalización de volumen | Iguala el volumen entre videos usando el dato de sonoridad de YouTube | Audio | v0.2 |
| Perfiles de calidad | Reglas automáticas: por ventana, por batería, por canal | Reproductor | v0.2 |
| Códec preferido ★ | Fuerza H.264 en equipos viejos, donde VP9 y AV1 usan mucha más CPU | Reproductor | v0.2 |
| Subtítulos avanzados | Fuente, tamaño, color, fondo, posición, idioma preferido y doble subtítulo | Reproductor | v0.2 |
| Ajustes por canal | Recuerda velocidad, calidad y volumen de cada canal | Reproductor | v0.2 |
| Bucle A-B | Repite un fragmento elegido | Reproductor | v0.2 |
| Cuadro por cuadro y captura | Avanza de a un cuadro y guarda capturas en PNG | Reproductor | v0.2 |
| Temporizador de apagado | Pausa a los X minutos o al terminar el video | Reproductor | v0.2 |
| Controles multimedia del sistema | Teclas multimedia y panel de medios de Windows y Linux | Sistema | v0.2 |
| Historial local ★ | Recuerda lo que viste y deja continuar donde quedaste; se puede pausar y borrar | Cuenta local | v0.2 |
| Panel de rendimiento ★ | RAM, CPU y cuadros de video perdidos en tiempo real | Sistema | v0.2 |
| Mini reproductor | Ventana flotante siempre visible, movible y redimensionable | Ventanas | v0.3 |
| Capítulos y marcadores | Lista de capítulos navegable; marcadores propios con nota | Contenido | v0.3 |
| Notas con marca de tiempo | Notas ligadas al segundo del video, exportables a Markdown | Contenido | v0.3 |
| Transcripción con búsqueda | Buscar una frase y saltar a ese momento | Contenido | v0.3 |
| Listas locales ★ | "Ver más tarde" y listas propias, en reemplazo de las de la cuenta | Cuenta local | v0.3 |
| SponsorBlock | Salta patrocinios, intros y recordatorios (base de datos comunitaria) | Comunidad | v0.3 |
| Return YouTube Dislike | Muestra los no me gusta; sin cuenta no se puede votar | Comunidad | v0.3 |
| DeArrow | Títulos y miniaturas sin clickbait | Comunidad | v0.3 |
| Temas predefinidos | Material, glassmorphism, iOS, corporate minimal, AMOLED, retro y más | Temas | v0.4 |
| Editor de temas | Editar colores y variables con vista previa en vivo | Temas | v0.4 |
| Animaciones fluidas | Transiciones consistentes; respeta "reducir movimiento" | Interfaz | v0.4 |
| Modo ambiente | El fondo toma los colores del video | Interfaz | v0.4 |
| Modo TV | Interfaz para pantallas grandes con mando o gamepad | Ventanas | v0.4 |
| Modo rendimiento ★ | Un clic para equipos con pocos recursos (ver Optimización) | Sistema | v0.4 |
| Galería de temas | Instalar temas de la comunidad desde un repositorio de GitHub | Temas | v1.0 |
| Perfiles de usuario | Configuraciones y datos locales intercambiables ("Estudio", "Ocio") | Sistema | v1.0 |
| Estadísticas y límite diario | Tiempo visto, canales, avisos al llegar al límite | Bienestar | v1.0 |
| Discord Rich Presence | Muestra en Discord qué estás viendo | Sistema | v1.0 |
| Buffer configurable | Precarga y calidad inicial; marcado como experimental | Reproductor | v1.0 |

### Cómo funciona la cuenta local

- **Videos nuevos:** cada canal tiene un feed público (`youtube.com/feeds/videos.xml?channel_id=...`) que funciona sin cuenta. Ya se comprobó que responde y trae los últimos 15 videos, así que no alcanza para mostrar el catálogo completo de un canal.
- **Importar suscripciones:** Google Takeout exporta la lista de canales a un archivo que la app puede leer, sin iniciar sesión.
- **Botón "Suscribirse":** el módulo lo intercepta y guarda el canal localmente, en lugar de mostrar el pedido de inicio de sesión de YouTube.
- **Datos:** se pueden exportar e importar, para pasarlos a otra computadora o hacer una copia.

## Sistema de temas

Un tema es un archivo `.css` que cambia variables de color, forma y efectos; no hace falta saber programar para crear uno. La documentación incluida explica cada variable y trae ejemplos copiables.

### Cómo es un tema

```css
/* @name        Glass Night
   @author      tu-usuario
   @version     1.0.0
   @description Glassmorphism oscuro con acentos violetas */

:root {
  --dg-bg:            #0d0d14;
  --dg-surface:       rgba(255, 255, 255, 0.06);
  --dg-text:          #f2f2f7;
  --dg-text-muted:    #a1a1b5;
  --dg-accent:        #8b5cf6;
  --dg-radius:        16px;
  --dg-blur:          18px;
  --dg-shadow:        0 8px 32px rgba(0, 0, 0, 0.35);
  --dg-font:          "Inter", sans-serif;
  --dg-anim-speed:    220ms;
}

/* Opcional: CSS libre para retoques avanzados */
```

### Tres niveles de personalización

1. **Elegir un tema predefinido** desde los ajustes.
2. **Editar variables** con el editor visual (colores, bordes, desenfoque) y guardar como tema nuevo.
3. **CSS libre** para quien quiera cambiar cualquier parte de YouTube.

### Temas predefinidos previstos

| Tema | Estilo |
| --- | --- |
| Dōgara Default | Limpio, oscuro y claro, el punto de partida |
| Material | Material Design 3: colores dinámicos, botones redondeados |
| Glass | Glassmorphism: paneles translúcidos con desenfoque |
| Cupertino | Estilo iOS: tipografía grande, superficies suaves |
| Corporate Minimal | Grises, sin adornos, máxima legibilidad |
| AMOLED | Negro puro, ideal para pantallas OLED |
| Neo Brutalism | Bordes gruesos, colores planos y fuertes |
| Retro CRT | Tonos cálidos y tipografía monoespaciada |
| Nord y Catppuccin | Paletas populares entre desarrolladores |
| Alto contraste | Accesibilidad |

### Documentación de temas (en `docs/themes/`)

- **Guía rápida:** crear tu primer tema en 5 minutos.
- **Referencia de variables:** cada `--dg-*`, qué cambia y una captura.
- **Selectores de YouTube:** las partes más comunes (barra superior, miniaturas, reproductor) con sus selectores CSS.
- **Buenas prácticas:** contraste mínimo, modo claro y oscuro, no romper el reproductor.
- **Publicar en la galería:** formato de metadatos y cómo enviar un pull request.

Los selectores de YouTube cambian seguido. Por eso los temas usan sobre todo variables `--dg-*`, y es la app la que traduce esas variables a los selectores actuales. Cuando YouTube cambia algo, se arregla en un solo lugar y todos los temas siguen funcionando.

## Optimización

La optimización es un requisito de todo el proyecto, no una etapa aparte. Cada módulo se mide contra metas fijas de memoria, CPU y arranque, y ninguna versión se publica si las empeora.

### Metas iniciales

Son objetivos de partida; se recalibran después de medir la v0.1 en equipos reales.

| Métrica | Meta | Cómo se mide |
| --- | --- | --- |
| Arranque hasta ver YouTube | menos de 3 s (con SSD) | Tiempo desde que se abre la app hasta que carga la página |
| RAM reproduciendo 1080p | menos de 500 MB en total | Métricas de procesos de Electron |
| RAM minimizada solo con audio | menos de 250 MB | Métricas de procesos de Electron |
| Costo de cada módulo activo | menos de 5 MB y 1% de CPU | Comparación con el módulo apagado |
| Tamaño del instalador | menos de 120 MB | Tamaño del archivo generado |

### Técnicas

- **Carga:** cada módulo se carga solo si está activo; el código se compila y minimiza con Vite; la ventana se muestra recién cuando está lista, sin parpadeos.
- **Interfaz:** ocultar con CSS en vez de JavaScript, porque CSS casi no gasta CPU; un único observador de cambios compartido por todos los módulos, en lugar de uno por módulo; animaciones solo con `transform` y `opacity`, que procesa la placa de video.
- **Temas:** el desenfoque del glassmorphism es caro, así que tiene un límite y se puede apagar.
- **Video:** aceleración por hardware activada en Windows y Linux. El módulo Códec preferido fuerza H.264 en equipos viejos.
- **Audio:** el ecualizador y la normalización solo procesan audio cuando están activos.
- **Mini reproductor:** reutiliza el mismo reproductor en vez de abrir un segundo YouTube, así no se duplica memoria ni descarga.
- **Red:** el bloqueador evita cargar anuncios y rastreadores; las respuestas de SponsorBlock, Return YouTube Dislike y DeArrow se guardan en caché por video; las listas de filtros se actualizan una vez por día; los feeds de suscripciones se piden con moderación y se guardan en caché.
- **Segundo plano:** al minimizar se pausan animaciones, observadores y modo ambiente; solo sigue el audio.

### Modo rendimiento

Un ajuste de un clic para computadoras con pocos recursos: tema sin desenfoque ni animaciones, códec H.264, calidad máxima 720p, modo ambiente apagado y solo los módulos esenciales. El onboarding lo sugiere si detecta poca memoria RAM.

### Medición continua

- **Panel de rendimiento** dentro de la app, con RAM, CPU y cuadros de video perdidos en tiempo real.
- **Prueba automática en GitHub Actions** que mide arranque y memoria en cada cambio, y falla si superan la meta.
- **Costo declarado:** cada módulo nuevo incluye su consumo medido en el pull request.

## Roadmap

El proyecto avanza en cinco versiones, de la v0.1 a la v1.0, y cada una se publica en GitHub como una app completa que ya se puede usar. Sin experiencia previa, la v0.1 es la más lenta porque se aprende mientras se construye; las siguientes van más rápido porque reutilizan el mismo núcleo.

| Versión | Módulos | De qué se trata |
| --- | --- | --- |
| v0.1 | 11 | Núcleo, uso diario sin cuenta y primeras mejoras |
| v0.2 | 12 | Audio, reproductor e historial |
| v0.3 | 8 | Mini reproductor, contenido, listas y servicios comunitarios |
| v0.4 | 6 | Temas completos, modo TV y modo rendimiento |
| v1.0 | 5 | Comunidad, perfiles y bienestar |

### Puertas de control (propuesta)

No se pasa a la versión siguiente hasta cumplir lo que dice cada puerta. Son una propuesta: las puertas del plan original estaban en un gráfico que no se conservó en el archivo de texto, así que conviene compararlas con ese gráfico.

| Para pasar de | Hay que cumplir |
| --- | --- |
| v0.1 a v0.2 | Se usa a diario sin cuenta, los instaladores funcionan en Windows y Linux, y las metas de rendimiento ya están medidas |
| v0.2 a v0.3 | Audio probado en PulseAudio y PipeWire, y activar o desactivar cualquier módulo no deja rastros |
| v0.3 a v0.4 | Mini reproductor sin duplicar memoria, y los servicios comunitarios siguen funcionando cuando no responden |
| v0.4 a v1.0 | Todos los temas predefinidos sobreviven a un cambio de selectores arreglando un solo archivo, y el modo TV se puede usar solo con mando |

## Cómo construirlo sin experiencia

Se puede hacer combinando una base mínima de aprendizaje con trabajo asistido por IA: la IA escribe la mayor parte del código y vos aprendés a entenderlo, probarlo y dirigirlo. Lo importante no es escribir cada línea, sino saber pedir, revisar y probar.

### Herramientas a instalar

- **Git** y una cuenta de **GitHub**: guardan el historial del proyecto.
- **Node.js (versión LTS)**: ejecuta JavaScript fuera del navegador; trae `npm` para instalar librerías.
- **Visual Studio Code**: el editor, con las extensiones ESLint y Prettier.
- **Claude Code**: asistente que trabaja directamente sobre tu repositorio, lee el código, lo modifica y ejecuta comandos.

### Ruta de aprendizaje (unas 4 semanas, en paralelo al proyecto)

1. **Semana 1 — Lo básico de la web:** qué son HTML, CSS y JavaScript. CSS es lo más útil al principio, porque los temas son CSS.
2. **Semana 2 — JavaScript y TypeScript:** variables, funciones, objetos, `async/await`. Con eso se entiende el 80% del código.
3. **Semana 3 — Git y GitHub:** commits, ramas, pull requests e issues.
4. **Semana 4 — Electron:** proceso principal, preload y ventanas, haciendo el tutorial oficial "Quick Start".

Recursos gratuitos recomendados: MDN Web Docs (referencia de HTML, CSS y JavaScript), javascript.info (curso completo), el manual oficial de TypeScript y la documentación de Electron.

### Forma de trabajo con IA

1. **Una tarea chica por vez:** "agregá el módulo de velocidades personalizadas", no "hacé toda la app".
2. **Pedir explicación:** que te explique qué hizo cada archivo antes de aceptar el cambio.
3. **Probar siempre:** ejecutar `npm run dev` y comprobar la función en la app.
4. **Un commit por función que anda:** si algo se rompe, se vuelve atrás fácil.
5. **Escribir pruebas simples** para las partes críticas (ajustes, motor de temas), así la IA no rompe lo que ya funcionaba.

Un archivo `CLAUDE.md` en la raíz del repositorio describe la arquitectura y las reglas del proyecto, para que cada sesión con la IA arranque con el contexto correcto.

## GitHub, licencia y aspectos legales

El repositorio será público, con licencia GPL-3.0, releases automáticas y un aviso claro de que no está afiliado a Google ni a YouTube.

### Licencia

GPL-3.0: cualquiera puede usar y modificar el proyecto, pero las versiones modificadas que se distribuyan deben seguir siendo libres. Es la que usa FreeTube.

### Archivos del repositorio

- `README.md`: qué es, capturas, descarga, funciones y aviso legal.
- `LICENSE`: texto de la licencia.
- `CONTRIBUTING.md`: cómo proponer cambios, crear módulos y enviar temas.
- `CODE_OF_CONDUCT.md`: normas de convivencia.
- `CHANGELOG.md`: qué cambió en cada versión.
- `CLAUDE.md`: contexto del proyecto para trabajar con IA.
- Plantillas de issues: reportar error, pedir función, enviar tema.

### Releases automáticas

1. Se crea una etiqueta de versión (por ejemplo `v0.1.0`).
2. GitHub Actions compila en Windows y en Linux.
3. Los instaladores aparecen solos en la página de Releases.
4. La app avisa al usuario que hay una versión nueva.

### Aspectos legales

- **Nombre e iconos:** sin "YouTube" en el nombre ni el logo de YouTube en el icono.
- **Aviso de no afiliación** en el README y en la pantalla "Acerca de".
- **Bloqueo de anuncios:** va contra los términos de servicio de YouTube. Por eso es opcional y se pregunta en el onboarding; la responsabilidad del uso queda en cada usuario.
- **Sin descargas de videos:** se deja fuera a propósito, porque es lo que más problemas legales trae a proyectos similares.
- **Inicio de sesión:** no se elude el bloqueo de Google, ni se finge ser otro navegador.
- **Servicios comunitarios:** SponsorBlock, Return YouTube Dislike y DeArrow tienen sus propias condiciones de uso de datos; se respetan y se acredita a cada uno en la app.
- **Privacidad:** todo se guarda en la computadora del usuario; la app no tiene servidor propio. Solo los servicios comunitarios que el usuario active reciben el ID del video que se está viendo. Los feeds de suscripciones se piden directamente a YouTube, que puede ver desde qué dirección IP se consultan esos canales.

## Riesgos y mitigaciones

Los riesgos principales son que YouTube cambie su página y rompa módulos, y que empiece a exigir una cuenta; lo primero se puede arreglar rápido, pero lo segundo podría dejar la app sin funcionar.

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| YouTube exige iniciar sesión ("confirmá que no sos un bot") | Alto: sin cuenta no se puede resolver y el video no se reproduce | Avisar claramente al usuario y ofrecer abrir el video en su navegador. No se detectó en la primera prueba, pero conviene vigilarlo |
| YouTube cambia su HTML | Alto: se rompen módulos o temas | Selectores centralizados en un solo archivo; temas basados en variables; pruebas automáticas que avisan |
| Alcance demasiado grande | Alto: el proyecto no se termina | Roadmap por versiones: cada versión es usable por sí sola |
| YouTube cambia o retira los feeds públicos | Alto: las suscripciones locales dejan de actualizarse | Encapsular la lectura de feeds en un solo lugar, para poder cambiar la fuente sin tocar el resto |
| YouTube detecta el bloqueador | Medio: avisos o reproducción bloqueada | Listas de filtros actualizadas automáticamente; el bloqueador se puede apagar |
| Falta de experiencia de los autores | Medio: avance lento o código frágil | Ruta de aprendizaje, tareas chicas, commits frecuentes y pruebas |
| Pérdida de datos locales | Medio: se pierden suscripciones o historial | Exportar e importar los datos; copia automática antes de actualizar la app |
| Cambios en la interfaz TV de YouTube | Medio: el modo TV deja de funcionar | Plan B: modo TV propio sobre la interfaz normal con navegación por mando |
| Mini reproductor sin poder reutilizar el video | Medio: habría que duplicar memoria o rediseñarlo | Probar Document Picture-in-Picture antes de empezar la v0.3; todavía no está comprobado |
| Consumo de memoria de Electron | Bajo | Metas de consumo medidas en cada cambio, modo rendimiento y módulos que se cargan solo si están activos (ver Optimización) |
| Problemas de audio en Linux | Bajo | Probar en PulseAudio y PipeWire antes de cada release |

## Próximos pasos

El esqueleto ya está hecho; lo que sigue es publicarlo en GitHub, confirmar que compila en Linux y construir el núcleo de módulos.

- [x] Elegir el nombre definitivo
- [x] Instalar Git, Node.js LTS y Claude Code
- [x] Generar el esqueleto del proyecto: Electron + TypeScript + React + Vite
- [x] Lograr que la app abra YouTube en su ventana y empaquetarla para Windows
- [x] Escribir `README.md`, `LICENSE` y `CLAUDE.md`
- [x] Definir qué pasa con el inicio de sesión de Google
- [ ] Instalar Visual Studio Code (no se comprobó si ya está)
- [ ] Hacer la semana 1 de la ruta de aprendizaje (HTML y CSS)
- [ ] Crear el repositorio en GitHub y subir el código
- [ ] Confirmar que compila en Linux con GitHub Actions
- [ ] Generar y probar los instaladores de Windows, y medir su tamaño
- [ ] Construir el núcleo de módulos y el primer módulo simple: velocidades personalizadas
- [ ] Construir el módulo Suscripciones locales
