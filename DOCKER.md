# Frontend en Docker

## Iniciar

El archivo `.env` define `BACKEND_URL`. El valor inicial apunta al backend que corre en el puerto 8080 del equipo anfitrión. Dentro de Docker, `localhost` sería el propio contenedor; por eso se usa `host.docker.internal`.

Desde la raíz del proyecto:

```sh
docker compose up --build -d
```

Abrir <http://localhost:4200>. Para detenerlo:

```sh
docker compose down
```

La imagen compila el frontend con `npm run build` y Nginx sirve los archivos generados. Las rutas de la aplicación vuelven a `index.html` para permitir enlaces directos.

Las solicitudes a `/api/...` se envían desde Nginx a `BACKEND_URL`, quitando el prefijo `/api`, igual que el proxy de desarrollo. Por ejemplo, `/api/applications` llega al backend como `/applications`. El navegador solo necesita acceso al frontend en el puerto 4200. Si cambias `.env`, reinicia el contenedor con `docker compose up -d --force-recreate`; no hace falta recompilar Angular.

`.env.example` contiene el valor de referencia. `.env` es local y está excluido de Git y de la imagen Docker.
