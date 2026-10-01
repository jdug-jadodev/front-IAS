# Frontend del sistema de créditos

Base Angular para registrar solicitudes de crédito, mostrar sus resultados y consultar solicitudes recientes. Los flujos de negocio todavía no están implementados.

## Requisitos

- Node.js 24 LTS (`24.21.0` recomendado).
- npm 11.

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm start
```

La aplicación estará disponible en `http://localhost:4200/`.

## Verificaciones

```bash
npm run build
npm test -- --watch=false
npm run format:check
```

## Documentación

- [Arquitectura del frontend](ARQUITECTURA_FRONTEND.md)
- [Contexto de implementación](CONTEXTO_IA_FRONTEND.md)
- [Guía visual propuesta](GUIA_VISUAL.md)

## Base técnica

- Angular standalone.
- TypeScript y plantillas estrictas.
- Routing habilitado.
- SCSS.
- Vitest para pruebas unitarias.
- npm con archivo de bloqueo.
