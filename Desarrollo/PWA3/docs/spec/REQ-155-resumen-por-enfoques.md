# REQ-155 - Resumen por enfoques (roles): alertas sin ruido, 4 indicadores y acciones del día

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `assets/js/logic/tablero.js`, `components/tablero/*`, `index.html` (campana flotante) |
| Pruebas | 4 en `test/unit/resumen-enfoques.test.js`; 6 ajustadas en `tablero.test.js` y 1 en `notificaciones.test.js` |
| Compilacion | `26.11.22.031` |

## Problemas que resuelve

- **Fatiga de alerta**: 22 alertas en rojo y "11 de 55 equipos bien" (la mayoria solo en pausa o esperando
  confirmacion). Ahora solo lo **crítico** (falla real o riesgo inmediato) va en rojo.
- **Contradicción en reposo**: "En reposo invernal" con "Algo seco" naranja. En reposo, el suelo algo seco y la helada
  no son urgentes: el cultivo dice "En reposo · suelo algo seco, sin urgencia" (tono neutro) y no genera aviso.
- **Tres mecanismos compitiendo** (banner, "Atiende primero" y campana flotante): la campana ya no se muestra en el
  Resumen (el banner abre las notificaciones) y "Qué atender primero" muestra máximo 5.
- **Textos truncados** y tarjetas pequeñas de superficies dispares: cultivos en filas, sin cortar textos, con barra
  de superficie comparativa; ordenados por prioridad y luego por superficie.
- **Lo que toca hoy y Sugerencias al fondo**: en la PC van en la columna principal (cultivos a la derecha); en el
  celular van antes de los cultivos. La actividad del día queda plegada al final.

## Clasificación de avisos (logic/tablero.js)

| Categoría | Ejemplos | Color |
|---|---|---|
| `critico` | Falla eléctrica, falla de seguridad, nevera fuera de rango, helada en sensores, helada pronosticada | Rojo |
| `agronomia` | Suelo seco / programar riego de un cultivo **fuera** del reposo | Ámbar |
| `comunicacion` | Sin comunicación, sin reportar | Neutro |
| `confirmacion` | Esperando confirmación | Neutro |

Comunicación y confirmación se **agrupan** ("8 equipos esperando confirmación"). Orden: crítico, agronomía,
comunicación, confirmación. Los avisos de redes cuyos cultivos están todos en reposo no se listan.

## Secciones

1. **Enfoque** (chips; se recuerda en el dispositivo): Todo · Riego · Agronomía · Campo · Administración.

   | Enfoque | Secciones | Avisos |
   |---|---|---|
   | Todo | todas | todos |
   | Riego | atender, toca hoy, sugerencias | crítico, agronomía, comunicación, confirmación |
   | Agronomía | atender, cultivos, sugerencias | crítico, agronomía |
   | Campo | atender, toca hoy, actividad | todos |
   | Administración | atender, cultivos | crítico |
2. **Alertas** (banner): rojo solo con críticas ("2 alertas críticas" y cuáles); ámbar con avisos de suelo; neutro
   "Sin fallas críticas · N pendientes de revisión"; verde "Todo en orden". Cuentas: críticas / de suelo / por revisar.
3. **Indicadores**: *Regando ahora* (+ "N con falla crítica"), *Humedad óptima* (sectores activos fuera del reposo,
   ponderados por superficie; "x de y sectores activos"), *Pendientes hoy* (acciones sin marcar), *Mínima esta
   noche* ("Riesgo de helada" / "Sin riesgo" / "Cultivos en reposo").
4. **Qué atender primero**: por impacto, máximo 5 visibles y "Ver los N restantes".
5. **Lo que toca hoy**: lista de verificación con acciones concretas ("Revisar falla eléctrica en Abraham 8",
   "Confirmar el riego en 2 equipos", "Verificar la mínima nocturna (2 °C hacia las 05:10)", "Programar riego en X").
   Las marcas se guardan en el dispositivo y se reinician cada día.
6. **Sugerencias del día**: máximo 3, ligadas a datos (helada con la hora de la mínima, riego, conexión, cultivo o
   parcela faltante); el consejo general solo si no hay ninguna.
7. **Mis cultivos**: filas con superficie (2 decimales si es menor de 1 ha) y barra comparativa.
8. **Actividad de hoy** (antes "Hoy"): plegada.
