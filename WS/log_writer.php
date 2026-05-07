<?php
declare(strict_types=1);

$mensaje = $_GET['mensaje'] ?? '';
$timezoneOffset = intval($_GET['localZone'] ?? 0);

try {
    // Apply timezone offset
    $dateTime = new DateTime();
    if ($timezoneOffset !== 0) {
        $dateTime->modify("$timezoneOffset hours");
    }
    
    $fechaHora = $dateTime->format('Y-m-d H:i:s');
    $fecha = substr($fechaHora, 0, 10);
    $archivo = __DIR__ . '/' . $fecha . '_log.txt';
    $hora = substr($fechaHora, 11, 8);
    $entrada = "[{$hora}] {$mensaje}\n";
    
    if (!is_writable(dirname($archivo))) {
        error_log("Error: El directorio no tiene permisos de escritura: " . dirname($archivo));
        exit(1);
    }
    
    $manejador = @fopen($archivo, 'a');
    if ($manejador === false) {
        $error = error_get_last();
        error_log("Error al abrir el archivo de log: " . ($error['message'] ?? 'Error desconocido'));
        exit(1);
    }
    
    if (fwrite($manejador, $entrada) === false) {
        error_log("Error al escribir en el archivo de log");
        fclose($manejador);
        exit(1);
    }
    
    fclose($manejador);
    exit(0);
    
} catch (Exception $e) {
    error_log("Error en log_writer.php: " . $e->getMessage());
    exit(1);
}

?>
