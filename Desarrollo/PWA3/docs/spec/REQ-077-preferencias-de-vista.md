# REQ-077 - Preferencias de vista persistentes en la base de datos

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-08) - probar: usuario |
| Alcance | `services/repositorio.js` (`guardarPreferencia`), `core.js` (carga y guardado), `components/sistema/panel-sensores/`, `index.html` |
| Pruebas | 384/384 en Node (3 nuevas en `preferencias.test.js`) |
| Compilacion | `26.11.08.001` |

Pedido: guardar en la BD (1) la vista de la red de sensores, mapa o mosaico, y (2) por sensor, si la ficha muestra
humedad del suelo o temperatura (REQ-076).

## Donde

`users/{email con puntos -> guiones}/preferences`, junto a `profile` (el usuario ya puede escribir ahi):

```
preferences: {
  vistaSensores: "mapa" | "mosaico",
  sensores: { <clave de la red>: { S0: "temperatura", ... } }     // sin entrada = humedad del suelo
}
```

**Por usuario y no en el sistema**: son preferencias de vista; en la red cambiarian la pantalla de todos los que la
comparten. Mapa/mosaico es una sola eleccion del usuario (no por red). El sensor se identifica por su clave en la red
(`S0`, `S1`...): su `id` puede tener caracteres no validos como clave de Firebase.

## Como

- Se leen al entrar, con el resto del nodo del usuario (`getUserData` -> `aplicarPreferencias`); sin preferencias:
  mapa y humedad del suelo, como antes.
- Cada cambio se guarda al momento con `update()` sobre `preferences` (no reemplaza las demas); volver a la humedad
  borra la entrada (`null`). Si falla el guardado, la vista cambia igual y queda un aviso en consola.
- El componente recibe `intercambios` (las del sistema actual) y avisa con `al-intercambiar($clave, $temperatura)`.
