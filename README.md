# Green & Red Flags: manual del presentador

Es un juego para la actividad de inglés "Green and red flags in a partner". Cada estudiante arma un personaje en su celular y juega a atrapar tarjetas que caen: las green flags (cosas buenas en una pareja) se atrapan y las red flags (señales de alerta) se esquivan. El proyector muestra el juego de todos al mismo tiempo. Yo, como host, manejo la actividad desde mi celular: avanzo cada parte con un botón y tengo un guion con lo que digo y las preguntas que hago.

La actividad dura unos 27 minutos, con un máximo de 30.

Las partes técnicas (instalar, Supabase, Vercel, variables) están en [DEV.md](DEV.md).

## Qué necesito

- Una compu conectada al proyector, con internet y el navegador abierto en la página del juego.
- Mi celular (Android con Chrome funciona mejor para las vibraciones).
- Los celulares de los estudiantes, con internet. No instalan nada.
- La contraseña de host: **Alfa12** (distingue mayúsculas).

## Antes de la clase

1. En la compu del proyector abro la página del juego y toco **Host a game (big screen)**. Sale la pantalla de inicio con el código de la sala (4 letras).
2. En mi celular abro la misma página y toco **I'm the host**. Escribo el código de la sala y la contraseña **Alfa12**.
3. Toco **Start hosting**.
4. En el proyector aparece "🎤 Host". Desde ahora manejo todo desde el celular.
5. Si quiero, abro el menú ⚙️ y toco **Test vibration** para ver si mi celular vibra. El juego funciona igual sin vibración.

La pantalla del celular tiene que quedar encendida toda la actividad. Si el celular avisa que no puede dejarla encendida solo, conviene subir el tiempo de bloqueo antes de empezar.

Si el celular se bloquea o se recarga, vuelvo a la vista de host sin escribir nada; solo toco otra vez **Start hosting**.

## Cómo entran los estudiantes

Escanean el QR que sale en el proyector. La sala ya viene puesta, así que solo escriben su nombre (máximo 12 letras) y tocan **Next: build your character**. Después arman su personaje (o tocan **🎲 Random**), eligen una frase para su "dating profile" y tocan **Looks good! ✓**. En el proyector se ve quién está listo.

Si alguien no puede escanear, entra a la dirección que se ve abajo en el proyector y escribe el código.

## Mi celular durante la clase

La pantalla tiene cuatro partes, de arriba abajo:

1. Una línea chica con la parte del juego, un dato (por ejemplo "45s left" o "Votes 3/5"), el reloj de la actividad y el botón ⚙️.
2. El **guion**, grande.
3. El botón **Next line**, que solo mueve el guion.
4. El botón principal del juego, abajo.

Nada aparece encima del guion: no hay carteles ni parpadeos. El único aviso es una línea roja chica arriba si se pierde la conexión con el proyector.

El **guion** va de a un paso por vez:

- **SAY** (verde): lo que digo yo.
- **ASK** (amarillo): una pregunta para hacer. El nombre de la persona a quien se la hago aparece resaltado.
- Abajo dice "Step 2 of 4". Con **Next line** paso al siguiente paso del guion. Ese botón solo mueve el guion, no el juego. Con ◀ vuelvo al paso anterior.
- Si no me gusta una pregunta, **🔀 Other** la cambia por otra.
- Cuando el juego pasa a otra parte, el guion vuelve al paso 1.

Las preguntas usan nombres y tarjetas reales de la partida, por ejemplo: "Ana, you caught 'Reads your messages'. Can you forgive this one time?".

### Modo calma: nada empieza solo

Cada parte empieza en pausa. Cuando toco Next, el proyector muestra solo el título de esa parte ("Round 1: First Date", el Hot Take, la persona que tiene que defenderse) y nada se mueve: no corre el reloj, no caen tarjetas y no empieza la votación. Así puedo leer el guion tranquilo.

El botón principal cambia de color según lo que hace:

- **Verde (Start ▶, Start vote ▶, Show results ▶)**: empieza la acción de esa parte. Solo arranca cuando lo toco.
- **Azul (Next: …)**: la acción ya terminó y paso a la parte siguiente.
- **Amarillo**: algo necesita mi atención. Debajo sale una línea chica que dice qué pasa, por ejemplo "Red flag! Zoe caught one" o "All votes are in".
- **Gris**: no hay nada que tocar (por ejemplo "Round in progress…" mientras se juega).

Cuando una acción termina (la ronda, una votación), todo se queda quieto esperando, y el botón vuelve a ser Next. La ronda de juego es lo único que termina sola, a los 75 segundos. La defensa sigue pausando la ronda cuando alguien atrapa una red flag, pero también entra en calma: el proyector muestra a la persona y su tarjeta, y los 20 segundos para hablar no corren hasta que toco **Start**.

Los otros controles están en el menú ⚙️: ⏱ Starting soon (cuenta regresiva de 1 minuto en el lobby), Pause y End round en la ronda, Objection en la defensa, Skip Hot Take, elegir quién habla en el Hot Take, Play again, esconder el guion, Test vibration y Leave host.

## Paso a paso

| Parte | Qué hago | Qué hace Next |
| --- | --- | --- |
| Intro | Leo el guion: qué es una red flag y una green flag. La gente ya puede ir entrando. | Abre el lobby |
| Lobby | Espero a que entren. El guion trae preguntas sobre sus frases de perfil. | Empieza el juego (cuando hay alguien listo) |
| Tutorial | El proyector muestra las reglas. Cuando termino de explicar, **Start** y los celulares hacen una práctica de 3 pasos. | Next: empieza la ronda 1 |
| Ronda 1 "First Date" | Sale el título de la ronda. **Start round** y empiezan a caer las tarjetas. Dura 75 segundos y termina sola. | (la ronda termina sola) |
| Defensa | Pasa una vez por ronda: alguien que atrapó una red flag la explica en inglés. **Start** da los 20 s para hablar (Objection en ⚙️ suma 10 s). | Start vote, Show results y después Next: vuelve al juego |
| Resultados | Ranking de la ronda y una pregunta para la clase. | Next: pasa al Hot Take |
| Hot Take | Sale una situación. Dejo que la lean y toco **Start vote**: votan en secreto red o green. **Show results** muestra los votos; en ⚙️ elijo quién habla y después doy mi opinión. | Next: Your opinion y después la ronda siguiente |
| Ronda 2 "Getting Serious" | Algunas tarjetas caen grises: hay que leerlas antes de atraparlas. | |
| Ronda 3 "Meet the Parents" | Todas grises, más rápido y puntos dobles. | |
| Premios | **Show the awards** los muestra: Most Toxic, Sneakiest Player, Best Lawyer, Most Attacked y Most Icks. | Next: podio |
| Podio | Los 3 primeros. | Final thoughts |
| Final thoughts | El proyector muestra datos curiosos de la partida y el guion me da las frases. | Fin |

Si voy atrasado, puedo saltar un Hot Take con **Skip Hot Take** (en ⚙️).

## La vibración

El celular vibra un momento cuando toco el botón principal (Start o Next), como confirmación del toque. Nada más depende de la vibración: si un celular no vibra, el juego funciona igual y el color del botón principal sigue avisando cuando algo necesita atención.

## Reglas del juego (para explicar)

- Green flag atrapada: +100 puntos. Varias seguidas dan combo (x1.5, x2, x3).
- Red flag atrapada: −75 puntos y se pierde un corazón.
- Una green que se deja caer: −25.
- Cada persona tiene 5 corazones por partida. Con 0 espera 10 segundos y vuelve con 1.
- Tarjeta dorada (soulmate): +300 y un corazón de vuelta. Tarjeta morada (the ick): no suma ni resta.
- Poderes: sirven para molestar a otro jugador por 5 segundos (por ejemplo, invertir sus controles). **Therapy** protege del próximo ataque.
- **⚡ Dash** mueve al personaje rápido hacia un lado.

## Ensayar con el modo demo

Para practicar sin estudiantes:

1. Abro el proyector y mi celular de host como en la clase.
2. Muevo el mouse sobre el proyector (o aprieto la tecla **H**) y aparece un panel chico abajo a la izquierda.
3. Toco **Open lobby** y después **Demo: add 3 bots** (se puede tocar hasta 3 veces, máximo 9 bots). Los bots tienen la etiqueta **BOT** y juegan solos, cada uno a su manera.
4. Hago la clase completa con el botón principal y el guion, para probar los tiempos.
5. Al terminar toco **Remove bots** y **New room…** para empezar la clase con una sala limpia.

Los bots juegan solo mientras la página del proyector está abierta y visible.

## Música

El proyector tiene música propia, distinta en cada parte (más tranquila en el lobby y más rápida en la última ronda). Baja sola cuando alguien habla. El botón **🎵 Music** del panel la apaga o la prende. Para usar canciones propias sin derechos de autor (por ejemplo de Pixabay Music), ver [DEV.md](DEV.md).

## Si algo falla

- **Mi celular no vibra.** No pasa nada, el juego no lo necesita. Si quiero revisarlo, abro ⚙️ y toco **Test vibration**. Si dice "Vibration API: no", ese navegador no puede vibrar (pasa en iPhone). Si dice "Last call: false", el celular bloqueó la vibración: reviso que no esté en silencio, en No molestar ni en ahorro de batería, y que la vibración esté activada en los ajustes del teléfono.
- **Arriba sale una línea roja "No connection with the projector".** Espero unos segundos; se reconecta solo. Si no, recargo la página y toco **Start hosting**.
- **Toqué Next y no pasa nada en el proyector.** Seguramente está esperando que toque el botón verde (Start). Todo empieza en pausa a propósito.
- **Un estudiante no puede entrar.** Reviso que tenga internet y que escriba bien el código. Si entra con la ronda empezada, ve "Joining next round" y juega desde la ronda siguiente.
- **Un celular dice "Reconnecting…".** Normalmente vuelve solo. Si tarda, que recargue la página: vuelve con su personaje.
- **Se recargó el proyector.** La partida vuelve donde estaba, en pausa. Toco el botón principal (Start, Resume o Next) para seguir.
- **No entra la contraseña.** Es **Alfa12**, con A mayúscula.
- **Quiero empezar de cero.** En el panel del proyector, **New room…** (pide confirmación). Los estudiantes tienen que entrar con el código nuevo.
