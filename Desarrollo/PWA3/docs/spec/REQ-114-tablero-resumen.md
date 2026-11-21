# REQ-114 - Resumen ejecutivo como pagina de entrada

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-20) - probar: usuario |
| Alcance | `logic/tablero.js` (nuevo), `components/tablero/` (nuevo), `core.js`, `index.html` |
| Pruebas | 465/465 en Node (7 nuevas en `test/unit/tablero.test.js`) |
| Compilacion | `26.11.20.015` |

## Objetivo
Que al abrir la app el productor sepa en segundos si todo va bien y que tiene que atender, sin recorrer los equipos.
Mezcla de las dos propuestas revisadas (sin el mapa), pensada para movil.

## Pantalla
La pantalla principal ("listado") tiene dos modos, elegidos con un selector en la cabecera:
**Resumen** (de entrada, cada vez que se inicia sesion) y **Equipos** (las tarjetas de siempre). El resto de la app
(botones flotantes, volver, menu) no cambia.

1. **Indicadores**: semaforo ("Todo en orden" / "N cosas requieren tu atencion · X urgentes · Y por revisar hoy") y 4
   casillas: equipos bien (de N), regando ahora, suelo adecuado (% de sensores con humedad adecuada o muy humedo) y
   esta noche (minima del pronostico).
2. **Atiende primero**: equipos en emergencia y luego en atencion (mismo resumen humano del listado, REQ-109/110) y la
   helada prevista. Tocar un equipo lo abre; tocar la helada lleva a Equipos.
3. **Mis cultivos**: cultivos agrupados (sin distinguir mayusculas) de sensores, parcelas del estacionario y sectores
   del plan del pivote; hectareas (poligonos, o pi r^2 · arco/360 en el pivote), fase fenologica mas frecuente y estado
   (riesgo de helada > algo seco > adecuado > sin sensor).
4. **Hoy**: cambios de estado de los equipos de hoy (alerta, se normalizo, inicio/termino el riego), notificaciones del
   dia y "Proximo: riesgo de helada". "Ver todos los equipos ->" pasa a Equipos.

## Datos
- Todo se calcula en `DTALogic.tablero` (puro) con las reglas existentes; en `core.js` se guarda en cache por huella
  (log, estado, parcelas y sensores de cada equipo, pronostico, eventos y bandeja) para no entrar en `infdig`.
- **Eventos de "Hoy"**: con cada lectura se compara el resumen con el anterior; la primera lectura de cada equipo es la
  referencia (no es evento). Se guardan por usuario en este dispositivo (`localStorage dta-eventos:<correo>`, solo los
  de hoy, maximo 50).
- **Pronostico**: Open-Meteo (`api.open-meteo.com`, gratuito, sin clave; anadido a la CSP) en la ubicacion de la
  primera red de sensores (o del primer equipo) con coordenadas; minima entre ahora y las 9 h del dia siguiente; se
  pide al cargar los equipos y como mucho cada 3 h (si falla, reintento en 30 min).
- **Umbral de helada**: el mayor minimo de temperatura configurado en los sensores (°C, el mas prudente); si no hay,
  2 °C. Minima <= 0 °C es urgente.

## Pendiente / fuera de alcance
- El historial de "Hoy" es local del dispositivo (no viaja entre dispositivos).
- Probar con datos reales en el navegador (requiere sesion).
