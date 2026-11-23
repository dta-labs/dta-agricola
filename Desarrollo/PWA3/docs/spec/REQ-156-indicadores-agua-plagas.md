# REQ-156 - Resumen: 6 indicadores (consumo de agua y riesgo de plagas), por importancia y certeza

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `logic/tablero.js`, `logic/notificaciones.js`, `components/tablero/*`, `core.js`, `firebase-messaging-sw.js` |
| Pruebas | 4 en `test/unit/resumen-agua-plagas.test.js` |
| Compilacion | `26.11.22.032` |

## Orden (importancia y certeza)

Cada indicador lleva su **certeza** en una etiqueta: Reportado > Pronóstico > Medido > Estimado > Modelo.

| # | Indicador | Valor | Contexto | Certeza |
|---|---|---|---|---|
| 1 | Regando ahora | equipos regando | "N con falla crítica" | Reportado (estado del equipo) |
| 2 | Mínima esta noche | °C | Riesgo de helada / sin riesgo / cultivos en reposo | Pronóstico (Open-Meteo) |
| 3 | Humedad óptima | % ponderado | "x de y sectores activos" | Medido (sensores) |
| 4 | **Consumo de agua** | m³/h en curso | equipos activos · sin caudal configurado · caudalímetros | Estimado (Medido si solo hay caudalímetros) |
| 5 | **Riesgo de plagas** | Alto / Medio / Bajo / Sin riesgo / — | enfermedad y probabilidad, o sensores que vigilan | Modelo |
| 6 | Pendientes hoy | acciones sin marcar | "de N acciones" | Tu lista |

PC: 3 por fila (2 filas). Celular: 2 por fila y la etiqueta de certeza abajo.

## Consumo de agua

- Equipos que **están regando** (misma regla que "Regando ahora") x su **caudal configurado** (`settings.caudal`).
  Estacionario sin caudal del equipo: suma el caudal de las válvulas abiertas (`plots.pN.caudal`).
- **Unidades**: la ventana dice "Caudal (m³/s)" pero la dosis del Estacionario lo usa como L/s. Regla: menor que 1 =
  m³/s; 1 o más = L/s (un pivote da 20-120 L/s). **Confirmar con el usuario** y, si procede, corregir la etiqueta.
- Caudalímetros (sensores `Fl` de neveras e invernaderos, L/min): se suman como medidos.
- Si hay equipos regando sin caudal configurado: se cuentan aparte ("1 sin caudal configurado"); si ninguno tiene
  caudal, el valor es "—" (no se inventa).
- **Pendiente** (siguiente paso): volumen del día o del ciclo y comparación contra ayer o el plan. Requiere sumar los
  tiempos de riego de cada equipo desde sus registros (mejor en el servidor, en el resumen diario).

## Riesgo de plagas

- Avisos "Plagas" (`disease-risk` de las Cloud Functions) de las **últimas 48 h**: el peor nivel (≥70 % alto,
  ≥40 % medio) y su enfermedad con la probabilidad ("Tizón tardío · 78 %"). La notificación ahora guarda
  `enfermedad` y `probabilidad` (también la que llega con la app cerrada: service worker con la versión nueva).
- Sin avisos: "Sin riesgo" si algún sensor vigila enfermedades (`sensor.alerts`), o "—" con "Activa las alertas de
  plagas en tus sensores".
