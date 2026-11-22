<?php
/*
 * updateSensorDB.php — puente a la v7 (2026-11-22).
 * Procesa las lecturas de los sistemas Sensor.
 * Esta URL se conserva para no cambiar el firmware de los equipos en campo; todo el procesamiento lo hace
 * WS/v7/updateSensorDB.php en el mismo servidor (no es una redirección HTTP: el equipo recibe la misma respuesta).
 * Para volver a la v6 corregida: copiar ws_old/updateSensorDB_261122_v6corregida.php sobre este archivo.
 */
require __DIR__ . '/v7/updateSensorDB.php';
