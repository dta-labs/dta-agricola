<?php
declare(strict_types=1);

class DatabaseUpdater {
    private $baseUrl;
    private $settings = null;
    private $curlHandle;
    private $date = '';
    public $signal = '';
    public $qos = '';
    public $reception = '';
    
    #region 0.- Generales
    
    public function __construct(string $id) {
        $this->signal = $_GET['si'] ?? '';
        $this->qos = $_GET['qos'] ?? '';
        $this->reception = $_GET['rx'] ?? '';
        $this->baseUrl = "https://dta-agricola.firebaseio.com/systems/$id/";
        $this->initCurl();
        $this->settings = $this->getSettings();
        $this->date = $this->getDateTime($this->getLocalZone())->format('Ymd hia');
    }

    private function getDateTime(int $localZone): DateTime {
        $dateTime = new DateTime();
        $dateTime->modify("$localZone hours");
        return $dateTime;
    }

    private function getLocalZone(): int {
        $settings = $this->settings;
        $timeZone = $settings->zona ?? 0;
        $summerHour = $settings->summerHour ?? 0;
        return intval($timeZone) + intval($summerHour);
    }

    private function initCurl(): void {
        $this->curlHandle = curl_init();
        curl_setopt($this->curlHandle, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($this->curlHandle, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    }

    public function __destruct() {
        if ($this->curlHandle) {
            curl_close($this->curlHandle);
        }
    }

    private function executeRequest(string $url, string $method = 'GET', ?string $data = null) {
        try {
            $headers = ['Content-Type: application/json'];
            
            if ($method === 'PATCH') {
                $headers[] = 'X-HTTP-Method-Override: PATCH';
                $method = 'POST';
            }
            
            curl_setopt_array($this->curlHandle, [
                CURLOPT_URL => $url,
                CURLOPT_CUSTOMREQUEST => $method,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => $headers
            ]);
            
            if ($data !== null) {
                curl_setopt($this->curlHandle, CURLOPT_POSTFIELDS, $data);
            }
        
            $response = curl_exec($this->curlHandle);
            $error = curl_errno($this->curlHandle);
            
            if ($error) {
                error_log("Error cURL: " . curl_error($this->curlHandle));
                throw new RuntimeException('Error en la petición cURL: ' . curl_error($this->curlHandle));
            }
        
            $httpCode = curl_getinfo($this->curlHandle, CURLINFO_HTTP_CODE);
            
            return $httpCode >= 200 && $httpCode < 300 ? json_decode($response) : null;
        } catch (RuntimeException $e) {
            error_log("Fallo en executeRequest: " . $e->getMessage());
            return null;
        }
    }
    #endregion 0.- Generales

    #region 1.- Procesamiento
    public function processData(): void {
        if (isset($_GET['data'])) {
            $data = $_GET['data'];
            if ($data != '[]') $this->processActualData($data);
        }
    }

    private function getSettings(): object {
        if ($this->settings === null) {
            $this->settings = $this->executeRequest($this->baseUrl . "settings.json");
            if ($this->settings === null) {
                $this->settings = (object)[
                    'zona' => 0,
                    'summerHour' => 0,
                    'operationMode' => 1,
                    'sensors' => (object)[
                        'sensorNumber' => 10,
                        'S0' => (object)['id' => '0x01'],
                        'S1' => (object)['id' => '0x02'],
                        'S2' => (object)['id' => '0x03'],
                        'S3' => (object)['id' => '0x04'],
                        'S4' => (object)['id' => '0x05'],
                        'S5' => (object)['id' => '0x06'],
                        'S6' => (object)['id' => '0x07'],
                        'S7' => (object)['id' => '0x08'],
                        'S8' => (object)['id' => '0x09'],
                        'S9' => (object)['id' => '0x10']
                    ]
                ];
            }
        }
        return $this->settings;
    }

    private function fillEmptyData_old($rawData): array {
        $rawData = str_replace('[,', '[NaN,NaN,NaN,', $rawData);
        $rawData = preg_replace_callback('/,{2,}/', function($matches) {
            $count = strlen($matches[0]) - 1;
            $nanBlock = implode(',', array_fill(0, $count * 3, 'NaN'));
            return ',' . $nanBlock . ',';
        }, $rawData);
        $rawData = str_replace(',]', ',NaN,NaN,NaN]', $rawData);
        $rawData = trim($rawData, '[]');
        $data = explode(',', $rawData);
        $numericData = array_map(function($v) {
            if ($v === 'NaN') return NAN;
            return is_numeric($v) ? (float)$v : NAN;
        }, $data);
        return $numericData;
    }
	
	private function fillEmptyData(string $rawData): array {
		$TOTAL_SENSORS = 10;
		$VALUES_PER_SENSOR = 3;
		$TOTAL_VALUES = $TOTAL_SENSORS * $VALUES_PER_SENSOR;

		$rawData = trim($rawData);
		$rawData = trim($rawData, '[]');

		if ($rawData === '') {
			return array_fill(0, $TOTAL_VALUES, NAN);
		}

		// Conserva los campos vacíos que existan entre las comas.
		$tokens = array_map(
			function ($value) {
				return trim($value);
			},
			explode(',', $rawData)
		);

		$result = [];
		$cursor = 0;
		$tokenCount = count($tokens);

		while ($cursor < $tokenCount && count($result) < $TOTAL_VALUES) {
			if ($tokens[$cursor] === '') {
				$this->appendEmptySensor($result);
				$cursor++;
				continue;
			}

			$candidate = array_slice($tokens, $cursor, $VALUES_PER_SENSOR);

			if (
				count($candidate) === $VALUES_PER_SENSOR &&
				$this->isValidSensorBlock($candidate)
			) {
				foreach ($candidate as $value) {
					$result[] = (float) $value;
				}
				$cursor += $VALUES_PER_SENSOR;
				continue;
			}

			$this->appendEmptySensor($result);

			$consumed = 0;
			while (
				$consumed < $VALUES_PER_SENSOR &&
				($cursor + $consumed) < $tokenCount &&
				$tokens[$cursor + $consumed] !== ''
			) {
				$consumed++;
			}

			$cursor += max(1, $consumed);
		}

		if (count($result) < $TOTAL_VALUES) {
			$result = array_pad($result, $TOTAL_VALUES, NAN);
		}

		return array_slice($result, 0, $TOTAL_VALUES);
	}

	private function appendEmptySensor(array &$result): void {
		array_push($result, NAN, NAN, NAN);
	}

	private function isValidSensorBlock(array $values): bool {
		return
			$this->isIntegerInRange($values[0], -1, 100) &&
			$this->isDecimalInRange($values[1], 1, -50.0, 125.0) &&
			$this->isDecimalInRange($values[2], 1, 2.0, 6.0);
	}

	private function isIntegerInRange(
		string $value,
		int $minimum,
		int $maximum
	): bool {
		if (preg_match('/^-?\d+$/D', $value) !== 1) {
			return false;
		}

		$number = filter_var($value, FILTER_VALIDATE_INT);

		return $number !== false &&
			$number >= $minimum &&
			$number <= $maximum;
	}

	private function isDecimalInRange(
		string $value,
		int $decimalPlaces,
		float $minimum,
		float $maximum
	): bool {
		$pattern = '/^-?\d+\.\d{' . $decimalPlaces . '}$/D';

		if (preg_match($pattern, $value) !== 1) {
			return false;
		}

		$number = (float) $value;

		return is_finite($number) &&
			$number >= $minimum &&
			$number <= $maximum;
	}

    private function processActualData($data) {
        $settings = $this->settings;
        if (isset($settings->operationMode) && (string)$settings->operationMode === "0") {
            $this->sensorsDiscovery($data);
        } else {
            $data = $this->fillEmptyData($data);
            $data = $this->filterData($data);
            $this->updateLog($data);
        }
    }

    private function filterData(array $data) {
        $data = array_map(function($value) {
            if (is_nan($value) || $value === -127.0) return NAN;
            return round($value, 1);
        }, $data);
        return $data;
    }
    #endregion 1.- Procesamiento

    #region 2.- Sensors Discovery
    private function sensorsDiscovery($data) {
        $settings = $this->settings;
        if (is_string($data)) $data = explode(',', trim($data, '[]'));
        $validCount = 0;
        $newSensors = new stdClass();
        for ($i = 0; $i < count($data); $i++) {
            $idx = "S$i";
            if (isset($data[$i]) && strpos($data[$i], '0x') === 0) {
                $newSensors->$idx = (object)[
                    'id' => $data[$i],
                    'alias' => $data[$i]
                ];
                $validCount++;
            }
        }
        $settings->sensors = $newSensors;
        $settings->sensors->sensorNumber = $validCount;
        $this->settings = $settings;
        $this->updateSettings($settings);
    }

    private function updateSettings(object $settings): void {
        $this->executeRequest(
            $this->baseUrl . "settings.json",
            'PUT',
            json_encode($settings)
        );
    }
    #endregion 2.- Sensors Discovery

    #region 3.- Update Log
    private function updateLog(array $data): void {
        $logData = $this->crearLogData($data);
        // print_r($logData);
        $logsFile = $this->baseUrl . "logs.json";
        $this->executeRequest($logsFile, 'POST', json_encode($logData));
    }

    private function crearLogData(array $data): array {
        $data = array_map(function($value) {
            if (is_nan($value) || $value === -127.0) return null;
            return round($value, 1);
        }, $data);
        return [
            'date' => $this->date,
            'dataRaw' => json_encode($data),
            'signal' => $this->signal,
            'qos' => $this->qos,
            'reception' => $this->reception
        ];
    }
    #endregion 3.- Update Log
    
}

// Programa principal
try {
    if (!isset($_GET['id']) || empty($_GET['id'])) {
        http_response_code(400);
        echo "Error: Falta el parámetro 'id' del sistema";
        exit;
    }

    $updater = new DatabaseUpdater($_GET['id']);
    // print_r($updater->signal . " " . $updater->qos . " " . $updater->reception);
    $updater->processData();
    
} catch (Exception $e) {
    error_log("Error en updateDB.php: " . $e->getMessage());
    http_response_code(500);
    echo "Error: " . $e->getMessage();
}

?>
