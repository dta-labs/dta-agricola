# REQ-135 - Nevera: titulo mayor, configuracion al tocar la tarjeta y boton de grafica

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `components/sistema/panel-nevera/panel-nevera.html`, `paneles.css` |
| Pruebas | 1 en `test/unit/nevera.test.js` |
| Compilacion | `26.11.22.012` |

## Pedido
- Titulo de la tarjeta mas grande, sin que crezca la tarjeta.
- Dejar solo el boton de la grafica, mas grande (mayor area de contacto).
- La configuracion se abre tocando la tarjeta (como las fichas de los sensores de suelo, REQ-074).

## Solucion
- Titulo de 1.15 rem a 1.4 rem (interlineado 1.2). Para compensar: menos relleno arriba (12 a 10 px) y abajo
  (10 a 8 px), menos margen del cuerpo y del pie. Medido en la maqueta: 192 px de alto (antes 196 px).
- Toda la tarjeta es un boton (`role="button"`, teclado con Enter o espacio) que abre "Editar sensor"; sombra mayor al
  pasar el raton y contorno al enfocarla con el teclado.
- Al pie: bateria y un unico boton de grafica de 64 x 42 px (antes dos de 36 x 36), con el color del estado; su clic no
  abre la configuracion (`stopPropagation`).
