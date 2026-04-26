<?php
declare(strict_types=1);

class SensorSystem {
    private $baseUrl;
    private $settings = null;

    public function __construct(string $id) {
        $this->baseUrl = "https://dta-agricola.firebaseio.com/systems/$id/";
    }

    private function executeRequest(string $url): ?object {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_CONNECTTIMEOUT => 2,   // conexión rápida
            CURLOPT_TIMEOUT => 3           // límite corto
        ]);
        $response = curl_exec($ch);
        $error    = curl_errno($ch);
        curl_close($ch);

        if ($error) {
            error_log("Error cURL: " . curl_error($ch));
            return null;
        }
        return $response ? json_decode($response) : null;
    }

    private function getSettings(): object {
        if ($this->settings === null) {
            // Intentar cache local primero
            $cacheFile = __DIR__ . '/settings_cache.json';
            if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < 300)) {
                $this->settings = json_decode(file_get_contents($cacheFile));
            } else {
                $this->settings = $this->executeRequest($this->baseUrl . "settings.json");
                if ($this->settings) {
                    file_put_contents($cacheFile, json_encode($this->settings));
                }
            }
            // Defaults mínimos
            if (!$this->settings) {
                $this->settings = (object)[ 'operationMode' => 1, 'sensors' => (object)['sensorNumber' => 10] ];
            }
        }
        return $this->settings;
    }

    public function formatSettingsForDevice(): string {
        $settings  = $this->getSettings();
        $frequency = (int)($settings->operationMode ?? 1);
        $sendData  = "\"{$frequency}";
        for ($i = 0; $i < ($settings->sensors->sensorNumber ?? 0); $i++) {
            $idx = "S$i";
            if (isset($settings->sensors->$idx->id)) {
                $sendData .= "\"{$settings->sensors->$idx->id}";
            }
        }
        return $sendData . "\"";
    }

    public function lanzarProcesamientoSegundoPlano(): void {
        if (!isset($_GET['id'])) return;
        $queryString = http_build_query($_GET);
        $cmd = "php " . __DIR__ . "/updateDB.php \"$queryString\" > /dev/null 2>&1 &";
        exec($cmd); // verdadero segundo plano
        error_log("updateDB lanzado en background");
    }
}

#region Programa principal
try {
    if (empty($_GET['id'])) {
        http_response_code(400);
        echo "Error: Falta el parámetro 'id'";
        exit;
    }

    $system = new SensorSystem($_GET['id']);

    // 1. Respuesta inmediata al dispositivo
    $configData = $system->formatSettingsForDevice();
    echo $configData;
    flush();

    // 2. Procesamiento en segundo plano
    $system->lanzarProcesamientoSegundoPlano();

} catch (Exception $e) {
    error_log("Error: " . $e->getMessage());
    http_response_code(500);
    echo "Error: " . $e->getMessage();
}
#endregion
