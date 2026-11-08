# REQ-081 - Tras guardar un ajuste del equipo, el mapa quedaba en gris (sin lecturas)

| Campo | Valor |
|---|---|
| Estado | **Corregido** (2026-11-08) - probar: usuario |
| Alcance | `core.js` (`loadSystems -> alCambiarSistema`, `processSystemLogSnapshot`, `volverAMostrarMapa`) |
| Pruebas | 386/386 en Node (1 nueva) |
| Compilacion | `26.11.08.005` |

## Lo que se vio (capturas del usuario)

Mapa -> mosaico -> mapa: las parcelas se dibujaban pero **grises** (color "sin dato") y los sensores con el marcador
sin lectura.

## Causa real

1. Cambiar de vista guarda `viewMode` en los ajustes del equipo (REQ-078).
2. Firebase notifica el cambio con **solo los ajustes** (el log va en otra ruta); `alCambiarSistema` **reemplazaba el
   sistema entero** por ese objeto sin `log` y lo volvia a seleccionar.
3. Mapa redibujado sin lecturas: todo gris.
4. Al llegar el log, `processSystemLogSnapshot` solo refrescaba las fichas de los marcadores, **no las parcelas ni los
   iconos**: se quedaban grises.

Afectaba a **cualquier** guardado de ajustes (editar un sensor, un plan...); el cambio de vista lo hizo evidente.
Y por el punto 4, los colores de las parcelas tampoco se actualizaban con cada lectura nueva.

## Correccion

- `alCambiarSistema`: si los ajustes nuevos no traen `log`, se conserva el del sistema anterior.
- `processSystemLogSnapshot`: con cada lectura nueva de una red de sensores se repintan parcelas y marcadores.
- `volverAMostrarMapa` (REQ-080) usa el sistema de `$scope.systems` (con su log).

REQ-080 (redibujar al volver al mapa) se mantiene: no sobra y cubre el recorte de Leaflet con el mapa oculto.
