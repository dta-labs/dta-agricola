# Pruebas en la placa

> **Nota (D-017):** el firmware v1.1 del nodo y del gateway ya no usa el watchdog. Estas pruebas se conservan
> para evaluar placas con otro bootloader (por ejemplo, Optiboot).

Pruebas que no se pueden hacer en la PC porque dependen del hardware real. Cada una es un
sketch independiente: se carga en la placa, se observa el monitor serie y se registra el
resultado en `spec/decisiones.md`.

## Watchdog — prueba mínima (`watchdog_simple/`)

Sketch pequeño, sin librerías, para comprobar que el watchdog reinicia la placa y que el
bootloader lo soporta. Sirve igual para el nodo y para el gateway (ambos son Pro Mini / ATmega328P).

1. Abrir `watchdog_simple/watchdog_simple.ino`, elegir la misma placa y procesador que el firmware y cargarlo.
2. Abrir el monitor serie a **9600 baudios** y desconectar/conectar la alimentación.
3. Esperar ~25 s.

| Lo que muestra el monitor | Resultado |
|---|---|
| `Causa del reinicio: WATCHDOG` tres veces y `PRUEBA COMPLETA` | ✔ El watchdog funciona |
| `✘ FALLA: no hubo reinicio en 10 s` | ✘ El watchdog no reinicia la placa |
| Después de `Se deja de alimentar` no aparece nada más y el LED parpadea rápido | ✘ El bootloader no soporta el watchdog (reinicio en bucle). Desconectar la alimentación para recuperar la placa |
| Se reinicia cada ~7 s mostrando `Causa del reinicio: desconocida` | ✔ El watchdog funciona, pero el bootloader no informa la causa |

Si falla por el bootloader: quemar Optiboot (con MiniCore para el Pro Mini de 8 MHz) o desactivar el
watchdog en el firmware hasta cambiarlo. Registrar el resultado (placa, fecha) en `spec/decisiones.md`.

## Watchdog — prueba completa con LowPower (`watchdog_test/`)

**Qué valida**

1. Que el bootloader de la placa soporte un reinicio por watchdog. Los Arduino Pro Mini traen
   un bootloader antiguo (ATmegaBOOT) que **no apaga el watchdog** al arrancar: después de un
   reinicio por watchdog, la placa queda reiniciándose sin parar (cada ~16 ms) y solo se
   recupera desconectando la alimentación. Optiboot (el del Arduino Uno) sí lo maneja.
2. Que reactivar el watchdog después de `LowPower` (como hace `armWatchdog()`) lo deja funcionando.
3. Que `LowPower` apaga el watchdog al despertar (la razón de reactivarlo).

**Procedimiento**

1. Abrir `watchdog_test/watchdog_test.ino` en el Arduino IDE, con la misma placa y el mismo
   procesador que se usan para el nodo o el gateway (Arduino Pro Mini, ATmega328P).
2. Cargarlo y abrir el monitor serie a **9600 baudios**.
3. Desconectar y volver a conectar la alimentación para empezar desde la etapa 1.
4. Esperar unos 35 s. La prueba avanza sola por las 3 etapas.

**Resultado esperado**

```
=== Prueba de watchdog ===
Causa del reinicio (0x1): encendido
Etapa 1: watchdog de 2 s. Debe reiniciarse en ~2 s.
=== Prueba de watchdog ===
Causa del reinicio (0x8): WATCHDOG
   ✔ Etapa 1 OK: reinicio por watchdog.
Etapa 2: ...
   ✔ Etapa 2 OK ...
Etapa 3: ...
   ✔ Etapa 3 OK ...
=== PRUEBA COMPLETA: watchdog OK ===
```

Al final, el LED 13 parpadea lento (OK) o rápido (falla).

**Si se queda en la etapa 1** (nada en el monitor y el LED parpadeando rápido sin parar):
el bootloader no soporta el watchdog. Desconectar la alimentación para recuperar la placa.
Opciones:

- **Recomendada:** quemar Optiboot con un programador ISP (otro Arduino como ISP). Para el
  Pro Mini de 8 MHz / 3.3 V se puede usar el núcleo MiniCore (ATmega328P, 8 MHz externo).
- Mientras tanto: desactivar el watchdog en el firmware hasta cambiar el bootloader.

> La causa del reinicio puede mostrarse como "desconocida" con algunos bootloaders; lo que
> importa es que la placa se reinicie y avance de etapa.

**Registrar el resultado** (placa, bootloader, fecha, etapas OK) en `spec/decisiones.md`.
