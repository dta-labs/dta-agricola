# REQ-009b - Mensaje de resultado como funcion pura

| Campo | Valor |
|---|---|
| Estado | **Implementado** |
| Alcance | `assets/js/logic/riego.js` |
| Pruebas | 3 en `test/unit/riego.test.js` |

## 1. Problema

REQ-009 mostraba el aviso de riego con un `if` en el controlador y dos `swal` con textos literales.
Ese texto es **decision de producto**, no de vista, y no se podia probar.

## 2. Requisito

| ID | Requisito | Criterio |
|---|---|---|
| REQ-009b.1 | plan completo -> mensaje de exito | `icono: success` |
| REQ-009b.2 | plan con aviso -> warning con detalle | titulo con "avisos" y detalle con el motivo |
| REQ-009b.3 | sin resultado -> warning generico | `icono: warning`, sin detalle |

## 3. Trazabilidad

`test/unit/riego.test.js` REQ-009b.1..3 -> PASS. El controlador ahora solo hace:

```js
const mensaje = __modulo("riego").mensajeDeResultado(programa);
if (mensaje.detalle) swal(mensaje.titulo, mensaje.detalle, { icon: mensaje.icono });
else swal(mensaje.titulo, { icon: mensaje.icono });
```

Con esto **desaparece la deuda declarada** en REQ-009: el texto esta cubierto por pruebas y la vista
solo lo pinta.
