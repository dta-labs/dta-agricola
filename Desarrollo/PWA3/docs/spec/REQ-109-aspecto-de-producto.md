# REQ-109 - Aspecto de producto: barra superior, listado accionable y botones flotantes

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-20) - probar: usuario |
| Alcance | `logic/resumen.js` (nuevo), `core.js`, `index.html`, `style.css`, `components/sistema/panel-sensores/` |
| Pruebas | 452/452 en Node (7 nuevas en `resumen.test.js`) |
| Compilacion | `26.11.20.010` |

Objetivo del usuario: que la app no parezca un prototipo o una herramienta de diagnostico sino un producto comercial.

## Barra superior
Oscura y solida (`#1c2321`), en tres zonas: logo blanco (o "volver") | titulo y subtitulo centrados en dos lineas |
avatar y menu. "CONTROL DE RIEGO" ya no se corta (tamaño adaptable con `clamp`); debajo, la fecha y hora actuales
(al minuto). En un sistema: su nombre, "Ultimo reporte dd/mm/aaaa hh:mm" y una franja inferior del color de su estado.

## Hora con doble ":" (09::48)
Algunos equipos mandan `AAAAMMDD HH:MM` y la cabecera añadia otro ":". `resumen.fechaCorta` acepta `HH:MM`, `HHMM` y
`hhmmam/pm` (24 h). Tambien en la tabla del historial (`horaDeRegistro`).

## Tarjetas del listado
Fondo blanco solido (emergencia: rosado muy claro), franja izquierda del color del estado, sin transparencias.
- Icono del tipo (el pivote conserva su brazo que gira) | **nombre**, **linea de estado** y **mensaje accionable** |
  clima con **dd/mm** y **hh:mm** debajo.
- Estados: ok (verde), atencion (naranja), emergencia (rojo), inactivo (gris).

| Equipo | Linea | Mensaje |
|---|---|---|
| Pivote | "Operando (237°) · Velocidad 45 %", "Detenido · Posicion 237°" | "Sin alertas · 32 psi", "Emergencia: falla electrica · Revisar ya", "Sin comunicacion · Verificar equipo", "Esperando confirmacion del equipo" |
| Estacionario | "Regando Sector 2 y Sector 4", "En espera · Sin riego activo" | "Sin alertas", "Esperando confirmacion: <parcela>" |
| Pozo | "Bombeando · 40 psi", "Detenido" | "Sin alertas" |
| Red de sensores | "4 sensores · 12 °C" (media) | "Alerta: riesgo de helada en …" (emergencia), "Alerta: suelo seco en …", "Programar riego: estres en …", "Sin reportar hace 2 d · Verificar gateway", "Humedad adecuada · Sin alertas" |
| Nevera | "4.2 °C · Estable" | "Alerta: temperatura fuera de rango en …" |

El resumen se cachea por equipo y solo se recalcula si cambian su log, estado, parcelas, sensores o unidad.

## Botones flotantes y barras
- Notificaciones: solo en el listado (como el boton de acciones).
- Red de sensores: el cambio mapa/mosaico sale de la barra superior y pasa a un **boton flotante** abajo a la derecha.
- Mosaico de sensores: sin la barra de opciones (Historial, Sensores, Satelite, Usuarios); solo en la vista de mapa.
