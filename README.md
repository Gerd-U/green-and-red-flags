# Green & Red Flags

Juego web multijugador para la actividad de inglés "Green and red flags in a partner". Cada persona arma una personita low poly en su celular y juega un atrapa: tiene que agarrar las green flags y esquivar las red flags que caen. El proyector muestra el juego de todos en vivo, el ranking, las defensas, los premios y el podio.

Hecho con React, Vite, TypeScript y Supabase Realtime (broadcast y presence). No usa tablas de base de datos.

Rutas:

- `/` inicio (entrar como jugador o abrir la sala de admin)
- `/admin` pantalla grande para el proyector
- `/play` celular de cada jugador

## Guía rápida para el presentador

La actividad completa cabe en unos 18 minutos con 6 o 7 personas. El juego en sí dura unos 11 minutos y el resto es entrar a la sala y discutir.

| Momento | Qué hago | Duración aprox. |
| --- | --- | --- |
| Lobby | Abro `/admin` en el proyector. Todos entran a la URL con el código, arman su personaje y eligen su frase de "dating profile". Mientras tanto leemos en voz alta algunos perfiles. Cuando todos dicen Ready, toco **Start game**. | 3 a 4 min |
| Tutorial | Sale solo en el proyector y en los celulares. Se puede saltar con **Skip tutorial**. | 20 s |
| Ronda 1 "First Date" | Tarjetas con su color, caen lento. No hago nada. | 1:15 + defensa |
| Defensa | La primera red flag después del segundo 10 pausa a todos. La persona tiene 20 s para defenderse en inglés (el proyector le da una frase para arrancar) y los demás votan 10 s. **Start vote** y **Close vote** adelantan el tiempo. Después hay 10 s y el juego sigue solo. | 45 s |
| Resultados | Ranking, "Red flag of the round" y una pregunta para comentar. Hay 1 minuto de discusión y 10 s de cuenta regresiva. **Hold timer** lo pausa si la conversación está buena; **Round 2 now** la corta. | 1:10 |
| Ronda 2 "Getting Serious" | La mitad de las tarjetas caen grises: hay que leerlas. | 1:15 + defensa |
| Resultados | Igual que antes. | 1:10 |
| Ronda 3 "Meet the Parents" | Todas grises, más rápido y los puntos valen doble. | 1:15 + defensa |
| Resultados + premios | Discusión de la última ronda y después los 5 premios, uno por uno. | 1:40 |
| Podio | Los 3 primeros y las estadísticas para cerrar la discusión. **Play again** vuelve al lobby. | 1 min |

En la barra del proyector están el reloj de la actividad (cuenta desde que se creó la sala), "Round X of 3", los botones de música y efectos de sonido, y **New room** por si hay que empezar de cero con otro código. Si alguien recarga el celular o el proyector, vuelve a la misma sala con su personaje y sus puntos.

La música arranca cuando se toca cualquier botón del proyector (los navegadores no dejan reproducir sonido antes). Baja sola durante las defensas y la discusión para que se escuche a la persona.

## Reglas

- **Green flag** atrapada: +100. Cada green seguida sube el combo (x1, x1.5, x2, x3). Una red lo reinicia.
- **Red flag** atrapada: −75 y se pierde un corazón.
- **Green que se deja pasar**: −25.
- **Corazones**: 5 por partida. Con 0 quedás "Heartbroken" 10 segundos (no podés atrapar nada) y volvés con 1 corazón y la mitad del combo. Nadie queda fuera.
- **Soulmate** (dorada, máximo 2 por ronda): +300 y recupera un corazón.
- **The Ick** (morada): no suma ni resta, solo dispara "THE ICK!" en el proyector y cuenta para el premio.
- **Poderes**: Gaslighting (controles invertidos), Ghosting (tarjetas casi invisibles), Love bombing (todo se ve verde), Mixed signals (todo cae más rápido) y The ex is back (congelado). Duran 5 s y se mandan a otra persona. **Therapy** es un escudo para uno mismo que bloquea el próximo sabotaje.
- **Dash**: doble toque en una flecha o deslizar rápido el dedo sobre el juego. Tiene 1,2 s de espera.
- **Defensa**: una por ronda. Si gana "Convinced" (o hay empate) recupera el corazón y los puntos de esa red flag. Si no, pierde 100 puntos más.
- **Premios**: Most Toxic (más reds), Master Manipulator (más sabotajes enviados), Best Lawyer (más votos Convinced), Victim of the Night (más sabotajes recibidos) y The Ick Collector.

Todos los tiempos y puntajes están en `src/lib/game.ts`, en la parte de arriba. Si la actividad se alarga se puede bajar `durationMs` de las rondas o `DISCUSSION_MS`. Las frases de las tarjetas están en `src/data/cards.ts` y las de los perfiles en `src/data/profiles.ts`.

## Correrlo en local

Necesita Node 20 o más nuevo.

```bash
npm install
cp .env.example .env     # en Windows: copy .env.example .env
npm run dev
```

En `.env` van la URL y la anon key de Supabase (ver abajo). Después se abre `http://localhost:5173/admin` en la compu y `http://localhost:5173/play` en otra pestaña.

### Probar con celulares en la misma wifi

```bash
npm run dev -- --host
```

Vite muestra una línea `Network: http://192.168.x.x:5173`. El proyector abre `/admin` y los celulares entran a `http://192.168.x.x:5173/play`. Si Windows pregunta por el firewall, hay que permitir redes privadas. Inclinar el teléfono en iPhone solo funciona con HTTPS, o sea en Vercel; en local se usan los botones.

### Probar sin Supabase y con 7 jugadores falsos

Con esta línea en `.env` (o en `.env.local`), las pestañas del mismo navegador se comunican sin internet:

```
VITE_LOCAL_REALTIME=1
```

Para simular la clase completa abrí `http://localhost:5173/dev/bots?room=ABCD&n=7&admin=1`. Esa página muestra el proyector arriba y 7 bots que juegan solos abajo, todo en la misma pestaña. El código de sala tiene que ser el mismo que muestra el admin (o tocar **New room** y cambiar `room=` en la URL). Esta página solo existe con `npm run dev`; no se incluye en el build de producción.

Para probar a mano con varios jugadores en un navegador se agrega `&pid=` a la URL: `/play?room=ABCD&pid=2`, `/play?room=ABCD&pid=3`, etc.

## Crear el proyecto en Supabase

1. Entrar a https://supabase.com, crear una cuenta y luego un proyecto nuevo (el plan gratis alcanza).
2. Esperar a que el proyecto termine de crearse.
3. Ir a Project Settings > API (en algunas versiones del panel aparece como "Data API" o en el botón "Connect").
4. Copiar el "Project URL" en `VITE_SUPABASE_URL`.
5. Copiar la clave "anon public" (también puede aparecer como "publishable key") en `VITE_SUPABASE_ANON_KEY`.

No hay que crear tablas. Realtime viene activado por defecto; si en Realtime > Settings existe la opción de permitir solo canales privados, tiene que quedar desactivada.

El plan gratis permite 100 mensajes por segundo. Cada celular manda unas 7 actualizaciones por segundo y solo al admin (por su propio canal), así que 7 jugadores usan unos 50 por segundo. Los efectos del proyector salen de esos mismos mensajes.

## Desplegar en Vercel

1. Subir el repo a GitHub.
2. En https://vercel.com, "Add New > Project" e importar el repo. Vercel detecta Vite solo (build `npm run build`, carpeta `dist`).
3. Antes de darle Deploy, en "Environment Variables" agregar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. No agregar `VITE_LOCAL_REALTIME` en Vercel.
4. Deploy. El archivo `vercel.json` ya redirige todas las rutas a `index.html`, entonces `/admin` y `/play` funcionan al recargar.

Si se cambian las variables después, hay que hacer "Redeploy" para que se apliquen, porque Vite las mete en el build.
