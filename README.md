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
2. En mi celular (Android, con Chrome) abro la app y toco **I'm the host**. Escribo el código de sala y la contraseña de host: **`Alfa12`** (o la que haya puesto en `VITE_HOST_PASSWORD`). Distingue mayúsculas; los espacios al inicio y al final no importan. El proyector nunca la muestra.
3. Toco **Start hosting**. Ese toque es necesario: Chrome en Android solo deja vibrar y sonar a una página después de que la tocaste.
4. Listo: en el proyector aparece "🎤 Host" y los botones del proyector se esconden. Si mi celular recarga o se bloquea, vuelvo a la vista de host sin escribir nada (solo vuelvo a tocar **Start hosting**). **Leave host** está en el menú ⚙️ y cierra la sesión.

**La pantalla del celular tiene que quedar encendida durante la actividad.** La app lo pide sola con la Wake Lock API; si el navegador no puede (por ejemplo entrando por `http://192.168…` en la misma wifi), sale el aviso "Keep your screen on" y conviene subir el tiempo de bloqueo de pantalla del celular antes de la clase.

### Señales en el celular (cues)

El celular me avisa sin tener que mirarlo:

| Tipo | Vibración | Color | Cuándo |
| --- | --- | --- | --- |
| 🎤 SPEAK (me toca hablar) | una larga | verde | empieza la intro, se abre el lobby, empieza una defensa, resultados de ronda, se revela el Hot Take, termina el tiempo de un speaker, premios, podio y Final thoughts |
| 👆 ACT (tocar un botón) | dos cortas | amarillo | faltan 5 s de la defensa (Objection o votación), terminó la votación del Hot Take, todos en Ready en el lobby, faltan 5 s de la ronda |
| ⚠️ WARN | tres cortas | rojo | voy atrasado según el plan, faltan 3 minutos para los 30, se perdió la conexión |

Además del patrón de vibración, el borde de la pantalla parpadea con el color y arriba sale un banner grande con el texto y la pregunta del guion lista. El banner se va con **Got it** o cuando cambia la fase. En el menú ⚙️ quedan los últimos 3 cues por si me perdí uno.

En el menú ⚙️ de la vista de host hay switches de **Vibration**, **Flash** y **Cue sound** (un ding bajito, apagado por defecto para que la clase no lo escuche) y un botón **Test cue** que dispara los tres tipos seguidos. Conviene probarlo antes de la clase con el celular en la mano. Si se pierde la conexión con el proyector sale un banner rojo "Disconnected — reconnecting…" hasta que vuelve.

Los cues están en `src/host/cues.ts`: ahí se puede cambiar el texto de cada uno o cuándo se dispara.

### El proyector

Arriba: el logo, la ronda con el tiempo grande y el reloj de la actividad. Abajo: el código de sala, la URL corta y un QR pequeño (en la intro y el lobby el QR va grande en el centro). Mientras el host está conectado, los botones del proyector están escondidos; si muevo el mouse o presiono **H** aparecen 4 segundos en la esquina de abajo a la derecha. Si no hay host conectado, el panel se ve siempre (se puede jugar sin celular de host). **New room…** está en ese panel y pide confirmación.

En mi celular arriba veo el reloj de la actividad, en qué parte vamos y si voy "On time" o atrasado según el plan. Faltando 3 minutos para los 30 sale un aviso rojo. Debajo está el **guion**: lo que digo (Say) y una pregunta para hacer (Ask). Las preguntas usan nombres y tarjetas reales de la partida; con ◀ ▶ veo otra y con **Shuffle** cambio por una de otra persona. El switch **Show script** del menú ⚙️ lo esconde si solo quiero los botones.

Abajo está el botón grande **Next**, que siempre hace el paso que sigue y dice cuál es ("Next: Open the lobby", "Next: Start vote", "Next: Reveal the votes"…). Casi toda la clase se maneja solo con ese botón. Debajo hay una fila de botones más chicos que cambian según la parte: ⏱ Starting soon en el lobby, Pause y End round en la ronda, Objection en la defensa, Skip Hot Take, Go to awards y Play again. Todo entra en la pantalla de un celular de 412×915 sin hacer scroll.

### Paso a paso

| Parte | Qué hago | Tiempo |
| --- | --- | --- |
| Intro | El guion trae mis puntos: qué es una red flag, qué es una green flag y cómo se juega. Mientras hablo, la gente ya puede entrar. Toco **Open the lobby**. | 2 min |
| Lobby | Todos entran con el QR (la sala ya viene puesta), escriben su nombre (máximo 12 letras; si se repite se le agrega un número) y arman su personaje. **🎲 Random** arma uno al azar y **Looks good! ✓** los deja listos. Con **⏱ Starting soon** sale en el proyector una cuenta regresiva de 1 minuto. El guion me da preguntas sobre esas frases ("Ana, your profile says..."). Cuando están listos: **Start game**. | 4 min |
| Tutorial | 20 s. En el proyector salen las reglas completas para explicarlas; en el celular hay una práctica de 3 pasos (atrapar verdes, esquivar rojas, leer las grises) que no suma puntos. Puedo saltarlo. | 0:20 |
| Ronda 1 "First Date" | Tarjetas con color. La primera red flag después del segundo 10 pausa todo para la defensa. | ~2 min |
| Defensa | La persona tiene 20 s para defenderse en inglés. **Objection!** suma 10 s con sonido y animación. **Next: Start vote** pasa a la votación cuando yo quiera (10 s). El guion trae 3 preguntas de seguimiento sobre esa tarjeta. | ~45 s |
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
- **Dash**: el botón ⚡ Dash entre las flechas, doble toque en una flecha o deslizar rápido el dedo. Tiene 1,2 s de espera.
- **Entrar tarde**: si alguien entra con la ronda ya empezada, ve "Joining next round" y juega desde la siguiente.
- **Defensa**: una por ronda. Si la persona que se defiende se desconecta, la defensa se cancela sola y el juego sigue. Si gana "Convinced" (o hay empate) recupera el corazón y los puntos; si no, pierde 100 puntos más.

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

Arriba se ve el proyector y el celular del host (que entra solo con la contraseña), y abajo 7 bots que juegan, votan y mandan sabotajes. Con `&aw=1280&ah=720` o `&aw=1920&ah=1080` se elige el tamaño del proyector. En modo dev, cada cue del host se registra en la consola como `[cue] SPEAK intro - …`. El código `room=` tiene que ser el que muestra el proyector. Esta página solo existe con `npm run dev`.

Para probar a mano varios jugadores en un navegador: `/play?room=ABCD&pid=2`, `/play?room=ABCD&pid=3`, etc.

Para revisar cómo se ve en distintos celulares está `/dev/phones?room=ABCD`: muestra la misma pantalla en 320×568, 360×640, 360×740, 390×844, 412×915 y 740×360 (acostado). Con `&bot=1` cada celular es un bot que juega solo, con `&host=1` son celulares de host y con `&admin=1` se agrega el proyector. También es solo para `npm run dev`.

## Modo demo (bots en el proyector)

En el panel escondido del proyector (mover el mouse o presionar **H**) está el botón **Demo: add 3 bots**. Agrega 3 jugadores que juegan solos, con nombre y personaje al azar y la etiqueta **BOT** en el lobby, en las pantallas y en el ranking. Se puede tocar varias veces (hasta 9 bots). **Remove bots** los saca.

Funciona en producción (Vercel con Supabase), no solo en `npm run dev`: cada bot es la página normal del jugador abierta en un cuadrito casi invisible en una esquina del proyector, con el mismo piloto automático que usa `/dev/bots`. Por eso los bots solo juegan mientras la página del proyector está abierta y visible.

## Ensayar antes de la clase

1. Abro el proyector en la compu y el celular de host como en la clase.
2. Toco **Open the lobby** y después **Demo: add 3 bots** (una o dos veces).
3. Hago la clase completa con el botón **Next** del celular: así pruebo las vibraciones, el guion y los tiempos sin alumnos. Con mi propio celular también puedo entrar como jugador para ver qué ven ellos.
4. Al final toco **Remove bots** y **New room…** para que la clase empiece con una sala limpia.

Para probar el modo demo en la compu sin Supabase: con `VITE_LOCAL_REALTIME=1` en `.env.local` corro `npm run build` y `npm run preview`, y abro `http://localhost:4173/admin`. Esa variable nunca va en Vercel (`.env.local` no se sube al repo).

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
