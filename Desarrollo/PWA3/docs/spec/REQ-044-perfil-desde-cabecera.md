# REQ-044 - Perfil desde la cabecera del menu y Plan dentro del perfil

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-06) - probar: usuario |
| Alcance | `index.html` (menu lateral, `#modalMiPerfil`), `core.js` (region PERFIL), `style.css` |
| Pruebas | 241/241 en Node (`menu-salir.test.js`: 3 pruebas nuevas, 1 sustituida) |
| Origen | Usuario, 2026-11-06 |

## 1. Pedido

1. Eliminar el boton "Cambiar de usuario".
2. Quitar el boton "Perfil": la cabecera del menu lateral (foto, nombre, correo y plan) abre el perfil.
3. El boton "Plan" pasa al final del modal del perfil.

## 2. Cambios

| Donde | Cambio |
|---|---|
| Menu lateral | La cabecera `.usuario-cabecera` es un boton (`role="button"`, `tabindex="0"`, Enter/Espacio) que cierra el menu y abre "Mi perfil"; flecha `chevron_right` como pista. Salen las opciones Perfil, Plan y Cambiar de usuario |
| `#modalMiPerfil` | Al final del contenido, seccion "Plan": "Tu plan actual: X" y boton **Plan** que abre el modal de planes encima del perfil (al cerrarlo se vuelve al perfil) |
| `core.js` | Salen `$scope.cambiarDeUsuario`, `$scope.esCuentaGoogle` y la inyeccion de `dtaAuth` en el controlador (solo la usaba "Cambiar de usuario"). `core.js?v=26.11.06.005` |
| `style.css` | Estados de la cabecera (cursor, foco, hover) y la seccion `.perfil-plan`. `style.css?v=26.11.06.001` |

Cambiar de cuenta sigue siendo posible: "Salir" y entrar con otra cuenta (Google pregunta la cuenta,
REQ-020).

## 3. Efecto en REQ-041

El componente de perfil hereda este diseno: la cabecera es la entrada al perfil y Planes se abre
desde el perfil. Ya no hay "Cambiar de usuario" que mover a `dtaSesion`.
