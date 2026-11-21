# REQ-115 - Resumen: sugerencias del dia y bienvenida sin equipos

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-20) - probar: usuario |
| Alcance | `logic/tablero.js`, `components/tablero/`, `core.js`, `index.html` |
| Pruebas | 468/468 en Node (3 nuevas en `test/unit/tablero.test.js`) |
| Compilacion | `26.11.20.016` |

## Con equipos: "Sugerencias del dia" (al final del resumen)
Maximo 3 tarjetas: hasta 2 accionables segun los datos y, siempre, un consejo del dia (rota con el dia del año entre 7
consejos generales: riego temprano, filtros y boquillas, comparar humedad antes/despues, etapa del cultivo,
notificaciones, velocidad del pivote, riego por zonas). Accionables, en orden:
1. Helada prevista (minima <= umbral, REQ-114): riego ligero por la tarde.
2. Sensores con suelo seco (si no hay helada): programar el riego temprano -> abre la red.
3. Equipos sin comunicacion: revisar alimentacion y señal -> abre el equipo.
4. Sensores sin cultivo: asignarlo para verlo en "Mis cultivos" -> abre la red.
5. Sensores con cultivo sin parcela dibujada: dibujarla para calcular hectareas -> abre la red.

## Sin equipos registrados: bienvenida
Cuando el usuario no tiene equipos (`loadSystems` sin `systems`, no mientras cargan), el resumen cambia a una
bienvenida y las sugerencias de inicio son protagonistas: **Agregar tu primer equipo** (abre el mismo formulario que el
boton +), **¿Aun no tienes un equipo DTA?** (dtaamerica.com/dta-agricola en otra pestaña) e **Instalar la app** (solo
si no esta instalada). La pantalla de inicio se cierra en cuanto se sabe que no hay equipos (antes esperaba 5 s).
