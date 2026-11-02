# REQ-010 - Repositorio de datos y adaptador de Firebase (rebanada 1: lecturas)

| Campo | Valor |
|---|---|
| Estado | **Implementado** (rebanada 1 de 3) |
| Alcance | `assets/js/services/repositorio.js`, `assets/js/services/adaptadorFirebase.js` |
| Pruebas | 8 en `test/unit/repositorio.test.js` + 3 en `test/smoke.html` |
| Riesgo | Medio: se cambia como se leen los datos, con la misma semantica |

## 1. Problema

`core.js` construia rutas de Firebase a mano en 6 sitios y `firebaseComm.js` en otros. Eso mezcla
**esquema de datos** (que es logica de negocio) con **infraestructura**, y hace imposible probar
nada sin una base de datos.

## 2. Solucion

```
services/repositorio.js        conoce el ESQUEMA: systems/{k}/settings, cultivos, configurations/{t}
services/adaptadorFirebase.js  conoce FIREBASE: .on / .once / .limitToLast / .orderByChild
test/unit/repositorio.test.js  adaptador FALSO en memoria: 0 llamadas de red
```

El repositorio se construye con **inyeccion**: `repositorio.crear(adaptador)`.

## 3. Requisitos

| ID | Requisito | Criterio |
|---|---|---|
| REQ-010.1 | `escucharSistema` -> `systems/{clave}/settings` | ruta exacta |
| REQ-010.2 | entrega cambios y permite cancelar | callback y `off()` verificados |
| REQ-010.3 | `escucharUsuariosSistema` -> `systems/{clave}/users` | ruta exacta |
| REQ-010.4 | `escucharUltimoLog` -> `limitToLast(1)` | ruta y `n` |
| REQ-010.5 | `leerLogs` normaliza el directorio con o sin barra inicial | ambas variantes |
| REQ-010.6 | `leerLogsPorRango` filtra por `date` y cierra con `\uf8ff` | campo y extremo |
| REQ-010.7 | `leerCultivos` y `leerConfiguracion` usan las rutas del esquema | exactas |
| REQ-010.8 | un adaptador incompleto falla con mensaje claro | 2 casos |

## 4. Trazabilidad

| Requisito | Prueba | Estado |
|---|---|---|
| REQ-010.1..8 | `test/unit/repositorio.test.js` (8 casos) | PASS |
| REQ-010.1/.4/.6 | 3 equivalentes en `test/smoke.html` | PASS |

**Evidencia**: 46/46 en Node, 17/17 en Chrome headless, la app arranca (`ng-scope`, 375.046 B).

## 5. Cambios en core.js

| Antes | Ahora |
|---|---|
| `firebase.database().ref(...).on("value", cb)` en `loadSystems` | `__repo().escucharSistema(clave, cb)` |
| idem en `loadSystemUsers` | `__repo().escucharUsuariosSistema(...)` |
| `ref(logPath).limitToLast(1)` en `listenLatestSystemLog` | `__repo().escucharUltimoLog(...)` |
| query + `once("value")` en `loadSystemLog` | `__repo().leerLogs(...)` / `leerLogsPorRango(...)` |
| `ref("configurations/"+type).once(...)` en `ciclo` | `__repo().leerConfiguracion(type)` |
| `ref("cultivos").once(...)` en `getCultures` | `__repo().leerCultivos()` |

Llamadas directas a `firebase.database()` en `core.js`: **6 -> 0**. Solo quedan 2 de autenticacion
(`onAuthStateChanged`, `signOut`), que son de otra reclamacion (REQ-010 rebanada 3).

## 6. Decisiones

1. **El adaptador devuelve el snapshot**, no `val()`. Asi los consumidores existentes
   (`processSystemLogSnapshot`, `invertLog`, etc.) siguen igual y la rebanada no cambia semantica.
2. **`__repo()` como puente con error explicito**, mismo patron que `__modulo()`.
3. **El repositorio se crea en `firebaseComm.js`** (justo despues de `initializeApp`) y se expone como
   `repoDTA`. Los modulos de logica y servicios se cargan **antes** de `firebaseComm.js`.
4. **Correccion incluida**: `loadSystemUsers` ahora cancela el listener anterior. Antes, cada cambio
   de settings anadia un listener nuevo (fuga). Es una mejora de robustez, documentada aqui.

## 7. Pendiente

| Rebanada | Contenido |
|---|---|
| 2 (REQ-011) | **escrituras**: `setMachineSettings`, `updateDeviceUsers`, `deleteUser`, `updateUserInfo`, `getMeassurementValues` |
| 3 (REQ-012) | **autenticacion**: `onAuthStateChanged`, `signOut` |
| 4 (REQ-013) | adelgazar el controlador: un servicio por dominio (devices, riego) |
