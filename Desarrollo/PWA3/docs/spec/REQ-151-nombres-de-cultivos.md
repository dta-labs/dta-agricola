# REQ-151 - Corregir nombres de cultivo en la base ("Jalape��o", "Manazana")

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - se aplica al abrir la app con una cuenta (probar: usuario) |
| Alcance | `assets/js/logic/cultivos.js`, `assets/js/logic/tablero.js`, `assets/js/services/repositorio.js`, `assets/js/core.js` |
| Pruebas | 4 en `test/unit/nombres-cultivos.test.js` |
| Compilacion | `26.11.22.027` |

## Pedido

"Jalape��o" (la "ñ" guardada con otra codificación) y "Manazana" están mal escritos en la base: corregirlos.

## Cómo se corrige

Desde aquí no hay acceso a la base, y las reglas permiten escribir `/cultivos` y `systems/{id}/settings` a cualquier
usuario autenticado. Por eso la corrección la hace la **app al leer los datos** (una vez por sesión y ruta):

- `cultivos.corregirNombre(texto)`: `Jalape<caracteres de reemplazo | Ã± | ?>o` → **Jalapeño**; `Manazana(s)` → **Manzana(s)**.
- `cultivos.correccionesDeNombres(objeto, campos)`: cambios por ruta (`{ "S0/culture": "Manzana" }`).
- Catálogo `/cultivos` (campos `culture` y `detail`): `repositorio.actualizarCultivos(cambios)`.
- Cultivos de cada equipo (`sensors`, `plots`, `plans`; campo `culture`, también `cultures/n/culture` de los
  invernaderos): `repositorio.actualizarAjustesSistema(clave, cambios)`.
- Se corrige también en memoria (los selectores siguen coincidiendo con el catálogo). La consola registra lo corregido.
- Mientras tanto, el resumen (`tablero.nombreDeCultivo`) ya muestra los nombres corregidos.

Basta con abrir la app una vez con una cuenta que vea esos equipos. Los equipos de otras cuentas se corrigen cuando
esas cuentas abran la app.
