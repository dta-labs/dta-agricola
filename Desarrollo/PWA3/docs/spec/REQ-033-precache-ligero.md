# REQ-033 - El precache bajaba 2,4 MB antes de arrancar

| Campo | Valor |
|---|---|
| Estado | **Implementado** |
| Alcance | `firebase-messaging-sw.js`, `index.html` (`loading="lazy"`) |
| Pruebas | 140/140 en Node (4 nuevas) |
| Riesgo | Bajo: son recursos decorativos |

## 1. Medicion

| Dato | Valor |
|---|---|
| `assets/images` | **24,93 MB** en 203 ficheros |
| precache del service worker (`install`) | **2.474 KB** en 12 ficheros |
| imagenes mas pesadas | `Ag07.png` 1.922 KB, `help/controles_estacionario.png` 1.425 KB, `Mosca de la cebblanca.webp` 1.279 KB, `intro.webp` 1.076 KB |

Las ~100 peticiones del arranque son la carga normal (117 imagenes + scripts + Firebase). El
problema no era el numero: era **cuando** y **cuanto** se descargaba.

## 2. Lo que se descargaba en `install`

`urlsToCache` incluia, ademas de los CSS y los iconos:

| Fichero | Peso |
|---|---|
| `intro.webp` | 1.076 KB |
| `fondo-web.png` | 694 KB |
| `fondo-cel.png` | 446 KB |
| `DTA-Agricola.png` | 134 KB |

Eso se descargaba **entero en el primer arranque**, antes de mostrar nada, y ninguna de esas
imagenes hace falta para arrancar.

## 3. Cambios

1. **Precache de 12 a 8 entradas**: solo los dos CSS y los iconos de aplicacion.
   **2.474 KB -> 124 KB (-95 %)**. Las imagenes decorativas se cachean cuando se usan, porque la
   estrategia del service worker ya es network-first con `cache.put`.
2. **`loading="lazy"`** en 109 de las 117 imagenes (todas menos los logos de cabecera).
3. `CACHE_NAME` a `v1.15` para invalidar la cache anterior.

## 4. Pruebas

`test/unit/precache-ligero.test.js` lee el service worker y comprueba que:

1. todas las rutas precacheadas existen;
2. ningun fichero del precache supera **200 KB**;
3. el precache completo queda por debajo de **300 KB**;
4. las imagenes decorativas grandes no vuelven al precache.

Si alguien vuelve a meter `intro.webp` o los fondos, el test falla.

## 5. Como se comprueba

1. Recargar **dos veces** (la primera registra el SW nuevo, la segunda ya sirve con v1.15).
2. `Application -> Cache Storage`: debe existir `DTA_Irrigation_Control_v1.15` y la v1.14 debe
   haber desaparecido.
3. Pestaña Red, recarga forzada: ya no se descargan `intro.webp`, `fondo-web.png` ni
   `fondo-cel.png` al arrancar.

## 6. Pendiente

Quedan **24,93 MB de imagenes** en el repositorio, con archivos de casi 2 MB. La mejora grande es
comprimirlas (redimensionar a la resolucion real de uso y convertir a WebP), pero eso necesita una
herramienta de imagen y una revision visual de cada una.
