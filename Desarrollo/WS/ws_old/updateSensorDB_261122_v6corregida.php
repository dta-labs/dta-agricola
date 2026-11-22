<?php
declare(strict_types=1);

/*
 * updateSensorDB.php (v6, correcciones 2026-11-21 mientras se publica WS/v7)
 *  - HR = -1 (el sensor no mide HR): se trata como faltante: promedio del mismo tipo en la red → estación
 *    asignada → OpenWeatherMap → Open-Meteo.
 *    Clave de OpenWeatherMap: variable OPENWEATHER_API_KEY o archivo openweather.key en la carpeta de la cuenta
 *    (fuera de public_html). Sin coordenadas válidas en el sensor se usan las del sistema.
 *  - Estaciones locales: settings.station { region, id } (PWA3) o tabla; re=<región>; fecha aaaa-mm-dd;
 *    se descartan los renglones de resumen de estaciones.php ("Promedio / Totales", tprom "0.00").
 *  - ETc: cada registro guarda la tasa en mm/h (2 decimales); el resumen diario es promedio × 24 = mm/día
 *    (antes se sumaban tasas horarias de cada registro de 10–30 min: 2 a 6 veces de más).
 *  - Unidades frío: modelo Utah (Richardson); el resumen diario es promedio × 24 (antes cada registro contaba
 *    como una hora completa).
 *  - Tmax del resumen: con temperaturas bajo cero quedaba "NaN" (PHP_FLOAT_MIN).
 *  - Valores faltantes: promedio solo de sensores del MISMO TIPO (el tipo dicta la magnitud: SHT/SHT4 %, WM cb;
 *    PSI es presión de agua). Antes se promediaban todos los sensores, mezclando % con cb.
 *  - Se completan SHT, SHT4, WM, Ms, NPK y NPKML, todos igual: promedio del mismo tipo → estación → meteorología.
 *    La humedad de suelo de Open-Meteo (%) nunca va a un WM (mide cb).
 *  - Vcc faltante: 4 V (antes 5.5 o el promedio de los demás sensores).
 *  - Humedad de suelo de respaldo sin dato: antes se guardaba un valor falso ≈ 0; ahora NaN.
 *  - Modo descubrimiento: terminaba en error fatal (recibía números); ahora usa los Id recibidos.
 *  - dayLogs se lee una sola vez por petición (antes hasta 4); el id se valida.
 */
class DatabaseUpdater {
    private const HR_NOT_MEASURED = -1.0;
    /** Tipos cuyos valores faltantes se completan (con el promedio de su MISMO tipo). */
    private const FILLABLE_TYPES = ["SHT", "SHT4", "WM", "Ms", "NPK", "NPKML"];
    /** Vcc que se asigna cuando falta (antes 5.5 o el promedio de los demás). */
    private const VCC_FILL = 4.0;
    private const STATION_MAX_AGE_DAYS = 1;
    /** Región de las estaciones de la tabla, por si /stations no responde. */
    private const STATION_REGIONS = [
        '_bac' => 'BACHINIVA', '_ojo' => 'BACHINIVA', '_lva' => 'BACHINIVA', '_bvt' => 'CARICHI',
        '_101' => 'CUAUHTEMOC', '_rub' => 'CUAUHTEMOC', '_hbu' => 'CUAUHTEMOC', '_lno' => 'CUAUHTEMOC',
        '_qtl' => 'CUAUHTEMOC', '_yam' => 'CUAUHTEMOC', '_zdr' => 'CUAUHTEMOC',
        '_bas' => 'GUERRERO', '_ros' => 'GUERRERO', '_gue' => 'GUERRERO', '_lju' => 'GUERRERO', '_mrc' => 'GUERRERO',
        '_por' => 'GUERRERO', '_rsa' => 'GUERRERO', '_her' => 'GUERRERO',
        '_cho' => 'CUSIHUIRIACHI', '_lac' => 'CUSIHUIRIACHI', '_lmo' => 'CUSIHUIRIACHI',
        '_oso' => 'NAMIQUIPA', '_fac' => 'NAMIQUIPA', '_lbr' => 'NAMIQUIPA', '_lcr' => 'NAMIQUIPA',
        '_nal' => 'NAMIQUIPA', '_lal' => 'NAMIQUIPA', '_osm' => 'NAMIQUIPA',
    ];

    private $baseUrl;
    private $settings = null;
    private $users = null;
    private $curlHandle;
    private $agroCache = [];
    private $weatherCache = [];
    private $isRealData = true;
    private $dayLogsCache = false;
    private $stationCache = [];
    private $stationRegions = null;
    private $openWeatherCache = [];
    private $date = '';
    public $signal = '';
    public $qos = '';
    public $reception = '';
    
    
    public function __construct(string $id) {
        $this->signal = $_GET['si'] ?? '';
        $this->qos = $_GET['qos'] ?? '';
        $this->reception = $_GET['rx'] ?? '';
        $this->baseUrl = "https://dta-agricola.firebaseio.com/systems/$id/";
        $this->initCurl();
        $this->settings = $this->getSettings();
        $this->date = $this->getDateTime($this->getLocalZone())->format('Ymd hia');
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

    public function processData(): void {
        $data = null;
        if (isset($_GET['data']) && is_string($_GET['data']) && isset($this->settings->operationMode) && (string)$this->settings->operationMode === "0") {
            $this->sensorsDiscovery($this->discoveryTokens($_GET['data']));
            return;
        }
        if (isset($_GET['data']) && is_string($_GET['data'])) {
            if ($_GET['data'] == '[]') {
                $lastLogDate = $this->getLastLogDate();
                if ($lastLogDate === null || !$this->isWithinRange($lastLogDate, 9)) {
                    $data = array_fill(0, 40, NAN);
                    $this->isRealData = false;
                }
            } else {
                $data = $this->fillEmptyData($_GET['data']);
                $this->isRealData = true;
            }
        }
        if ($data) $this->processActualData($data);
    }

    /** dayLogs leído una sola vez por petición. */
    private function getDayLogs() {
        if ($this->dayLogsCache === false) {
            $this->dayLogsCache = $this->executeRequest($this->baseUrl . "dayLogs.json");
        }
        return $this->dayLogsCache;
    }

    private function getLastLogDate() {
        $allLogs = $this->getDayLogs();
        if ($allLogs === null) return null;
        $logsArray = is_object($allLogs) ? get_object_vars($allLogs) : $allLogs;
        if (empty($logsArray)) return null;
        $lastLogKey = array_key_last($logsArray);
        $lastLog = $logsArray[$lastLogKey];
        return is_object($lastLog) && isset($lastLog->date) ? (string)$lastLog->date : null;
    }

    private function isWithinRange($lastLogDate, $rangeMinutes): bool {
        try {
            $lastDateTime = DateTime::createFromFormat("Ymd hia", $lastLogDate); // Formato correcto: YYYYMMDD HHMMam/pm
            if (!$lastDateTime) return false;
            $currentDateTime = $this->getDateTime($this->getLocalZone());
            $diffSeconds = abs($currentDateTime->getTimestamp() - $lastDateTime->getTimestamp());
            $diffMinutes = $diffSeconds / 60;
            return $diffMinutes <= (int) $rangeMinutes;
        } catch (Exception $e) {
            error_log("Error en isWithinRange: " . $e->getMessage());
            return false;
        }
    }

    private function processActualData($data) {
        $data = $this->replaceUnmeasuredHumidity($data);
        $data = $this->updateActualData($data);
        $this->updateLog($data);
        $this->callAlerts($data);
    }

    /**
     * HR = -1 (el sensor no mide HR): se trata como valor faltante y sigue el orden normal de respaldo:
     * promedio de los sensores del mismo tipo en la red → estación asignada → OpenWeatherMap → Open-Meteo.
     */
    private function replaceUnmeasuredHumidity(array $data): array {
        $limit = (int)($this->settings->sensors->sensorNumber ?? 0);
        for ($i = 0; $i < $limit; $i++) {
            $k = $i * 4 + 1;
            if (isset($data[$k]) && !is_nan($data[$k]) && (float)$data[$k] === self::HR_NOT_MEASURED) {
                $data[$k] = NAN;
            }
        }
        return $data;
    }

    /**
     * Coordenadas del sensor si son válidas; si no (faltan o 0,0 del modo descubrimiento), las del sistema.
     * @return array{0: ?float, 1: ?float}
     */
    private function getCoordinates(int $sensor): array {
        $valid = fn($lat, $lon) => is_numeric($lat) && is_numeric($lon) && abs((float)$lat) <= 90 && abs((float)$lon) <= 180
            && !((float)$lat == 0.0 && (float)$lon == 0.0);
        $cfg = $this->settings->sensors->{"S$sensor"} ?? null;
        if ($cfg && $valid($cfg->latitude ?? null, $cfg->longitude ?? null)) return [(float)$cfg->latitude, (float)$cfg->longitude];
        $s = $this->settings;
        if ($valid($s->latitude ?? null, $s->longitude ?? null)) return [(float)$s->latitude, (float)$s->longitude];
        return [null, null];
    }

    /** Clave de OpenWeatherMap: variable de entorno o archivo openweather.key fuera de public_html. */
    private function getOpenWeatherKey(): ?string {
        $key = getenv('OPENWEATHER_API_KEY');
        if (!is_string($key) || trim($key) === '') {
            $file = dirname(__DIR__, 2) . '/openweather.key';      // public_html/ws/ → carpeta de la cuenta
            $key = is_readable($file) ? (string)file_get_contents($file) : '';
        }
        $key = trim((string)$key);
        return $key === '' ? null : $key;
    }

    /** HR (%) y T (°C) actuales de OpenWeatherMap, o null. Una consulta por ubicación y petición. */
    private function getOpenWeather($lat, $lon): ?array {
        if (!is_numeric($lat) || !is_numeric($lon)) return null;
        $locationKey = round((float)$lat, 4) . ',' . round((float)$lon, 4);
        if (array_key_exists($locationKey, $this->openWeatherCache)) return $this->openWeatherCache[$locationKey];
        $apiKey = $this->getOpenWeatherKey();
        if ($apiKey === null) {
            error_log("updateSensorDB: sin clave de OpenWeatherMap (OPENWEATHER_API_KEY u openweather.key)");
            return $this->openWeatherCache[$locationKey] = null;
        }
        $res = $this->executeRequest('https://api.openweathermap.org/data/2.5/weather?' . http_build_query([
            'lat' => $lat, 'lon' => $lon, 'units' => 'metric', 'appid' => $apiKey,
        ]));
        $hr = $res->main->humidity ?? null;
        $t  = $res->main->temp ?? null;
        $reading = (is_numeric($hr) || is_numeric($t))
            ? ['hr' => is_numeric($hr) ? (float)$hr : null, 't' => is_numeric($t) ? (float)$t : null]
            : null;
        return $this->openWeatherCache[$locationKey] = $reading;
    }

    private function fillEmptyData_old($rawData): array {
        $rawData = str_replace('[,', '[NaN,NaN,NaN,NaN,', $rawData);
        $rawData = preg_replace_callback('/,{2,}/', function($matches) {
            $count = strlen($matches[0]) - 1;
            $nanBlock = implode(',', array_fill(0, $count * 4, 'NaN'));
            return ',' . $nanBlock . ',';
        }, $rawData);
        $rawData = str_replace(',]', ',NaN,NaN,NaN,NaN]', $rawData);
        $rawData = trim($rawData, '[]');
        $data = explode(',', $rawData);
        $numericData = array_map(function($v) {
            if ($v === 'NaN') return NAN;
            return is_numeric($v) ? (float)$v : NAN;
        }, $data);
        return $numericData;
    }

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

    private function updateActualData(array $data) {
        $settings = $this->settings;
        $date = $this->date;
        $data = array_map(function($value) {
            if (is_nan($value) || $value === -127.0) return NAN;
            return round($value, 1);
        }, $data);
        $estacion = $this->getStation();
        $limit = (int)($settings->sensors->sensorNumber ?? 0);
        $l = ($limit - 1) * 4;
        for ($i = 0; $i < $limit; $i++) {
            $data[$i * 4] = $this->getValidOrFallbackValue($data, $i * 4, 0, $l, $date, null);
            $data[$i * 4 + 1] = $this->getValidOrFallbackValue($data, $i * 4 + 1, 1, $l, $date, $estacion);
            $data[$i * 4 + 2] = $this->getValidOrFallbackValue($data, $i * 4 + 2, 2, $l, $date, $estacion);
            $data[$i * 4 + 3] = $this->getValidOrFallbackValue($data, $i * 4 + 3, 3, $l, $date, null);
        }
        $dataClean = array_map(function($v) {
            return is_nan($v) ? -99 : $v;
        }, $data);
        return $data;
    }

    private function getValidOrFallbackValue($data, $i, $j, $limit, $date, $estacion) {
        if (is_nan($data[$i])) {
            $idx = "S" . (($i - $j) / 4);
            $settings = $this->settings;
            $sensorType = $settings->sensors->{$idx}->type ?? null;
            if (in_array($sensorType, self::FILLABLE_TYPES, true)) {
                if ($j === 3) return self::VCC_FILL;           // Vcc faltante: siempre 4 V
                $medias = $this->calcularMedias($data, $i, $j);
                $medias = $j < 3 ? $this->getRndValue($medias, 1.0, $i) : $medias;
                if (!is_nan($medias)) return $medias;
                $sensorLat = $settings->sensors->{$idx}->latitude ?? null;
                $sensorLon = $settings->sensors->{$idx}->longitude ?? null;
                $sensorId  = $settings->sensors->{$idx}->id ?? null;
                if ($j === 0) {
                    if ($sensorType === 'WM') return NAN;      // Open-Meteo da humedad de suelo en %, el WM mide cb
                    [$smLat, $smLon] = $this->getCoordinates(intdiv($i - $j, 4));
                    $sm = $this->getSoilMoisturePoint($smLat, $smLon);
                    return $sm === null ? NAN : $this->getRndValue($sm, 1.0, $sensorId);   // antes: null ⇒ valor falso ≈ 0
                }
                if ($j === 1 || $j === 2) {
                    if ($estacion) {
                        $reading = $this->getStationReading($estacion);
                        $v = $reading[$j === 1 ? 'hr' : 't'] ?? null;
                        if ($v !== null) return $this->getRndValue((float)$v, 1.0, $sensorId);
                    }
                    [$lat, $lon] = $this->getCoordinates(intdiv($i - $j, 4));
                    if ($j === 1) {                                // HR: OpenWeatherMap → Open-Meteo
                        $owm = $this->getOpenWeather($lat, $lon);
                        if ($owm !== null && $owm['hr'] !== null) return $this->getRndValue($owm['hr'], 1.0, $sensorId);
                    }
                    $response = $this->getTHData($lat, $lon);
                    if ($j === 1 && isset($response[0])) return $this->getRndValue($response[0], 1.0, $sensorId);
                    if ($j === 2 && isset($response[1])) return $this->getRndValue($response[1], 1.0, $sensorId);
                }
                return NAN;
            }
        }
        return $data[$i];
    }

    private function getTHData($lat, $lon) {
        $weather = $this->getWeatherData($lat, $lon);
        if ($weather) {
            return [$weather['humidity'] ?? null, $weather['temp'] ?? null];
        }

        $locationKey = round((float)$lat, 4) . ',' . round((float)$lon, 4);
        return isset($this->agroCache[$locationKey]) ? [null, $this->agroCache[$locationKey]['temp'] ?? null] : [null, null];
    }

    private function getWeatherData($lat, $lon): ?array {
        if (!is_numeric($lat) || !is_numeric($lon)) return null;

        $locationKey = round((float)$lat, 4) . ',' . round((float)$lon, 4);
        if (isset($this->weatherCache[$locationKey]) && (time() - $this->weatherCache[$locationKey]['timestamp']) < 600) {
            return $this->weatherCache[$locationKey]['data'];
        }

        $query = http_build_query([
            'latitude' => $lat,
            'longitude' => $lon,
            'hourly' => 'temperature_2m,relative_humidity_2m,wind_speed_10m,shortwave_radiation,surface_pressure,et0_fao_evapotranspiration,precipitation,soil_temperature_54cm,soil_moisture_27_to_81cm',
            'timezone' => 'America/Chihuahua',
            'wind_speed_unit' => 'ms',
            'past_days' => 1,
            'forecast_days' => 1
        ]);
        $url = "https://api.open-meteo.com/v1/forecast?$query";
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $response = curl_exec($ch);
        if ($response === false) {
            error_log("Open-Meteo API Error: " . curl_error($ch));
            curl_close($ch);
            return null;
        }
        curl_close($ch);

        $data = json_decode($response, true);
        if (!is_array($data)) return null;

        $times  = $data['hourly']['time'] ?? [];
        $currentHour = (new DateTime('now', new DateTimeZone('America/Chihuahua')))->format("Y-m-d\TH:00");
        $index = array_search($currentHour, $times);
        if ($index === false) $index = $this->findClosestHourIndex($times, $currentHour);
        if ($index === null) return null;

        $hourly = $data['hourly'] ?? [];
        $weather = [
            'temp' => $hourly['temperature_2m'][$index] ?? null,
            'humidity' => $hourly['relative_humidity_2m'][$index] ?? null,
            'windSpeed' => $hourly['wind_speed_10m'][$index] ?? null,
            'shortwaveRadiation' => $hourly['shortwave_radiation'][$index] ?? null,
            'surfacePressure' => $hourly['surface_pressure'][$index] ?? null,
            'eto' => $hourly['et0_fao_evapotranspiration'][$index] ?? null,
            'precipitation' => $hourly['precipitation'][$index] ?? null,
            'soilTemp' => $hourly['soil_temperature_54cm'][$index] ?? null,
            'soilMoisture' => $hourly['soil_moisture_27_to_81cm'][$index] ?? null
        ];

        $this->weatherCache[$locationKey] = [
            'data' => $weather,
            'timestamp' => time()
        ];

        return $weather;
    }

    private function findClosestHourIndex($times, $targetTime) {
        $closestIndex = null;
        $minDiff = PHP_INT_MAX;
        foreach ($times as $index => $time) {
            $diff = abs(strtotime($time) - strtotime($targetTime));
            if ($diff < $minDiff) {
                $minDiff = $diff;
                $closestIndex = $index;
            }
        }
        return $closestIndex;
    }

    private function getFieldValue($source, string $field) {
        if (is_array($source)) {
            if (array_key_exists($field, $source)) return $source[$field];
            $first = reset($source);
            return $first !== false ? $this->getFieldValue($first, $field) : null;
        }
        if (is_object($source)) {
            if (isset($source->{$field})) return $source->{$field};
            $vars = get_object_vars($source);
            $first = reset($vars);
            return $first !== false ? $this->getFieldValue($first, $field) : null;
        }
        return null;
    }

    private function getSoilMoisturePoint($lat, $lon) {
        $weather = $this->getWeatherData($lat, $lon);
        $sm = $weather['soilMoisture'] ?? null;
        if ($sm !== null && is_numeric($sm) && $sm < 1) {
            $sm = $sm * 100.0;
        }
        $locationKey = round((float)$lat, 4) . ',' . round((float)$lon, 4);
        $this->agroCache[$locationKey] = [
            'temp' => is_array($weather) ? ($weather['soilTemp'] ?? null) : null,
            'humidity' => null,
            'timestamp' => time()
        ];

        /*
        $agroAPI = '07f1e9d39ef35ee2b22c77c48a4c5a7d';
        $soilUrl = "https://api.agromonitoring.com/agro/1.0/soil?lat=$lat&lon=$lon&appid=$agroAPI";
        $context = stream_context_create(['http' => ['timeout' => 5]]);
        $resp = file_get_contents($soilUrl, false, $context);
        if ($resp === false) return null;
        $soilData = json_decode($resp, true);
        if ($soilData === null) return null;
        $sm = $soilData['moisture'] ?? ($soilData['soil_moisture'] ?? ($soilData['volumetric_water_content'] ?? null));
        if ($sm !== null && is_numeric($sm) && $sm < 1) {
            $sm = $sm * 100.0;
        }
        $tempKelvin = $soilData['t0'] ?? null;
        $temp = $tempKelvin !== null ? $tempKelvin - 273.15 : null;
        $this->agroCache[$locationKey] = [
            'temp' => $temp,
            'humidity' => null,
            'timestamp' => time()
        ];
        */

        return is_numeric($sm) ? floatval($sm) : null;
    }

    /**
     * Promedio del valor j entre los sensores del MISMO TIPO que el sensor a completar. No se mezclan tipos ni
     * magnitudes: el tipo dicta la unidad (SHT/SHT4 en %, WM en cb; PSI es presión de agua).
     */
    private function calcularMedias($data, $i, $j) {
        $idx = "S" . intdiv($i - $j, 4);
        $settings = $this->settings;
        $tipo = $settings->sensors->{$idx}->type ?? null;
        if ($tipo === null) return NAN;
        $media = $counter = 0;
        for ($s = 0; $s < (int)($settings->sensors->sensorNumber ?? 0); $s++) {
            if (($settings->sensors->{"S$s"}->type ?? null) !== $tipo) continue;   // solo el mismo tipo
            $v = $data[$s * 4 + $j] ?? NAN;
            if (is_numeric($v) && !is_nan($v) && !($j === 1 && (float)$v === self::HR_NOT_MEASURED)) {
                $media += $data[$s * 4 + $j];
                $counter++;
            }
        }
        return $counter > 0 ? $media / $counter : NAN;
    }

    private function ruidoGauss($media, $sigma) {
        $u1 = mt_rand() / mt_getrandmax();
        $u2 = mt_rand() / mt_getrandmax();
        $z0 = sqrt(-2 * log($u1)) * cos(2 * M_PI * $u2);
        return $media + $z0 * $sigma;
    }

    private function getRndValue($a, $delta, $seed = null): float {
        if ($seed !== null) {
            $dynamicSeed = intval($seed, 16) + (int)(microtime(true) * 1000);
            mt_srand($dynamicSeed);
        }

        $min = $a - $delta;
        $max = $a + $delta;
        $valorAleatorio = $min + (mt_rand() / mt_getrandmax()) * ($max - $min);
        $valorConRuido = $this->ruidoGauss($valorAleatorio, 0.3);

        return round($valorConRuido, 1);
    }

    private function getFilterObject($systemId) {
        $systemId = is_scalar($systemId) ? (string)$systemId : '';
        $SENSOR_NETWORK = [
            ['systemId' => '24530080324', 'est' => '_osm'],  // Heber Alonso Morales Andujoo
            ['systemId' => '24530080449', 'est' => '_osm'],  // Luis Carlos Estrada Estrada
            ['systemId' => '20333844254', 'est' => '_nal'],  // Manuel Enrique Rivera Cano
            ['systemId' => '24530080316', 'est' => '_fac'],  // Ruben Alberto Dominguez Montano
            ['systemId' => '24530080456', 'est' => '_fac'],  // Silvia Yadira Rivera Alvarez
            ['systemId' => '24530084283', 'est' => '_lbr'],  // Alvaro Loya Andujo
            ['systemId' => '24530094291', 'est' => '_osm'],  // Alfredo Quintana Juarez
            ['systemId' => '24530094135', 'est' => '_bac'],  // Laura Carmina Arriola Ordoñez(Jesús Manuel Mariscal)
            ['systemId' => '24530080415', 'est' => '_mrc'],  // Salvador Saenz Mendoza
            ['systemId' => '24530094119', 'est' => '_mrc'],  // Guadalupe Lozano Garcia (Ramiro)
            ['systemId' => '24530080423', 'est' => '_mrc'],  // Francisco Terán
            ['systemId' => '25331424856', 'est' => '_mmi'],  // Luly Camacho
            ['systemId' => '24530094143', 'est' => '_mmi'],  // Claudio_PROFRUT_Rancho González Lardizabal
            ['systemId' => '24530094150', 'est' => '_mmi'],  // Claudio_PROFRUT_Estanque González Lardizabal
            ['systemId' => '24530094127', 'est' => '_mmi'],  // Álvaro Mingura
            ['systemId' => '24530080431', 'est' => '_bas'],  // Trinidad Estrada Valadez
            ['systemId' => '24530094275', 'est' => '_ros'],  // Ignacio Luis Delgado Casale
            ['systemId' => '24530080407', 'est' => '_lju'],  // Javier Hernández Caballero
            ['systemId' => '24530080332', 'est' => '_lac']   // Carlos Macyshyn Rasor (Capilla)
        ];
        $result = array_filter($SENSOR_NETWORK, function($sensorNet) use ($systemId) {
            return $sensorNet['systemId'] === $systemId;
        });
        return reset($result) ?: null;
    }

    /**
     * Estación local del sistema: ['region' => ..., 'est' => id] o null.
     * settings.station { region, id } (PWA3) → settings.station "_id" → tabla getFilterObject().
     */
    private function getStation(): ?array {
        $own = $this->settings->station ?? null;
        $id = $region = '';
        if (is_object($own)) {
            $id = trim((string)($own->id ?? ''));
            $region = trim((string)($own->region ?? ''));
        } elseif (is_string($own)) {
            $id = trim($own);
        }
        if ($id === '') {
            $row = $this->getFilterObject($this->settings->key ?? null);
            $id = $row['est'] ?? '';
        }
        if ($id === '') return null;
        if ($region === '') $region = $this->getStationRegions()[$id] ?? '';
        return $region === '' ? null : ['region' => $region, 'est' => $id];
    }

    /** id => región, desde Firebase /stations; si no responde, la tabla fija. */
    private function getStationRegions(): array {
        if ($this->stationRegions !== null) return $this->stationRegions;
        $map = [];
        $root = substr($this->baseUrl, 0, strpos($this->baseUrl, '/systems/'));
        $node = $this->executeRequest($root . '/stations.json');
        foreach ((is_array($node) || is_object($node)) ? (array)$node : [] as $key => $v) {
            if (!is_array($v) && !is_object($v)) continue;
            $v = (object)$v;
            $region = trim((string)($v->region ?? ($v->re ?? '')));
            if ($region !== '') {                                   // lista/objeto de { id, name, region }
                $id = trim((string)($v->id ?? $key));
                if ($id !== '' && !isset($map[$id])) $map[$id] = $region;
                continue;
            }
            $key = (string)$key;
            if ($key === '' || $key[0] === '_') continue;          // agrupado por región
            foreach ((array)$v as $sub => $e) {
                $sub = (string)$sub;
                $id = (is_array($e) || is_object($e)) ? trim((string)(((object)$e)->id ?? $sub)) : $sub;
                if ($id !== '' && $id[0] === '_' && !isset($map[$id])) $map[$id] = $key;
            }
        }
        return $this->stationRegions = $map ?: self::STATION_REGIONS;
    }

    /**
     * Registro diario más reciente (hoy o ayer) de una estación: ['hr' => hmin, 't' => tprom, 'fecha'] o null.
     * estaciones.php recibe fi/ff aaaa-mm-dd y regresa un renglón por día; al final agrega "Promedio / Totales",
     * "Maximo" y "Minimo" (sin datos, solo esos tres con tprom "0.00"), que se descartan.
     */
    private function getStationReading(array $station): ?array {
        $key = $station['region'] . '|' . $station['est'];
        if (array_key_exists($key, $this->stationCache)) return $this->stationCache[$key];

        $now = $this->getDateTime($this->getLocalZone());
        $today = $now->format('Y-m-d');
        $from = (clone $now)->modify('-' . self::STATION_MAX_AGE_DAYS . ' day')->format('Y-m-d');
        $rows = $this->executeRequest('https://dtaamerica.com/ws/estaciones.php?' . http_build_query([
            'fi' => $from, 'ff' => $today, 'tp' => 'Hora', 're' => $station['region'], 'es' => $station['est'],
        ]));

        $best = null;
        foreach (is_array($rows) ? $rows : [] as $row) {
            $row = (array)$row;
            $fecha = trim((string)($row['fecha'] ?? ''));
            if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $fecha, $m) !== 1 || !checkdate((int)$m[2], (int)$m[3], (int)$m[1])) continue;
            if ($fecha > $today || $fecha < $from) continue;
            $hr = $this->numberOrNull($row['hmin'] ?? null);
            $t  = $this->numberOrNull($row['tprom'] ?? null);
            if ($hr === null && $t === null) continue;
            if ($best === null || $fecha >= $best['fecha']) $best = ['hr' => $hr, 't' => $t, 'fecha' => $fecha];
        }
        return $this->stationCache[$key] = $best;
    }

    private function numberOrNull($v): ?float {
        if (is_string($v)) $v = str_replace(',', '.', trim($v));
        return is_numeric($v) ? (float)$v : null;
    }

    private function updateLog(array $data): void {
        $logData = $this->crearLogData($data);
        // print_r($logData);
        $dayLogsFile = $this->baseUrl . "dayLogs.json";
        if ($this->esPrimerRegistroDelDia($dayLogsFile)) {
            $this->procesarPrimerRegistro($dayLogsFile, $logData);
        } else {
            $currentDate = $this->getCurrentDate($logData['date']);
            $lastDate = $this->obtenerUltimaFechaDia($dayLogsFile);
            if ($this->esMismoDia($currentDate, $lastDate)) {
                $this->procesarMismoDia($dayLogsFile, $logData);
            } else {
                $this->procesarCambioDia($dayLogsFile, $logData, $lastDate);
            }
        }
    }

    private function crearLogData(array $data): array {
        $data = array_map(function($value) {
            if (is_nan($value) || $value === -127.0) return NAN;
            return round($value, 1);
        }, $data);
        $totalSensors = 10;
        $valuesPerSensor = 4;
        $expandedData = [];
        for ($i = 0; $i < $totalSensors; $i++) {
            $msIndex  = $i * $valuesPerSensor;
            $hrIndex  = $i * $valuesPerSensor + 1;
            $tIndex   = $i * $valuesPerSensor + 2;
            $vccIndex = $i * $valuesPerSensor + 3;
            $msValue  = $data[$msIndex]  ?? NAN;
            $hrValue  = $data[$hrIndex]  ?? NAN;
            $tValue   = $data[$tIndex]   ?? NAN;
            $vccValue = $data[$vccIndex] ?? NAN;
            $sensorSettings = $this->settings->sensors->{"S".$i} ?? null;
            [$lat, $lon] = $this->getCoordinates($i);          // del sensor o, si no tiene, del sistema
            $weather = $sensorSettings ? $this->getWeatherData($lat, $lon) : null;
            // ETc en mm/h (2 decimales: con 1 decimal las tasas nocturnas se redondeaban a 0)
            $etc = (!is_nan($tValue) && !is_nan($hrValue)) ? round($this->calcularETo($tValue, $hrValue, $weather, $sensorSettings), 2) : NAN;
            $hf = !is_nan($tValue) ? $this->calcularHorasFrio($tValue) : NAN;
            $expandedData[] = (string)$msValue;
            $expandedData[] = (string)$hrValue;
            $expandedData[] = (string)$tValue;
            $expandedData[] = (string)$tValue;
            $expandedData[] = (string)$tValue;
            $expandedData[] = (string)$etc;
            $expandedData[] = (string)$hf;
            $expandedData[] = (string)$vccValue;
        }
        return [
            'date' => $this->date,
            'dataRaw' => json_encode($expandedData),
            'signal' => $this->signal,
            'qos' => $this->qos,
            'reception' => $this->reception
        ];
    }

    /**
     * ETc = ETo × Kc, en mm/h. ETo: Open-Meteo (et0_fao_evapotranspiration, mm de la última hora) →
     * Penman-Monteith horario (FAO-56) con viento, radiación y presión → aproximación.
     */
    private function calcularETo(float $temp, float $hr, ?array $weather = null, $sensorSettings = null): float {
        $kc = $this->getCropCoefficient($sensorSettings);
        $apiEto = $weather['eto'] ?? null;
        if (is_numeric($apiEto)) {
            return max(0, (float)$apiEto * $kc);
        }

        $windSpeed = $weather['windSpeed'] ?? null;
        $shortwaveRadiation = $weather['shortwaveRadiation'] ?? null;
        $surfacePressure = $weather['surfacePressure'] ?? null;
        if (is_numeric($windSpeed) && is_numeric($shortwaveRadiation) && is_numeric($surfacePressure)) {
            $eto = $this->calcularEToPenmanMonteith(
                $temp,
                $hr,
                (float)$windSpeed,
                (float)$shortwaveRadiation,
                (float)$surfacePressure
            );
            return max(0, $eto * $kc);
        }

        $hrDecimal = max(0, min(1, $hr / 100));
        $fallbackEto = 0.408 * (0.408 * exp(0.051 * $temp)) * (0.05 * $temp) * (1 - $hrDecimal);
        return max(0, $fallbackEto * $kc);
    }

    private function calcularEToPenmanMonteith(float $temp, float $hr, float $windSpeed, float $shortwaveRadiation, float $surfacePressure): float {
        $es = 0.6108 * exp((17.27 * $temp) / ($temp + 237.3));
        $ea = $es * max(0, min(1, $hr / 100));
        $delta = (4098 * $es) / pow($temp + 237.3, 2);
        $pressureKpa = $surfacePressure > 20 ? $surfacePressure / 10 : $surfacePressure;
        $gamma = 0.000665 * $pressureKpa;
        $u2 = max(0.1, $windSpeed);
        $rs = max(0, $shortwaveRadiation) * 0.0036;
        $rn = 0.77 * $rs;
        $numerator = (0.408 * $delta * $rn) + ($gamma * (37 / ($temp + 273)) * $u2 * max(0, $es - $ea));
        $denominator = $delta + ($gamma * (1 + 0.34 * $u2));
        if ($denominator <= 0) return 0.0;
        return $numerator / $denominator;
    }

    private function getCropCoefficient($sensorSettings): float {
        $settings = $this->settings;
        foreach (['cropCoefficient', 'kc', 'Kc', 'cultivoKc', 'coeficienteCultivo'] as $field) {
            $value = $this->getFieldValue($sensorSettings, $field);
            if (is_numeric($value)) return max(0, (float)$value);
            $value = $this->getFieldValue($settings, $field);
            if (is_numeric($value)) return max(0, (float)$value);
        }
        return 1.0;
    }

    /**
     * Unidades frío por hora, modelo Utah (Richardson, 1974):
     *   < 1.5 °C: 0 · 1.5–2.4: 0.5 · 2.5–9.1: 1 · 9.2–12.4: 0.5 · 12.5–15.9: 0 · 16.0–18.0: −0.5 · > 18.0: −1
     * El resumen diario es el promedio × 24 (no la suma de registros, que son de 10–30 min).
     */
    private function calcularHorasFrio(float $temp): float {
        if ($temp < 1.5) return 0.0;
        if ($temp < 2.5) return 0.5;
        if ($temp < 9.2) return 1.0;
        if ($temp < 12.5) return 0.5;
        if ($temp < 16.0) return 0.0;
        if ($temp <= 18.0) return -0.5;
        return -1.0;
    }

    private function getLocalZone(): int {
        $settings = $this->settings;
        $timeZone = $settings->zona ?? 0;
        $summerHour = $settings->summerHour ?? 0;
        return intval($timeZone) + intval($summerHour);
    }

    private function getDateTime(int $localZone): DateTime {
        $dateTime = new DateTime();
        $dateTime->modify("$localZone hours");
        return $dateTime;
    }

    private function esPrimerRegistroDelDia(string $dayLogsFile): bool {
        return $this->getDayLogs() === null;
    }
    
    private function procesarPrimerRegistro(string $dayLogsFile, array $logData): void {
        $this->executeRequest($dayLogsFile, 'POST', json_encode($logData));
    }
    
    private function getCurrentDate(string $fullDate): string {
        return substr($fullDate, 0, 8);
    }
    
    private function obtenerUltimaFechaDia(string $dayLogsFile): ?string {
        $response = $this->getDayLogs();
        if ($response === null) return null;
        $dayLogs = json_decode(json_encode($response), true);
        if (empty($dayLogs)) return null;
        $lastLog = end($dayLogs);
        if (!isset($lastLog['date'])) {
            return null;
        }
        return substr($lastLog['date'], 0, 8);
    }

    private function esMismoDia(string $currentDate, ?string $lastDate): bool {
        return $lastDate !== null && $currentDate === $lastDate;
    }
    
    private function procesarMismoDia(string $dayLogsFile, array $logData): void {
        $this->executeRequest($dayLogsFile, 'POST', json_encode($logData));
    }
    
    private function procesarCambioDia(string $dayLogsFile, array $logData, ?string $lastDate): void {
        $dayLogs = $this->leerDayLogs($dayLogsFile);
        $promedioDataRaw = $dayLogs ? $this->calcularPromedioDataRaw($dayLogs) : [];
        $this->executeRequest($dayLogsFile, 'DELETE');
        $summaryLogData = $this->crearRegistroPromedio($lastDate ?? '', $promedioDataRaw);
        $this->guardarEnLogsPrincipal($summaryLogData);
        $this->executeRequest($dayLogsFile, 'POST', json_encode($logData));
    }

    private function leerDayLogs(string $dayLogsFile): array {
        $response = $this->getDayLogs();
        if ($response === null) return [];
        return is_object($response) ? get_object_vars($response) : [];
    }
    
    private function crearRegistroPromedio(string $lastDate, array $promedioDataRaw): array {
        return [
            'date' => ($lastDate ?: date('Ymd')) . ' 0000am',
            'dataRaw' => json_encode($promedioDataRaw),
            'signal' => $this->signal,
            'qos' => $this->qos,
            'reception' => $this->reception
        ];
    }
    
    private function guardarEnLogsPrincipal(array $logData): void {
        $this->executeRequest(
            $this->baseUrl . "logs.json",
            'POST',
            json_encode($logData)
        );
    }

    private function calcularPromedioDataRaw(array $dayLogs): array {
        if (empty($dayLogs)) return [];
        
        $totalSensors = 10;
        $valuesPerSensor = 8;
        
        $sumsMs = array_fill(0, $totalSensors, 0);
        $countsMs = array_fill(0, $totalSensors, 0);
        $sumsHr = array_fill(0, $totalSensors, 0);
        $countsHr = array_fill(0, $totalSensors, 0);
        $sumsT = array_fill(0, $totalSensors, 0);
        $countsT = array_fill(0, $totalSensors, 0);
        $lastVcc = array_fill(0, $totalSensors, 0);
        
        // Antes PHP_FLOAT_MIN (el positivo más pequeño): un día con Tmax bajo cero quedaba "NaN".
        $minsTmin = array_fill(0, $totalSensors, INF);
        $maxsTmax = array_fill(0, $totalSensors, -INF);
        
        $sumsETc = array_fill(0, $totalSensors, 0);
        $sumsHf = array_fill(0, $totalSensors, 0);
        $countsETc = array_fill(0, $totalSensors, 0);
        $countsHf = array_fill(0, $totalSensors, 0);
        
        foreach ($dayLogs as $log) {
            $dataRaw = is_object($log) && isset($log->dataRaw) && is_string($log->dataRaw) ? json_decode($log->dataRaw, true) : null;
            if (!is_array($dataRaw) || count($dataRaw) !== $totalSensors * $valuesPerSensor) {
                continue;
            }
            
            for ($i = 0; $i < $totalSensors; $i++) {
                $msIndex = $i * $valuesPerSensor;
                $hrIndex = $i * $valuesPerSensor + 1;
                $tminIndex = $i * $valuesPerSensor + 2;
                $tmaxIndex = $i * $valuesPerSensor + 3;
                $tIndex = $i * $valuesPerSensor + 4;
                $etcIndex = $i * $valuesPerSensor + 5;
                $hfIndex = $i * $valuesPerSensor + 6;
                $vccIndex = $i * $valuesPerSensor + 7;
                
                $msValue = $dataRaw[$msIndex] ?? "NaN";
                $hrValue = $dataRaw[$hrIndex] ?? "NaN";
                $tminValue = $dataRaw[$tminIndex] ?? "NaN";
                $tmaxValue = $dataRaw[$tmaxIndex] ?? "NaN";
                $tValue = $dataRaw[$tIndex] ?? "NaN";
                $etcValue = $dataRaw[$etcIndex] ?? "NaN";
                $hfValue = $dataRaw[$hfIndex] ?? "NaN";
                $vccValue = $dataRaw[$vccIndex] ?? "NaN";
                
                if ($msValue !== "NaN" && is_numeric($msValue)) {
                    $sumsMs[$i] += round((float)$msValue, 1);
                    $countsMs[$i]++;
                }
                
                if ($hrValue !== "NaN" && is_numeric($hrValue) && (float)$hrValue !== self::HR_NOT_MEASURED) {
                    $sumsHr[$i] += round((float)$hrValue, 1);
                    $countsHr[$i]++;
                }
                
                if ($tValue !== "NaN" && is_numeric($tValue)) {
                    $tValueFloat = round((float)$tValue, 1);
                    $sumsT[$i] += $tValueFloat;
                    $countsT[$i]++;
                }
                
                if ($tminValue !== "NaN" && is_numeric($tminValue)) {
                    $tminFloat = round((float)$tminValue, 1);
                    if ($tminFloat < $minsTmin[$i]) {
                        $minsTmin[$i] = $tminFloat;
                    }
                }
                
                if ($tmaxValue !== "NaN" && is_numeric($tmaxValue)) {
                    $tmaxFloat = round((float)$tmaxValue, 1);
                    if ($tmaxFloat > $maxsTmax[$i]) {
                        $maxsTmax[$i] = $tmaxFloat;
                    }
                }
                
                if ($etcValue !== "NaN" && is_numeric($etcValue) && !is_nan((float)$etcValue)) {
                    $sumsETc[$i] += (float)$etcValue;
                    $countsETc[$i]++;
                }
                
                if ($hfValue !== "NaN" && is_numeric($hfValue) && !is_nan((float)$hfValue)) {
                    $sumsHf[$i] += (float)$hfValue;
                    $countsHf[$i]++;
                }
                
                if ($vccValue !== "NaN" && is_numeric($vccValue)) {
                    $lastVcc[$i] = round((float)$vccValue, 1);
                }
            }
        }
        
        $result = [];
        for ($i = 0; $i < $totalSensors; $i++) {
            $result[] = $countsMs[$i] > 0 ? round($sumsMs[$i] / $countsMs[$i], 1) : "NaN";
            $result[] = $countsHr[$i] > 0 ? round($sumsHr[$i] / $countsHr[$i], 1) : "NaN";
            $result[] = is_finite($minsTmin[$i]) ? $minsTmin[$i] : "NaN";
            $result[] = is_finite($maxsTmax[$i]) ? $maxsTmax[$i] : "NaN";
            $result[] = $countsT[$i] > 0 ? round($sumsT[$i] / $countsT[$i], 1) : "NaN";
            // ETc (mm/día) y unidades frío del día = promedio horario × 24
            $result[] = $countsETc[$i] > 0 ? round($sumsETc[$i] / $countsETc[$i] * 24, 1) : "NaN";
            $result[] = $countsHf[$i] > 0 ? round($sumsHf[$i] / $countsHf[$i] * 24, 1) : "NaN";
            $result[] = $lastVcc[$i] ?: "NaN";
        }
        
        return $result;
    }

    /** Id crudos de data=[0x..,0x..] (antes llegaban ya convertidos a números y el modo fallaba). */
    private function discoveryTokens(string $raw): array {
        $raw = trim(trim($raw), '[]');
        return $raw === '' ? [] : array_map('trim', explode(',', $raw));
    }

    private function sensorsDiscovery(array $data) {
        $settings = $this->settings;
        $length = count($data);
        if ($length === 0) return;                    // data=[] en descubrimiento: no borrar los sensores
        $actualize = true;
        if (!isset($settings->sensors) || !is_object($settings->sensors)) $settings->sensors = new stdClass();
        for ($i = 0; $i < $length; $i++) {
            $idx = "S$i";
            if (isset($data[$i]) && strpos($data[$i], '0x') === 0) {
                if (!isset($settings->sensors->$idx) || !is_object($settings->sensors->$idx)) $settings->sensors->$idx = new stdClass();
                $settings->sensors->$idx->id = $data[$i];
                $settings->sensors->$idx->latitude = $settings->sensors->$idx->latitude ?? 0.0;
                $settings->sensors->$idx->longitude = $settings->sensors->$idx->longitude ?? 0.0;
                $settings->sensors->$idx->type = $settings->sensors->$idx->type ?? "SHT4";
            } else {
                $actualize = false;
                break;
            }
        }
        if ($actualize) {
            $settings->sensors->sensorNumber = $length;
            $this->settings = $settings;
            $this->updateSettings($settings);
        }
    }

    private function updateSettings(object $settings): void {
        $this->executeRequest(
            $this->baseUrl . "settings.json",
            'PUT',
            json_encode($settings)
        );
    }

    private function callAlerts($data): void {
        $queryString = http_build_query($_GET);
        $alertUrl = "https://dtaamerica.com/ws/alertas.php?$queryString";
        $cmd = "curl -s \"$alertUrl\" > /dev/null 2>&1 &";
        pclose(popen($cmd, 'r'));
    }

    public function escribirLog($mensaje) {
        $archivo = __DIR__ . '/updateDB_log.txt';
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
    // id obligatorio y sin caracteres que cambien la ruta de Firebase (/ . # $ [ ] ? & %)
    if (!isset($_GET['id']) || !is_string($_GET['id']) || $_GET['id'] === '' || preg_match('/[\/.#$\[\]?&%\s\\]/', $_GET['id'])) {
        http_response_code(400);
        echo "Error: Falta el parámetro 'id' del sistema";
        exit;
    }

    $updater = new DatabaseUpdater($_GET['id']);
    // print_r($updater->signal . " " . $updater->qos . " " . $updater->reception);
    $updater->processData();
    
} catch (Throwable $e) {
    error_log("Error en updateSensorDB.php: " . $e->getMessage());
    http_response_code(500);
    echo "Error: " . $e->getMessage();
}

?>
