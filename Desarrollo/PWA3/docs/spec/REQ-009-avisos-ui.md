# REQ-009 - Los avisos de riego llegan al usuario

| Campo | Valor |
|---|---|
| Estado | **Implementado** |
| Alcance | `assets/js/core.js` (llamador de `createStationaryProgram`) |
| Pruebas | el calculo esta cubierto (38); la UI sin prueba automatica (ver §5) |
| Riesgo | Bajo: un unico llamador, verificado |

## 1. Problema

REQ-007 introdujo `aviso` en `riego.programar` (planes incompletos: se programan menos de 7 parcelas).
El aviso solo se escribia en la consola, y **nadie mira la consola al crear un plan**.

## 2. Requisito

| ID | Requisito |
|---|---|
| REQ-009.1 | Si el plan se programa incompleto, el usuario debe verlo al terminar |

## 3. Decision de diseno

`createStationaryProgram` devolvia solo el `id`. Ahora devuelve `{ id, aviso }`:

```
antes:  let id = createStationaryProgram(p);  if (!p.id) p.id = id;
ahora:  const programa = createStationaryProgram(p);  if (!p.id) p.id = programa.id;
```

El llamador (unico, verificado con busqueda) muestra:

| Situacion | Mensaje |
|---|---|
| plan completo | *"Programa de riego iniciado correctamente!"* (icono `success`) |
| plan incompleto | *"Programa iniciado con avisos"* + el detalle + *"Revisa las parcelas sin tiempo."* (icono `warning`) |

Se usa `swal`, que ya es el patron de este flujo (no `M.toast`), para no introducir otra convencion.

## 4. Trazabilidad

| Requisito | Verificacion | Estado |
|---|---|---|
| REQ-009.1 (calculo) | `REQ-006.8` y `REQ-007.6` comprueban que `aviso` se genera | PASS |
| REQ-009.1 (UI) | revision estatica: el llamador usa `programa.aviso` con `swal` + arranque en Chrome headless | PASS |

## 5. Limitacion conocida (deuda declarada)

**No hay prueba automatica para la llamada a `swal`**: requiere levantar Angular con un `$scope` real.
Opciones para cerrarla:

1. Extraer el formateo del mensaje a una funcion pura (`mensajeDeResultado(programa)` en `riego.js`)
   y probarla. **Recomendado**: es inocuo y deja la UI como simple consumidor.
2. Montar un harness de controlador (mas trabajo, util cuando se extraigan los servicios de REQ-010).

Se deja anotado como REQ-009b.
