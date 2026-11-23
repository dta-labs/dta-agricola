# REQ-160 - Resumen: "fisiología + seguridad" (helada agrupada por impacto y configuración aparte)

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `logic/tablero.js`, `components/tablero/*` |
| Pruebas | 3 en `test/unit/resumen-seguridad.test.js` |
| Compilacion | `26.11.22.036` |

## Análisis del usuario (resumen)

- La base es la "fisiología" del cultivo (agua, temperatura, sanidad) y la **seguridad** del productor (que nada grave
  se le vaya de las manos). El resumen cubre ambas, pero:
  1. **Contradicción de volumen**: arriba "2 alertas críticas" y abajo seis líneas "Helada en Sensor X" de distintos
     equipos: parece que el resumen minimiza o que no agrupa por impacto.
  2. **Configuración mezclada con urgencia**: "Asigna el cultivo (26 sensores)" y "Dibuja tus parcelas" junto a una
     helada de 2 °C y una falla eléctrica distraen.

## Cambios

1. **Helada medida agrupada por impacto** (`Qué atender primero` y banner): con helada en 2 o más equipos, un solo
   aviso crítico "Helada en N equipos · M sensores bajo el mínimo" con las hectáreas bajo el umbral (si las
   parcelas están dibujadas) y los equipos. Orden dentro de lo crítico: fallas de equipo, helada medida, helada
   pronosticada. El banner nombra las críticas en ese orden.
2. **Acción de contención** en "Lo que toca hoy": "Activar la protección contra helada en N equipos (M sensores bajo
   el mínimo)" (o "en <equipo>" si es uno).
3. **Actividad de hoy**: los eventos "X: Helada en …" y los avisos de helada del día se agrupan en una línea
   "Helada en N equipos (M avisos) · 21:17–21:45". Los de equipos con todos sus cultivos en reposo no se muestran.
   Los eventos guardan ahora la clave del equipo (`sistema`).
4. **Rescate de hoy vs. mantenimiento**: las sugerencias del día quedan solo con lo operativo (helada, riego,
   conexión). Nueva sección **Configuración pendiente**: asignar cultivo a los sensores, dibujar parcelas,
   configurar el caudal de los equipos que riegan sin él, activar alertas de plagas. Plegada al final en "Todo";
   primera y abierta en "Administración"; no aparece en Riego, Agronomía ni Campo.
