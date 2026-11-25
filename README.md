# Green & Red Flags

Juego web multijugador para la actividad de inglés "Green and red flags in a partner". Cada persona arma una personita low poly en su celular y juega un atrapa: agarrar las green flags y esquivar las red flags. El proyector muestra el juego de todos en vivo, y yo, como host, dirijo el debate desde mi celular con un guion que se arma con lo que pasa en la partida.

Hecho con React, Vite, TypeScript y Supabase Realtime (broadcast y presence). No usa tablas de base de datos.

Rutas (nadie las tiene que escribir a mano, salen de la pantalla de inicio):

- `/` inicio: **Join as player**, **Host a game (big screen)** y **I'm the host**
- `/admin` proyector (la autoridad del juego)
- `/play` celular de cada jugador
- `/host` celular del host (moderador, no juega)

## Guía del presentador (unos 27 minutos)

### Antes de empezar

1. En la compu del proyector abro la app y toco **Host a game (big screen)**. Sale la pantalla "Red flags vs Green flags" con el código de sala.
2. En mi celular abro la app y toco **I'm the host**. Escribo el código de sala y la contraseña de host:
   - Si definí `VITE_HOST_PASSWORD` (en `.env` o en Vercel), uso esa.
   - Si no, en la esquina de abajo a la derecha del proyector hay un botón pequeño **Show host PIN**. Lo toco, veo el PIN de 4 dígitos por 6 segundos y se esconde solo.
3. Listo: en el proyector aparece "🎤 Host". Si mi celular recarga o se bloquea, vuelvo a la vista de host sin escribir nada. **Leave host** cierra la sesión.

En mi celular arriba veo el reloj de la actividad, en qué parte vamos y si voy "On time" o atrasado según el plan. Faltando 3 minutos para los 30 sale un aviso rojo. Debajo está el **guion**: lo que digo (Say) y una pregunta para hacer (Ask). Las preguntas usan nombres y tarjetas reales de la partida; con ◀ ▶ veo otra y con **Shuffle** cambio por una de otra persona. **Hide script** lo esconde si solo quiero los botones.

### Paso a paso

| Parte | Qué hago | Tiempo |
| --- | --- | --- |
| Intro | El guion trae mis puntos: qué es una red flag, qué es una green flag y cómo se juega. Mientras hablo, la gente ya puede entrar. Toco **Open the lobby**. | 2 min |
| Lobby | Todos entran con el código, arman su personaje y eligen su frase de dating profile. El guion me da preguntas sobre esas frases ("Ana, your profile says..."). Cuando están listos: **Start game**. | 4 min |
| Tutorial | Sale solo, 20 s. Puedo saltarlo. | 0:20 |
| Ronda 1 "First Date" | Tarjetas con color. La primera red flag después del segundo 10 pausa todo para la defensa. | ~2 min |
| Defensa | La persona tiene 20 s para defenderse en inglés. **Objection!** suma 10 s con sonido y animación. **Go to the vote** pasa a la votación cuando yo quiera (10 s). El guion trae 3 preguntas de seguimiento sobre esa tarjeta. | ~45 s |
| Resultados | Ranking por 15 s y después empieza solo el Hot Take. | 0:15 |
| Hot Take 1 | Situación ambigua. Todos votan en secreto RED o GREEN (15 s). Se revelan los dos lados con porcentajes. Toco un nombre de cada lado para darle la palabra (30 s cada uno), después **Host's verdict** y doy mi opinión. **Next round** cuando quiera: el Hot Take no avanza solo. Si voy atrasado, **Skip Hot Take**. | ~3 min |
| Ronda 2 "Getting Serious" | La mitad de las tarjetas caen grises. | ~2 min |
| Hot Take 2 | Igual que el primero, con otra situación. | ~3 min |
| Ronda 3 "Meet the Parents" | Todo gris, más rápido y puntos dobles. | ~2 min |
| Resultados y premios | Most Toxic, Master Manipulator, Best Lawyer, Victim of the Night, The Ick Collector. | ~1 min |
| Podio | Los 3 primeros. Toco **Final thoughts**. | 1 min |
| Final thoughts | El proyector muestra la red flag más atrapada, la green más ignorada, el Hot Take más dividido y el jugador más tóxico. El guion me da 3 datos curiosos con la frase lista para decirlos. | ~3 min |

Total planeado: unos 25 minutos más margen. El plan exacto (para el aviso de atraso) está en `PLAN`, en `src/lib/game.ts`. Si la clase se alarga, puedo saltar un Hot Take o bajar las rondas a 60 s (`durationMs`).

El proyector también tiene todos los botones, por si el host no está conectado.

## Reglas

- **Tarjetas**: pequeñas, con máximo 5 palabras. Cuando alguien atrapa una, la frase completa aparece grande 1 segundo en su celular y en su pantalla del proyector. Caen en filas de 1 o 2 tarjetas, siempre con un hueco para esquivar.
- **Green flag** atrapada: +100. Cada green seguida sube el combo (x1, x1.5, x2, x3). Una red lo reinicia.
- **Red flag** atrapada: −75 y se pierde un corazón.
- **Green que se deja pasar**: −25.
- **Corazones**: 5 por partida. Con 0 quedás "Heartbroken" 10 segundos y volvés con 1 corazón y la mitad del combo.
- **Soulmate** (dorada, máximo 2 por ronda): +300 y recupera un corazón.
- **The Ick** (morada): no suma ni resta, solo dispara "THE ICK!" en el proyector y cuenta para el premio.
- **Poderes**: Gaslighting, Ghosting, Love bombing, Mixed signals y The ex is back duran 5 s y se mandan a otra persona. **Therapy** es un escudo que bloquea el próximo sabotaje.
- **Dash**: doble toque en una flecha o deslizar rápido el dedo. Tiene 1,2 s de espera.
- **Defensa**: una por ronda. Si gana "Convinced" (o hay empate) recupera el corazón y los puntos; si no, pierde 100 puntos más.

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
| `VITE_HOST_PASSWORD` | contraseña del host. Si está vacía, el proyector genera un PIN de 4 dígitos al crear la sala. |
| `VITE_LOCAL_REALTIME` | solo para pruebas en una compu sin Supabase (`1`). No ponerla en Vercel. |

La contraseña no viaja por la red: el celular del host manda una prueba calculada con ella y el proyector le responde con un token cifrado. Los comandos del host van por un canal privado y llevan ese token; el proyector ignora cualquier comando sin token válido, así que un jugador no puede controlar el juego aunque conozca el código. Ojo: como es una variable `VITE_`, queda dentro del código de la página, así que es para una clase, no para algo de alta seguridad.

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

Arriba se ve el proyector y el celular del host (que entra solo con la contraseña o el PIN), y abajo 7 bots que juegan, votan y mandan sabotajes. El código `room=` tiene que ser el que muestra el proyector. Esta página solo existe con `npm run dev`.

Para probar a mano varios jugadores en un navegador: `/play?room=ABCD&pid=2`, `/play?room=ABCD&pid=3`, etc.

## Crear el proyecto en Supabase

1. Entrar a https://supabase.com, crear una cuenta y un proyecto nuevo (el plan gratis alcanza).
2. Ir a Project Settings > API (o al botón "Connect").
3. Copiar el "Project URL" en `VITE_SUPABASE_URL` y la clave "anon public" (o "publishable key") en `VITE_SUPABASE_ANON_KEY`.

No hay que crear tablas. Si en Realtime > Settings existe la opción de permitir solo canales privados, tiene que quedar desactivada.

El plan gratis permite 100 mensajes por segundo. Cada celular manda unas 7 actualizaciones por segundo y solo al proyector, así que 7 jugadores usan unos 50 por segundo. El host manda muy pocos mensajes.

## Desplegar en Vercel

1. En https://vercel.com, "Add New > Project" e importar el repo `green-and-red-flags`.
2. Antes de darle Deploy, en "Environment Variables" agregar `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y, si quiero contraseña fija, `VITE_HOST_PASSWORD`.
3. Deploy. `vercel.json` ya redirige todas las rutas a `index.html`.

Si cambio las variables después, hay que hacer "Redeploy".
