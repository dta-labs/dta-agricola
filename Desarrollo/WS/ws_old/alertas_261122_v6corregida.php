<?php
declare(strict_types=1);

/*
 * alertas.php (correcciones 2026-11-21 mientras se publica WS/v7)
 *  - Usa el mismo parser validado que updateSensorDB.php. El anterior aceptaba bloques incompletos o inválidos
 *    y desalineaba los sensores siguientes (alertas con el valor de otro sensor).
 *  - Siempre 4 valores por sensor (ms, HR, T, Vcc), como los envía el gateway y los guarda updateSensorDB.
 *    Antes STH/FlP se leían de 3 en 3 y los demás tipos de 1 en 1.
 *  - id validado; tiempos máximos en cURL.
 */
class AlertProcessor {
    private $baseUrl;
    private $settings = null;
    private $users = null;
    private $curlHandle;

    public function __construct(string $id) {
        $this->baseUrl = "https://dta-agricola.firebaseio.com/systems/$id/";
        $this->initCurl();
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
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_TIMEOUT => 15
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

    private function getUsers(): array {
        if ($this->users === null) {
            $this->users = $this->executeRequest($this->baseUrl . "users.json");
            if ($this->users === null) {
                $this->users = [];
            }
        }
        if (is_object($this->users)) {
            $usersData = get_object_vars($this->users); 
        } elseif (is_array($this->users)) {
            $usersData = $this->users; 
        } else {
            $usersData = [];
        }
        $usersID = array_keys($usersData); 
        return $usersID;
    }

    public function processAlerts(): void {
        if (!isset($_GET['data'])) {
            return;
        }

        $data = is_string($_GET['data']) ? $this->fillEmptyData($_GET['data']) : array_fill(0, 40, NAN);

        $this->verifyAlerts($data);
    }

    /** Mismo parser validado que updateSensorDB.php (4 valores por sensor: ms, HR, T, Vcc). */
	private function fillEmptyData(string $rawData): array
	{
		$totalSensors = 10;
		$valuesPerSensor = 4;
		$totalValues = $totalSensors * $valuesPerSensor;

		$rawData = trim($rawData);
		$rawData = trim($rawData, '[]');

		if ($rawData === '') {
			return array_fill(0, $totalValues, NAN);
		}

		// explode conserva los campos vacíos entre comas.
		$tokens = array_map(
			static fn(string $value): string => trim($value),
			explode(',', $rawData)
		);

		$result = [];
		$cursor = 0;
		$tokenCount = count($tokens);

		while ($cursor < $tokenCount && count($result) < $totalValues) {
			/*
			 * Un campo vacío representa un sensor que no respondió.
			 */
			if ($tokens[$cursor] === '') {
				$this->appendEmptySensor($result);
				$cursor++;
				continue;
			}

			$candidate = array_slice(
				$tokens,
				$cursor,
				$valuesPerSensor
			);

			if (
				count($candidate) === $valuesPerSensor &&
				$this->isValidSensorBlock($candidate)
			) {
				foreach ($candidate as $value) {
					$result[] = (float) $value;
				}

				$cursor += $valuesPerSensor;
				continue;
			}

			/*
			 * El bloque comenzó con datos, pero está incompleto
			 * o alguno de sus valores es inválido.
			 */
			$this->appendEmptySensor($result);

			/*
			 * Consumir los valores presentes antes del primer hueco.
			 */
			$consumed = 0;

			while (
				$consumed < $valuesPerSensor &&
				($cursor + $consumed) < $tokenCount &&
				$tokens[$cursor + $consumed] !== ''
			) {
				$consumed++;
			}

			$cursor += max(1, $consumed);
		}

		if (count($result) < $totalValues) {
			$result = array_pad($result, $totalValues, NAN);
		}

		return array_slice($result, 0, $totalValues);
	}

	private function appendEmptySensor(array &$result): void
	{
		array_push($result, NAN, NAN, NAN, NAN);
	}

	private function isValidSensorBlock(array $values): bool
	{
		return
			// 1. Decimal con dos posiciones: 0.00–240.00
			$this->isDecimalInRange(
				$values[0],
				2,
				0.00,
				240.00
			) &&

			// 2. Entero: -1–100
			$this->isIntegerInRange(
				$values[1],
				-1,
				100
			) &&

			// 3. Decimal con una posición: -50.0–125.0, o exactamente -1
			(
				$values[2] === '-1' ||
				$this->isDecimalInRange(
					$values[2],
					1,
					-50.0,
					125.0
				)
			) &&

			// 4. Decimal con una posición: 2.0–6.0
			$this->isDecimalInRange(
				$values[3],
				1,
				2.0,
				6.0
			);
	}

	private function isDecimalInRange(
		string $value,
		int $decimalPlaces,
		float $minimum,
		float $maximum
	): bool {
		// El punto decimal debe estar escapado.
		$pattern = '/^-?\d+\.\d{' . $decimalPlaces . '}$/D';

		if (preg_match($pattern, $value) !== 1) {
			return false;
		}

		$number = (float) $value;

		return is_finite($number) &&
			$number >= $minimum &&
			$number <= $maximum;
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

    private function verifyAlerts($data): void {
        $settings = $this->getSettings();
        $length = $settings->sensors->sensorNumber ?? 0;
        if ($length == 0) return;
        $usersList = $this->getUsers(); 

        $alertMessages = [];
        
        for ($i = 0; $i < (int)$length; $i++) {
            $idx = "S$i";
            $sensor = $settings->sensors->$idx ?? null;
            if (!is_object($sensor)) continue;
            $sensorLength = 4;
            $sensorID = $sensor->alias ?? ($sensor->id ?? '');
            
            if ($sensorID !== '0x0') {
                $notificationId = ($settings->name ?? $settings->key) . " - " . $sensorID;
                
                // Verificar humedad
                $value = $data[$i * $sensorLength] ?? NAN;
                if(is_numeric($value) && !is_nan($value) && isset($sensor->h) && isset($sensor->h->notify) && $sensor->h->notify) {
                    $msg = (isset($sensor->h->minValue) && $value <= $sensor->h->minValue ? "baja " : (isset($sensor->h->maxValue) && $value > $sensor->h->maxValue ? "alta " : "")); 
                    if ($msg != "") {
                        $alertMessage = "Alerta {$msg} humedad: {$value}% en {$notificationId}";
                        $alertMessages[] = $alertMessage;
                        // $this->escribirLog($alertMessage);
                    }
                }
                
                // Verificar temperatura
                $value = $data[$i * $sensorLength + 2] ?? NAN;
                if(is_numeric($value) && !is_nan($value) && -127 < $value && isset($sensor->t) && isset($sensor->t->notify) && $sensor->t->notify) {
                    $msg = (isset($sensor->t->minValue) && $value <= $sensor->t->minValue ? "baja " : (isset($sensor->t->maxValue) && $value > $sensor->t->maxValue ? "alta " : "")); 
                    if ($msg != "") {
                        $alertMessage = "Alerta {$msg} temperatura: {$value}°C en {$notificationId}";
                        $alertMessages[] = $alertMessage;
                        // $this->escribirLog($alertMessage);
                    }
                }
            }
        }
        
        // Si hay alertas, llamar a push.php
        if (!empty($alertMessages)) {
            $this->sendPushNotifications($usersList, $alertMessages);
        }
    }

    private function sendPushNotifications(array $usersList, array $messages): void {
        foreach ($messages as $message) {
            foreach ($usersList as $user) {
                $this->callPushService($user, $message);
            }
        }
    }

    private function callPushService(string $user, string $message): void {
        $pushUrl = "https://dtaamerica.com/ws/push.php?user=" . urlencode($user) . "&txt=" . urlencode($message);
        $cmd = "curl -s \"$pushUrl\" > /dev/null 2>&1 &";
        pclose(popen($cmd, 'r'));
    }

    public function escribirLog($mensaje) {
        $archivo = __DIR__ . '/alertas_log.txt';
        $fechaHora = date('Y-m-d H:i:s');
        $entrada = "[{$fechaHora}] {$mensaje}\n";
        
        if (!is_writable(dirname($archivo))) {
            error_log("Error: El directorio no tiene permisos de escritura: " . dirname($archivo));
            return false;
        }
        
        $manejador = @fopen($archivo, 'a');
        if ($manejador === false) {
            $error = error_get_last();
            error_log("Error al abrir el archivo de log: " . ($error['message'] ?? 'Error desconocido'));
            return false;
        }
        
        if (fwrite($manejador, $entrada) === false) {
            error_log("Error al escribir en el archivo de log");
            fclose($manejador);
            return false;
        }
        
        fclose($manejador);
        return true;
    }
}

// Programa principal
try {
    if (!isset($_GET['id']) || !is_string($_GET['id']) || $_GET['id'] === '' || preg_match('/[\/.#$\[\]?&%\s\\]/', $_GET['id'])) {
        http_response_code(400);
        echo "Error: Falta el parámetro 'id' del sistema";
        exit;
    }

    $alertProcessor = new AlertProcessor($_GET['id']);
    $alertProcessor->processAlerts();
    
} catch (Throwable $e) {
    error_log("Error en alertas.php: " . $e->getMessage());
    http_response_code(500);
    echo "Error: " . $e->getMessage();
}

?>
