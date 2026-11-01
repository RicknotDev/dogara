# Dōgara

App de escritorio open source para Windows y Linux que abre YouTube en su propia ventana y le suma funciones. Se usa sin cuenta de Google: Google no permite iniciar sesión dentro de apps hechas con Electron.

> **Estado:** en desarrollo temprano. Por ahora la app solo abre YouTube en su ventana; los módulos llegan a partir de la v0.1.

## Desarrollo

Requiere [Node.js](https://nodejs.org/) en su versión LTS.

```bash
npm install
npm run dev
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Abre la app en modo desarrollo |
| `npm test` | Ejecuta las pruebas |
| `npm run typecheck` | Revisa los tipos de TypeScript |
| `npm run build` | Compila el código en `out/` |
| `npm run package` | Genera la app sin instalador en `dist/` |
| `npm run dist:win` | Genera los instaladores de Windows |
| `npm run dist:linux` | Genera los instaladores de Linux |

## Aviso legal

Dōgara es un proyecto independiente. No está afiliado, respaldado ni patrocinado por Google ni por YouTube. YouTube es una marca registrada de Google LLC.

## Licencia

[GPL-3.0](LICENSE)
