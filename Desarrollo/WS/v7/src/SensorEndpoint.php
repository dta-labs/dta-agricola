<?php
declare(strict_types=1);

/**
 * sensor.php — punto de entrada del gateway.
 * 1. Responde de inmediato la configuración: "frecuencia"id0"id1"..."
 * 2. Lanza en segundo plano updateSensorDB / updateNeveraDB con los mismos parámetros.
 */
class SensorEndpoint {
    private const PROCESSORS = [
        'Sensor' => '/updateSensorDB.php',
        'Nevera' => '/updateNeveraDB.php',
    ];

    public static function deviceResponse(object $settings, LocalClock $clock): string {
        $frequency = (int) ($settings->operationMode ?? 0);
        if ($frequency === 10) {
            $frequency = ((int) $clock->now()->format('H')) < 7 ? 10 : 30;
        }
        $out = "\"$frequency";
        $count = SystemSettings::sensorCount($settings);
        for ($i = 0; $i < $count; $i++) {
            $out .= '"' . (SystemSettings::sensor($settings, $i)->id ?? '');
        }
        return $out . '"';
    }

    public static function processorUrl(?object $settings): ?string {
        $path = self::PROCESSORS[$settings->type ?? ''] ?? null;
        return $path === null ? null : DTA_WS_V7_URL . $path;
    }

    public static function run(Request $req, FirebaseClient $db, AsyncCaller $async): void {
        $id = $req->requireSystemId();
        $settings = SystemSettings::load($db, $id, false);
        if ($settings === null) {
            // v6 respondía "0" (= modo descubrimiento) cuando Firebase fallaba.
            http_response_code(503);
            echo 'Error: No se pudo leer la configuración del sistema';
            return;
        }

        $clock = SystemSettings::clock($settings);
        (new FileLogger($clock))->write(urldecode(http_build_query($req->all())));

        echo self::deviceResponse($settings, $clock);
        self::finishResponse();

        $url = self::processorUrl($settings);
        if ($url !== null) {
            $async->call($url, $req->all());
        }
    }

    /** Entrega la respuesta al equipo antes de seguir trabajando. */
    private static function finishResponse(): void {
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        } else {
            @ob_flush();
            flush();
        }
    }
}
