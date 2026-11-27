# Green & Red Flags: notas técnicas

El manual para usar el juego en clase está en [README.md](README.md). Acá está lo técnico.

Hecho con React, Vite, TypeScript y Supabase Realtime (broadcast y presence). No usa tablas de base de datos.

Rutas (nadie las tiene que escribir a mano, salen de la pantalla de inicio):

- `/` inicio: **Join as player**, **Host a game (big screen)** y **I'm the host**
- `/admin` proyector (la autoridad del juego)
- `/play` celular de cada jugador
- `/host` celular del host (moderador, no juega)

## Qué se puede editar

- `src/lib/game.ts`: todos los tiempos, puntajes, velocidades, tamaño de las tarjetas y el plan de 27 minutos.
- `src/data/cards.ts`: tarjetas (`short` es lo que cae, máximo 5 palabras; `full` es la frase completa), Hot Takes, Icks y Soulmates.
- `src/data/host.ts`: el guion del host. Las plantillas usan `{player}`, `{card}`, `{count}`, `{other}`, `{pct}`, etc. Una pregunta solo aparece si todos sus huecos se pueden llenar, así que nunca sale un `{player}` en pantalla.
- `src/data/profiles.ts`: frases de dating profile.

## Variables de entorno

| Variable | Para qué |
| --- | --- |
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase |
| `VITE_SUPABASE_ANON_KEY` | anon key del proyecto |
| `VITE_HOST_PASSWORD` | contraseña del host. Si está vacía se usa **`Alfa12`**. |
| `VITE_LOCAL_REALTIME` | solo para pruebas en una compu sin Supabase (`1`). No ponerla en Vercel. |

La contraseña no viaja por la red: el celular del host manda una prueba calculada con ella y el proyector le responde con un token cifrado. Los comandos del host van por un canal privado y llevan ese token; el proyector ignora cualquier comando sin token válido, así que un jugador no puede controlar el juego aunque conozca el código. Ojo: la contraseña por defecto está escrita en el código (y el repo es público), y una variable `VITE_` también queda dentro del código de la página. Alcanza para una clase, no para algo de alta seguridad. Para cambiarla, poné otra en `VITE_HOST_PASSWORD` (en `.env` para local o en las variables de Vercel) y hacé Redeploy.

## Correrlo en local

Necesita Node 20 o más nuevo.

```bash
npm install
cp .env.example .env     # en Windows: copy .env.example .env
npm run dev
```

### Celulares en la misma wifi

```bash
npm run dev -- --host
```

Vite muestra una línea `Network: http://192.168.x.x:5173`. El proyector abre esa dirección, toca **Host a game** y los celulares entran a la misma dirección. Si Windows pregunta por el firewall, hay que permitir redes privadas. Inclinar el teléfono en iPhone solo funciona con HTTPS (en Vercel).

### Probar sin Supabase con 7 bots y el host

Con `VITE_LOCAL_REALTIME=1` en `.env` (o `.env.local`), abrí:

```
http://localhost:5173/dev/bots?room=ABCD&n=7&admin=1&host=1
```

Arriba se ve el proyector y el celular del host (que entra solo con la contraseña), y abajo 7 bots que juegan, votan y mandan sabotajes. Con `&aw=1280&ah=720` o `&aw=1920&ah=1080` se elige el tamaño del proyector. El código `room=` tiene que ser el que muestra el proyector. Esta página solo existe con `npm run dev`.

Para probar a mano varios jugadores en un navegador: `/play?room=ABCD&pid=2`, `/play?room=ABCD&pid=3`, etc.

Para revisar cómo se ve en distintos celulares está `/dev/phones?room=ABCD`: muestra la misma pantalla en 320×568, 360×640, 360×740, 390×844, 412×915 y 740×360 (acostado). Con `&bot=1` cada celular es un bot que juega solo, con `&host=1` son celulares de host y con `&admin=1` se agrega el proyector. También es solo para `npm run dev`.

## Crear el proyecto en Supabase

1. Entrar a https://supabase.com, crear una cuenta y un proyecto nuevo (el plan gratis alcanza).
2. Ir a Project Settings > API (o al botón "Connect").
3. Copiar el "Project URL" en `VITE_SUPABASE_URL` y la clave "anon public" (o "publishable key") en `VITE_SUPABASE_ANON_KEY`.

No hay que crear tablas. Si en Realtime > Settings existe la opción de permitir solo canales privados, tiene que quedar desactivada.

El plan gratis permite 100 mensajes por segundo. Cada celular manda unas 7 actualizaciones por segundo y solo al proyector, así que 7 jugadores usan unos 50 por segundo. El host manda muy pocos mensajes.

## Desplegar en Vercel

1. En https://vercel.com, "Add New > Project" e importar el repo `green-and-red-flags`.
2. Antes de darle Deploy, en "Environment Variables" agregar `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y, si quiero otra contraseña que no sea `Alfa12`, `VITE_HOST_PASSWORD`.
3. Deploy. `vercel.json` ya redirige todas las rutas a `index.html`.

Si cambio las variables después, hay que hacer "Redeploy".

## Música (detalles)

La música se genera con Web Audio en `src/lib/music.ts`, un estilo por parte (lobby, round1, round2, round3, podium). Si existe `public/music/<estilo>.mp3`, se usa ese archivo con un fade. El proyector revisa si el archivo existe con un pedido HEAD y mira que el tipo sea audio (el servidor de desarrollo y Vercel devuelven `index.html` cuando un archivo no existe).

## Modo demo (detalles)

Cada bot del modo demo es la página `/play?...&bot=1&demo=1` abierta en un iframe de 360×740, achicado con `transform: scale(0.25)` y casi invisible en una esquina del proyector. La forma de jugar de cada bot sale de su id (`src/player/botPersona.ts`). Para probar el modo demo sin Supabase: `VITE_LOCAL_REALTIME=1` en `.env.local`, después `npm run build` y `npm run preview`, y abrir `http://localhost:4173/admin`.
