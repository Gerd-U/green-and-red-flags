# Green & Red Flags

Juego web multijugador para la actividad de inglés "Green and red flags in a partner". Cada persona juega en su celular un atrapa: su personaje low poly tiene que agarrar las green flags y esquivar las red flags que caen. El proyector muestra el juego de todos en vivo, el ranking, las defensas y el podio.

Hecho con React, Vite, TypeScript y Supabase Realtime (broadcast y presence). No usa tablas de base de datos.

Rutas:

- `/` inicio (entrar como jugador o abrir la sala de admin)
- `/admin` pantalla grande para el proyector
- `/play` celular de cada jugador

## Correrlo en local

Necesita Node 20 o más nuevo.

```bash
npm install
cp .env.example .env     # en Windows: copy .env.example .env
npm run dev
```

En `.env` hay que poner la URL y la anon key de Supabase (ver abajo). Después se abre `http://localhost:5173/admin` en la compu y `http://localhost:5173/play` en otra pestaña.

### Probar sin Supabase

Si solo quiero revisar algo rápido en una compu, puedo poner esto en `.env`:

```
VITE_LOCAL_REALTIME=1
```

Así las pestañas del mismo navegador se comunican entre sí sin internet. Para simular varios jugadores en el mismo navegador se agrega `&pid=` a la URL, por ejemplo `/play?room=ABCD&pid=2` y `/play?room=ABCD&pid=3`. Esto no sirve con celulares; para eso hace falta Supabase.

## Crear el proyecto en Supabase

1. Entrar a https://supabase.com, crear una cuenta y luego un proyecto nuevo (el plan gratis alcanza). La región puede ser la más cercana, por ejemplo East US.
2. Esperar a que el proyecto termine de crearse.
3. Ir a Project Settings > API (en algunas versiones del panel aparece como "Data API" o en el botón "Connect").
4. Copiar el "Project URL" en `VITE_SUPABASE_URL`.
5. Copiar la clave "anon public" (también puede aparecer como "publishable key") en `VITE_SUPABASE_ANON_KEY`.

No hay que crear tablas. Realtime viene activado por defecto; si en Realtime > Settings existe la opción de permitir solo canales privados, tiene que quedar desactivada para que los canales públicos funcionen.

El plan gratis permite 100 mensajes por segundo. Cada celular manda unas 7 actualizaciones por segundo solo al admin, así que 7 u 8 jugadores quedan por debajo del límite.

## Desplegar en Vercel

1. Subir el repo a GitHub.
2. En https://vercel.com, "Add New > Project" e importar el repo. Vercel detecta Vite solo (build `npm run build`, carpeta `dist`).
3. Antes de darle Deploy, en "Environment Variables" agregar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los mismos valores del `.env`.
4. Deploy. El archivo `vercel.json` ya redirige todas las rutas a `index.html`, entonces `/admin` y `/play` funcionan al recargar.

Si se cambian las variables después, hay que hacer "Redeploy" para que se apliquen, porque Vite las mete en el build.

## Cómo se juega

1. El admin abre `/admin`. Aparece un código de 4 letras y la URL para entrar.
2. Cada jugador entra a `/play`, pone el código y su nombre, arma su personaje y toca "Ready".
3. El admin inicia la ronda (60 segundos). Green flag suma 100, red flag resta 75. Todos empiezan con 3 vidas.
4. La primera red flag que alguien agarre pausa el juego de todos. Esa persona tiene 30 segundos para defenderse en inglés y los demás votan desde el celular. Si gana "Convinced" recupera los puntos; si no, pierde una vida. En empate gana "Convinced".
5. Las demás red flags de la ronda se guardan y al final se elige una al azar para otra defensa.
6. Las tarjetas de poder dejan mandar un sabotaje a otro jugador por 5 segundos (Gaslighting, Ghosting, Love bombing, Mixed signals, The ex is back).
7. Al final, el botón "Final podium" muestra los 3 primeros, la red flag que más gente agarró y la green flag que más gente dejó pasar.

Si un celular o el admin recargan la página, vuelven a la misma sala con su personaje y sus puntos.

## Editar las tarjetas

Las frases están en `src/data/cards.ts`. Conviene que sean cortas (unas 8 palabras como máximo) para que se lean mientras caen.
