<?php
/*
 * alertas.php — puente a la v7 (2026-11-22).
 * Evalúa umbrales y manda las notificaciones (push.php).
 * Esta URL se conserva para no cambiar el firmware de los equipos en campo; todo el procesamiento lo hace
 * WS/v7/alertas.php en el mismo servidor (no es una redirección HTTP: el equipo recibe la misma respuesta).
 * Para volver a la v6 corregida: copiar ws_old/alertas_261122_v6corregida.php sobre este archivo.
 */
require __DIR__ . '/v7/alertas.php';
