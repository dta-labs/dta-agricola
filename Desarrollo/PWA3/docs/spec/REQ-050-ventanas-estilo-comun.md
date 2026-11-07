# REQ-050 - Notificaciones, Ayuda, Invitar a alguien y Programa de riego con el estilo comun

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-06) - probar: usuario |
| Alcance | `assets/css/ventana.css` (nuevo), `index.html` (`#modalNotificaciones` nuevo, `#modalAddUser`, `#modalStationaryProgram`, menu), `components/ayuda/`, `core.js`, `logic/riego.js`, `tema.css` |
| Pruebas | 271/271 en Node (9 nuevas en `ventanas.test.js`; ayuda y formularios ajustadas) |
| Origen | Usuario: "crea el mismo estilo visual para Notificaciones, Ayuda, Invitar a alguien y Programa de riego (revisar todo el formulario)" |

## 1. Estilo comun reutilizable

`ventana.css` generaliza el diseno aprobado de "Mi perfil" (REQ-045): `.ventana-cabecera` (degradado,
icono, titulo y subtitulo, cerrar), `.ventana-cuerpo` (desplazable), `.ventana-seccion`, `.ventana-pie`
(fijo), campos en caja y un **interruptor** `.ventana-opcion` + `.ventana-interruptor` sin checkbox
(Materialize interfiere con todos, REQ-046). Sirve para modales de Materialize (`.modal.ventana-modal`
con `.bs.ventana` dentro) y de Bootstrap (`.ventana-caja`). `tema.css` excluye `.ventana-modal`.

## 2. Ventanas

| Ventana | Antes | Ahora |
|---|---|---|
| Notificaciones | Pantalla completa con casillas de iconos | **Modal** `#modalNotificaciones` con dos interruptores (notificaciones, sonido) con explicacion; "Listo". El menu llama a `abrirNotificaciones()` |
| Ayuda | Pantalla completa (componente) | **Modal** de Bootstrap con el mismo mecanismo que Fichas (`ng-if="ayudaAbierta"`, `al-cerrar`); la ruta `#!/ayuda` tambien lo abre |
| Invitar a alguien | Etiquetas de Materialize, boton con icono de "reply" y otro de "check" | Correo (con ayuda), nombre y rol en caja; "Cancelar" / **"Invitar"**; valida correo y nombre y solo cierra si esta bien |
| Programa de riego | Ver seccion 3 | Secciones "Programa", "Cuando", "Tiempo de riego por parcela"; total de minutos por ciclo; botones con texto |

## 3. Programa de riego: revision del formulario

| ID | Defecto | Correccion |
|---|---|---|
| PR-1 | "Iniciar" cerraba el modal **antes** de validar: con datos incompletos salia el aviso y se perdia el formulario | `iniciarProgramaDesdeFormulario()` valida con `logic/riego.js -> erroresDelPrograma`; muestra cada error **bajo su campo** y solo cierra cuando esta completo |
| PR-2 | "Eliminar" borraba sin confirmar, y aparecia tambien en un programa nuevo | Confirmacion en el pie ("¿Eliminar este programa? Si, eliminar / No"); solo si el programa ya existe |
| PR-3 | Los 7 temporizadores tenian el mismo `id` | `programaParcela1..7` con su `label` |
| PR-4 | En un programa nuevo, "Repetir cada" podia salir vacio (`periodo: 0` numerico frente a opciones `"0"`) | `periodo` siempre texto (`normalizarPrograma`, `newStationaryProgram`); opciones con `ng-options` desde `PERIODOS` |
| PR-5 | No se comprobaba que la fecha de fin fuera posterior a la de inicio ni que "cada" fuera >= 1 | Nuevas reglas en `erroresDelPrograma` |
| PR-6 | Texto "Por complete los datos" | "Por favor, completa los datos marcados con *" |

Lo guardado no cambia de formato (fechas y horas como antes, REQ-043 A3). `startStationaryProgram`
conserva su comprobacion y su confirmacion.

## 4. Prueba manual

Notificaciones (activar/desactivar ambos), Ayuda (abrir, secciones, compartir, cerrar y reabrir; tambien
`#!/ayuda`), Invitar (correo invalido, sin nombre, invitacion valida), Programa (nuevo vacio -> errores en
linea; fecha fin anterior; programa completo -> confirmacion; editar uno existente: periodo y minutos
cargados; eliminar con confirmacion).
