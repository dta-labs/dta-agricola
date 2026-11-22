# REQ-139 - Estacionario: tarjetas de "Plan de riego \ Parcelas"

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `logic/parcela.js` (`tarjeta`, `textoDuracion`), `core.js` (`tarjetaParcela`), `index.html`, `style.css` |
| Pruebas | 2 en `test/unit/parcelas-estacionario.test.js` |
| Compilacion | `26.11.22.016` |

## Pedido
Mejorar el aspecto de las tarjetas de las parcelas para que se vean mas profesionales (antes: una imagen generica de
"foto", el nombre y el cultivo).

## Diseño
Cuadricula de 2 columnas (celular) o 4 (desde 601 px). Cada tarjeta, solida con liston izquierdo del color del estado:
- **Numero** de la parcela (1-7) en un cuadro del color del estado y el **nombre** ("Seccion N" si no tiene).
- **Cultivo** con icono (o "Sin cultivo" en gris).
- **Superficie** (ha, del poligono dibujado) y **duracion del riego** programada ("1 h 30 min"), si existen.
- **Humedad del suelo** del sensor asociado a la parcela (punto de color y "Suelo adecuado · 42 %"), si tiene.
- **Estado**: Regando (verde), Esperando (ambar: orden enviada, sin confirmar), Detenida (gris), con la misma regla
  que el mapa y el listado (`panel.estadoParcela`).
- **Motor (M)**: icono de la bomba, "Toca para encender/apagar" y su estado (Encendido / Esperando / Apagado).

El comportamiento no cambia: la parcela abre "Editar riego"; el motor se enciende o apaga al tocarlo.
Los datos se calculan en `DTALogic.parcela.tarjeta` y se guardan en cache mientras no cambien las parcelas (incluidos
los cambios que hace la propia app), la lectura del equipo ni las redes de sensores.
