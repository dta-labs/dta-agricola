<?php
declare(strict_types=1);

class SensorSystem {
    private $baseUrl;
    private $settings = null;
    private $curlHandle;

    public function __construct(string $id) {
        $this->baseUrl = "https://dta-agricola.firebaseio.com/systems/$id/";
        $this->initCurl();
    }

    private function initCurl(): void {
        $this->curlHandle = curl_init();
        curl_setopt($this->curlHandle, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($this->curlHandle, CURLOPT_HTTPHEADER, ['Content-Type: text/plain']);
    }

    public function __destruct() {
        if ($this->curlHandle) {
            curl_close($this->curlHandle);
        }
    }

    private function executeRequest(string $url, string $method = 'GET', ?string $data = null) {
        curl_setopt($this->curlHandle, CURLOPT_URL, $url);
        curl_setopt($this->curlHandle, CURLOPT_CUSTOMREQUEST, $method);
        
        if ($data !== null) {
            curl_setopt($this->curlHandle, CURLOPT_POSTFIELDS, $data);
        }

        $response = curl_exec($this->curlHandle);
        $error = curl_errno($this->curlHandle);
        
        if ($error) {
            error_log("Error cURL: " . curl_error($this->curlHandle));
            throw new RuntimeException('Error en la petición cURL');
        }

        return $method === 'GET' ? json_decode($response) : $response;
    }

    private function getSettings(): object {
        if ($this->settings === null) {
            $this->settings = $this->executeRequest($this->baseUrl . "settings.json");
            if ($this->settings === null) {
                // Si no hay settings, devolver un objeto vacío por defecto
                $this->settings = (object)['zona' => 0, 'summerHour' => 0];
            }
        }
        return $this->settings;
    }

    private function getLocalZone(): int {
        $settings = $this->getSettings();
        $timeZone = $settings->zona ?? 0;
        $summerHour = $settings->summerHour ?? 0;
        return intval($timeZone) + intval($summerHour);
    }

    private function getDateTime(int $localZone): DateTime {
        $dateTime = new DateTime();
        $dateTime->modify("$localZone hours");
        return $dateTime;
    }

    public function formatSettingsForDevice(): string {
        $settings = $this->getSettings();
        $sendData = "\"{$settings->operationMode}";
        
        for ($i = 0; $i < $settings->sensors->sensorNumber; $i++) {
            $idx = "S$i";
            $sendData .= "\"{$settings->sensors->$idx->id}";
        }
        
        return $sendData . "\"";
    }

    private function updateLog(array $data): void {
        $settings = $this->getSettings();
        if (empty($data) || $settings->operationMode == 0) {
            return;
        }
        $date = $this->getDateTime($this->getLocalZone())->format('Ymd hia');
        $logData = [
            'date' => $date,
            'dataRaw' => json_encode($data),
            'signal' => $_GET['si'] ?? '',
            'reception' => in_array($_GET['rx'] ?? '', ['Ok', 'Er']) ? $_GET['rx'] : ''
        ];
        $this->executeRequest(
            $this->baseUrl . "logs.json",
            'POST',
            json_encode($logData)
        );
    }

    private function updateSettings(object $settings): void {
        $this->executeRequest(
            $this->baseUrl . "settings.json",
            'PUT',
            json_encode($settings)
        );
    }

    public function processData(): void {
        if (isset($_GET['data']) && $_GET['data'] !== '[]') {
            $rawData = $_GET['data'];
			$rawData = str_replace(',,', ',,,,', $rawData);
			$rawData = str_replace('[,', '[,,,', $rawData);
			$rawData = str_replace(',]', ',,,]', $rawData);
            
            $rawData = trim($rawData, '[]');   // Remover los corchetes del inicio y final
            $data = explode(',', $rawData);     //  Dividir por comas

            $settings = $this->getSettings();
            
            if ($settings->operationMode == 0) {
                $actulize = true;
                $length = count($data);
                for ($i = 0; $i < $length; $i++) {
                    $idx = "S$i";
                    if (isset($data[$i]) && strpos($data[$i], '0x') === 0) {
                        $settings->sensors->$idx->id = $data[$i];
                        $settings->sensors->$idx->latitude = $settings->sensors->$idx->latitude ?? 0.0;
                        $settings->sensors->$idx->longitude = $settings->sensors->$idx->longitude ?? 0.0;
                        $settings->sensors->$idx->type = $settings->sensors->$idx->type ?? "SHT";
                    } else {
                        $actulize = false;
                        break;
                    }
                }
                if ($actulize) {
                    $this->settings = $settings;                      // Actualizar la caché local
                    $this->updateSettings($settings);
                }
            } else {
                $this->updateLog($data);
            }
        }
    }
}

// Programa principal
try {
    $system = new SensorSystem($_GET['id']);
    
    // Procesar datos si están presentes
    $system->processData();
    
    // Enviar configuración al dispositivo
    print_r($system->formatSettingsForDevice());
} catch (Exception $e) {
    error_log("Error: " . $e->getMessage());
    http_response_code(500);
    echo "Error: " . $e->getMessage();
}