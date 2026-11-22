# REQ-138 - Resumen: cultivos con su equipo, "Atiende primero" con desplazamiento, semaforo y periodo del cultivo

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `logic/tablero.js`, `components/tablero/` (vista, controlador, estilos), `core.js`, `index.html` |
| Pruebas | 3 en `test/unit/tablero.test.js` |
| Compilacion | `26.11.22.015` |

## Pedido
1. "Mis cultivos": aunque un cultivo no tenga sensor, mostrar informacion del sistema asociado.
2. "Atiende primero": area fija con desplazamiento, sin barra visible.
3. La primera fila (numero de alertas) abre la ventana de notificaciones.
4. Tener en cuenta el periodo del cultivo antes de mostrar una notificacion en esta vista.

## Solucion
1. Cada cultivo guarda los **equipos** donde esta (red de sensores, estacionario o pivote) con su nombre, su linea corta
   del resumen ("Operando", "En espera", "5 sensores") y el color de su estado. Sin datos de sensor, la tarjeta muestra
   "● Pivote Norte · Operando" (y "+N" si esta en mas equipos) en lugar de "Sin sensor"; tocarla abre ese equipo.
   Los cultivos se agrupan sin mayusculas **ni acentos** ("Maiz" y "Maíz" son uno; se muestra la forma con acento).
2. "Atiende primero" va en un area de alto fijo (tres avisos, 214 px) que se desplaza sin barra visible
   (`scrollbar-width: none`, `::-webkit-scrollbar`); con mas de tres, el titulo dice cuantos y el borde inferior se
   desvanece para indicar que hay mas.
3. El semaforo es un boton (con flecha) que abre la ventana de notificaciones (`abrirNotificaciones`).
4. **Periodo del cultivo**: con `logic/frio.js` (REQ-129) se sabe si un cultivo de hoja caduca esta en su **reposo
   invernal** (p. ej. manzano 1 nov - 15 mar, nogal 1 nov - 28 feb). En reposo la helada no daña al cultivo (es el frio
   que necesita):
   - el cultivo muestra "En reposo" (y "En reposo invernal" si no tiene fase) en lugar de "Riesgo de helada";
   - "Helada esta noche" (Atiende primero), "Preparate para la helada" (sugerencias) y "Proximo: riesgo de helada"
     (Hoy) solo aparecen si algun cultivo **no** esta en reposo (o no hay cultivos registrados);
   - en "Hoy" no aparecen las notificaciones de helada o temperatura de los equipos con **todos** sus cultivos en reposo.
   La ventana de notificaciones no cambia: ahi siguen todas.

## Nota sobre los datos
Nombres de cultivo con caracteres dañados en la base de datos (p. ej. "Jalape��o") vienen asi de origen; no se
pueden reparar desde la app.
