# REQ-123 - Unidades frio acumuladas en la ficha del sensor

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-21) - probar: usuario |
| Alcance | `assets/js/logic/frio.js`, `core.js` (`getSensorText`, `cargarUnidadesFrio`, opcion "Cultivo") |
| Pruebas | 6 en `unidades-frio.test.js` |
| Compilacion | `26.11.21.002` |

## Pedido

En el historial de los sensores no mostrar las unidades frio puntuales, sino su acumulado.

## Contexto

La ficha del sensor (opcion "Cultivo") mostraba "Horas frio (u)" con el indice 6 del ultimo registro de `dayLogs`:
las unidades frio de esa hora (1, 0.5, 0, -0.5, -1 en el modelo Utah que usa el servidor desde 2026-11-21).

## Solucion

- La fila pasa a "Unidades frio acumuladas (desde el 1 nov)" y se calcula al abrir "Cultivo":
  - suma de las UF diarias de `systems/{red}/logs` (resumen del dia) desde el 1 de noviembre de la temporada;
  - mas lo que va de hoy (y de un dia aun no resumido) desde `dayLogs`: promedio de sus registros x horas
    transcurridas (24 si el dia ya termino).
- `logic/frio.js` (UMD, puro): `inicioTemporada`, `acumulado`, `horaDe`.

## Limitaciones

- La temporada empieza el 1 de noviembre (constante `MES_INICIO`/`DIA_INICIO` en `frio.js`).
- Los resumenes diarios anteriores a la correccion del servidor (2026-11-21) se calcularon con otro modelo
  (suma de registros, no Utah): el acumulado de esta temporada los incluye tal como estan guardados.
