# REQ-140 - Estacionario: guardar el programa de riego sin iniciarlo

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `index.html` (ventana "Programa de riego"), `core.js` (`guardarProgramaDesdeFormulario`) |
| Pruebas | 1 en `test/unit/parcelas-estacionario.test.js` |
| Compilacion | `26.11.22.017` |

## Pedido
En "Plan de riego \ Programacion", poder guardar un programa por si aun no se quiere iniciar.

## Solucion
- Nuevo boton **Guardar** (antes de "Iniciar programa") en la ventana del programa.
- Valida igual que "Iniciar" (REQ-050: errores junto a cada campo); si esta completo, le da un id si es nuevo, lo
  guarda en `settings.irrigationPlan` y cierra la ventana con el aviso "Programa guardado. No se inicio...".
- **No toca las parcelas** ni la programacion en curso (no llama a `stopStationaryProgram` ni crea las entradas de
  riego). El programa aparece en la lista de "Programacion" y se inicia cuando se quiera con su boton ▶ (que sigue
  pidiendo confirmacion porque reemplaza la programacion anterior).
- Editar un programa guardado y pulsar "Guardar" actualiza sus datos sin iniciarlo.
