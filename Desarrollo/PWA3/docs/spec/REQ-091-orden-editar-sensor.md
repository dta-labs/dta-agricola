# REQ-091 - Editar sensor: nuevo orden de la ventana

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-09) - probar: usuario |
| Alcance | `index.html` (`#modalEditSensor`), `ventana.css` |
| Pruebas | 403/403 en Node (1 nueva) |
| Compilacion | `26.11.09.001` |

Orden pedido por el usuario (antes: imagen, nombre, **geolocalizacion**, tipo, cultivo, alertas con las amenazas
biologicas primero):

1. Imagen del sensor **centrada**.
2. Nombre e identificador.
3. Tipo de sensor (ahora a todo el ancho).
4. Cultivo que mide el sensor.
5. Alertas: Humedad, Temperatura (y Presion / Flujo, que solo salen en esos sensores, a continuacion por ser tambien
   umbrales) y al final **Amenazas biologicas**, con su subtitulo.
6. Geolocalizacion (ubicacion y parcela del sensor).

Solo se movieron bloques completos, sin cambiar su contenido ni su comportamiento.
