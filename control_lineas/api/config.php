<?php
declare(strict_types=1);

/*
 * Configuración de MySQL.
 * En producción es preferible definir estas variables en el servidor.
 * Si no están disponibles, sustituye los valores de respaldo.
 */
return [
    'host' => getenv('DB_HOST') ?: 'localhost',
    'port' => getenv('DB_PORT') ?: '3306',
    'database' => getenv('DB_NAME') ?: 'dtaameri_control_lineas',
    'username' => getenv('DB_USER') ?: 'dtaameri_dtaameri',
    'password' => getenv('DB_PASSWORD') ?: 'dta_control_lineas',
];
