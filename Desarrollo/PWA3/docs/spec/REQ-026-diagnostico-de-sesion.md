# REQ-026 - Diagnostico de sesion (herramienta)

| Campo | Valor |
|---|---|
| Estado | **Implementado** |
| Alcance | `diagnostico.html` (nuevo). No toca la aplicacion |
| Pruebas | Verificada en headless (mide de verdad, no finge) |
| Riesgo | Nulo: es una pagina aparte |

## 1. Por que existe

Tras el arreglo de REQ-025 desaparecio el `Uncaught TypeError`, pero el flujo de Google seguia sin
entrar y los logs del usuario no incluian las trazas de la aplicacion (estaban recortados). Seguir
deduciendo costaba un ciclo por intento.

Esta pagina responde con **datos** a la pregunta "que ve realmente Firebase al volver".

## 2. Que mide

| Dato | Para que |
|---|---|
| `firebase.apps.length` | detectar apps duplicadas (la causa del bug original de REQ-015) |
| `auth.currentUser` | sesion persistida en el navegador |
| `auth.getRedirectResult()` | resultado de la redireccion, con codigo de error si falla |
| **`onAuthStateChanged`** | es el canal que usa la aplicacion: si no se dispara, la app nunca se enterara |
| claves de `localStorage` | confirmar que hay persistencia |
| bases de `indexedDB` | persistencia de Firebase v8 |
| `serviceWorker.controller` y caches | detectar que se sirve una version vieja |

Responde en un `<pre>` con JSON y cambia el titulo a **SESIÓN ACTIVA** o **SIN SESIÓN**, para
poder copiarlo de un vistazo. Tiene tres redes de seguridad: tiempo maximo de 8 s por medicion,
un timeout global de 10 s y captura de errores, para que nunca se quede en "Midiendo…".

## 3. Como se usa

```
http://localhost:5502/diagnostico.html
```

Sin sesion debe decir `SIN SESIÓN`; despues de entrar con Google debe decir `SESIÓN ACTIVA` y
mostrar `onAuthStateChanged: disparado con <email>`.

## 4. Lo que ya revelo

En headless (`127.0.0.1:8090`, dominio **no** autorizado en Firebase) devuelve:

```
"redirect": { "estado": "sin respuesta en 8000 ms" }
"onAuthStateChanged": { "disparado": false, ... }
```

Es el comportamiento correcto y demuestra que la medicion no esta simulada: cuando el dominio no
esta autorizado, el canal de sesion no responde.

## 5. Pendiente

- Ejecutarla en `localhost:5502` con la cuenta real y comparar: si `currentUser` existe pero
  `onAuthStateChanged` no se disparo, el problema esta en el canal de eventos del SDK; si ambos
  estan vacios, el redirect no llego a completar la sesion.
