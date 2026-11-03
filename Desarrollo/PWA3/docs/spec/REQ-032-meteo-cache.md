# REQ-032 - La meteorologia se pedia una vez por sistema

| Campo | Valor |
|---|---|
| Estado | **Implementado** |
| Alcance | `logic/meteo.js` (nuevo), `core.js` (`getMetorologicalData`) |
| Pruebas | 136/136 en Node (9 nuevas) |
| Riesgo | Bajo: si algo falla, cada sistema vuelve a pedir lo suyo |

## 1. El sintoma

Tras entrar, la aplicacion lanzaba entre 88 y 100+ peticiones. Muchas eran de Firebase (logs y
suscripciones por sistema), pero la mas lenta era externa:

```js
getMetorologicalData = (key) => {
    $.ajax({ url: `https://api.openweathermap.org/...&lat=${...}&lon=${...}` ...
```

**Una peticion a OpenWeather por cada sistema**, sin cache. Varios sistemas de la misma finca
comparten coordenadas, asi que se repetian peticiones identicas a un servicio externo lento, con
limite de 60 peticiones/minuto en el plan gratuito (y sin `error`, asi que un fallo se perdia en
silencio).

## 2. Arreglo

`logic/meteo.js` implementa un cache con tres reglas, cada una con su prueba:

1. la clave son las **coordenadas** redondeadas a 4 decimales (misma ubicacion -> misma entrada);
2. mientras una peticion esta **en vuelo**, las demas esperan esa misma promesa (no se duplica);
3. los **errores no se cachean**: se puede reintentar.

TTL de 10 minutos (el tiempo no cambia lo bastante como para pedirlo mas a menudo).

`getMetorologicalData` ahora:

- usa `claveDeCache(lat, lon)`;
- asi N sistemas con la misma ubicacion hacen **una sola** peticion;
- añade `error` al `$.ajax` y reporta con `console.warn`;
- usa `$applyAsync` en lugar de `$apply` (evita "digest already in progress").

## 3. Pruebas

`test/unit/meteo.test.js` (9 pruebas): normalizacion de coordenadas (incluidos textos y valores
invalidos), una sola peticion para coordenadas repetidas, peticiones simultaneas compartidas,
coordenadas distintas, caducidad del TTL con reloj inyectado, errores no cacheados y contadores.

## 4. Como comprobarlo

En la pestaña **Red**, filtro `openweathermap`:

| Antes | Ahora |
|---|---|
| una peticion por sistema | una por **ubicacion** (normalmente 1) |

## 5. Pendiente

Quedan las peticiones de Firebase: por cada sistema se abre la escucha del ultimo log y se lee el
log historico. Eso son N lecturas y N suscripciones. Se puede reducir cargando los logs solo del
sistema activo, pero cambia el comportamiento de la vista de logs y conviene medirlo aparte.
