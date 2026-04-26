<?php
declare(strict_types=1);

class DatabaseUpdater {
    private $baseUrl;
    private $settings = null;
    private $users = null;
    private $curlHandle;
    private $agroCache = [];
    private $isRealData = true;

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
        if (isset($_GET['data'])) {
            if ($_GET['data'] == '[]') {
                $lastLogDate = $this->getLastLogDate();
                if ($lastLogDate === null || !$this->isWithinRange($lastLogDate, 3)) {
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

    private function getLastLogDate() {
        $allLogs = $this->executeRequest($this->baseUrl . "dayLogs.json");
        if ($allLogs === null) return null;
        $logsArray = is_object($allLogs) ? get_object_vars($allLogs) : $allLogs;
        if (empty($logsArray)) return null;
        $lastLogKey = array_key_last($logsArray);
        $lastLog = $logsArray[$lastLogKey];
        return $lastLog->date;
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
        $settings = $this->getSettings();
        $data = $this->updateActualData($data);
        if ($settings->operationMode && ($settings->operationMode == "" || $settings->operationMode == "0" || $settings->operationMode == 0)) {
            $this->sensorsDiscovery($data);
        } else {
            $this->updateLog($data);
            $this->callAlerts($data);
        }
    }

    private function fillEmptyData($rawData): array {
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

    private function updateActualData(array $data) {
        $settings = $this->getSettings();
        $date = $this->getDateTime($this->getLocalZone())->format('Ymd hia');
        $data = array_map(function($value) {
            if (is_nan($value) || $value === -127.0) return NAN;
            return round($value, 1);
        }, $data);
        $estacion = $this->getFilterObject($settings->key);
        $limit = $settings->sensors->sensorNumber;
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
            $settings = $this->getSettings();
            $sensorType = $settings->sensors->{$idx}->type;
            if (in_array($sensorType, ["SHT", "SHT4", "WM"])) {
                $medias = $this->calcularMedias($data, $i, $j);
                $medias = $j < 3 ? $this->getRndValue($medias, 1.0, $i) : $medias;
                if (!is_nan($medias)) return $medias;
                $sensorLat = $settings->sensors->{$idx}->latitude;
                $sensorLon = $settings->sensors->{$idx}->longitude;
                $sensorId  = $settings->sensors->{$idx}->id;
                if ($j === 0) return $this->getRndValue($this->getSoilMoisturePoint($sensorLat, $sensorLon), 1.0, $sensorId);
                if ($j === 3) return 3.0;
                if ($j === 1 || $j === 2) {
                    if ($estacion) {
                        $est = $estacion['est'];
                        $meteo = $this->executeRequest("https://dtaamerica.com/ws/estaciones.php?fi=$date&ff=$date&tp=Hora&re=DTA&es=$est");
                        if ($j === 1 && isset($meteo['hmin'])) return $this->getRndValue($meteo['hmin'], 1.0, $sensorId);
                        if ($j === 2 && isset($meteo['tprom'])) return $this->getRndValue($meteo['tprom'], 1.0, $sensorId);
                    }
                    $response = $this->getTHData($sensorLat, $sensorLon);
                    if ($j === 1 && isset($response[0])) return $this->getRndValue($response[0], 1.0, $sensorId);
                    if ($j === 2 && isset($response[1])) return $this->getRndValue($response[1], 1.0, $sensorId);
                }
                return NAN;
            }
        }
        return $data[$i];
    }

    private function getTHData($lat, $lon) {
        $url = "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&hourly=temperature_2m,relative_humidity_2m&timezone=America/Chihuahua";
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $response = curl_exec($ch);
        $locationKey = round((float)$lat, 4) . ',' . round((float)$lon, 4);
        if ($response === false) {
            error_log("Open-Meteo API Error: " . curl_error($ch));
            return isset($this->agroCache[$locationKey]) ? [null, $this->agroCache[$locationKey]['temp'] ?? null] : [null, null];
        }
        $data = json_decode($response, true);
        $times  = $data['hourly']['time'] ?? [];
        $temps  = $data['hourly']['temperature_2m'] ?? [];
        $humids = $data['hourly']['relative_humidity_2m'] ?? [];
        date_default_timezone_set("America/Chihuahua");
        $currentHour = date("Y-m-d\TH:00");
        $index = array_search($currentHour, $times);
        if ($index !== false && isset($temps[$index]) && isset($humids[$index])) {
            return [$humids[$index], $temps[$index]];
        }
        $closestIndex = $this->findClosestHourIndex($times, $currentHour);
        if ($closestIndex !== null && isset($temps[$closestIndex]) && isset($humids[$closestIndex])) {
            return [$humids[$closestIndex], $temps[$closestIndex]];
        }
        return isset($this->agroCache[$locationKey]) ? [null, $this->agroCache[$locationKey]['temp'] ?? null] : [null, null];
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

    function getSoilMoisturePoint($lat, $lon) {
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
        $locationKey = round((float)$lat, 4) . ',' . round((float)$lon, 4);
        $tempKelvin = $soilData['t0'] ?? null;
        $temp = $tempKelvin !== null ? $tempKelvin - 273.15 : null;
        $this->agroCache[$locationKey] = [
            'temp' => $temp,
            'humidity' => null,
            'timestamp' => time()
        ];
        return is_numeric($sm) ? floatval($sm) : null;
    }

    private function calcularMedias($data, $i, $j) {
        $idx = "S" . (($i - $j) / 4);
        $settings = $this->getSettings();
        $sensorType = $settings->sensors->{$idx}->type;
        $tiposValidos = ["SHT", "SHT4", "WM"];
        if (!isset($tiposValidos[$sensorType])) return NAN;
        $media = $counter = 0;
        for ($s = 0; $s < $settings->sensors->sensorNumber; $s++) {
            $sensorType = $settings->sensors->{"S".$s}->type;
            if (is_numeric($data[$s * 4 + $j]) && !is_nan($data[$s * 4 + $j]) && isset($tiposValidos[$sensorType])) {
                $media += $data[$s * 4 + $j];
                $counter++;
            }
        }
        return $counter ? $media / $counter : NAN;
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
        $SENSOR_NETWORK = [
            ['lat' => '29.072296', 'lon' => '-107.532898', 'est' => '_osm', 'sys' => '24530080324' ],
            ['lat' => '29.0665367', 'lon' => '-107.512', 'est' => '_osm', 'sys' => '24530080449' ],
            ['lat' => '29.052813', 'lon' => '-107.416114', 'est' => '_nal', 'sys' => '20333844254' ],
            ['lat' => '29.264143', 'lon' => '-107.337137', 'est' => '_fac', 'sys' => '24530080316' ],
            ['lat' => '29.2640867', 'lon' => '-107.337137', 'est' => '_fac', 'sys' => '24530080456' ],
            ['lat' => '29.1126387', 'lon' => '-107.4352774', 'est' => '_lbr', 'sys' => '24530084283' ],
            ['lat' => '29.077975', 'lon' => '-107.5262367', 'est' => '_osm', 'sys' => '24530094291' ],
            ['lat' => '28.8634', 'lon' => '-107.2421589', 'est' => '_bac', 'sys' => '24530094135' ],
            ['lat' => '28.615746', 'lon' => '-107.545181', 'est' => '_mrc', 'sys' => '24530080415' ],
            ['lat' => '28.6008204', 'lon' => '-107.5425449', 'est' => '_mrc', 'sys' => '24530094119' ],
            ['lat' => '28.60248', 'lon' => '-107.54051', 'est' => '_mrc', 'sys' => '24530080423' ],
            ['lat' => '28.4894', 'lon' => '-107.441965', 'est' => '_mmi', 'sys' => '24530094143' ],
            ['lat' => '28.4894383', 'lon' => '-107.4418783', 'est' => '_mmi', 'sys' => '24530094150' ],
            ['lat' => '28.5080187', 'lon' => '-107.4193631', 'est' => '_bas', 'sys' => '24530080431' ],
            ['lat' => '28.3936211', 'lon' => '-107.1927627', 'est' => '_ros', 'sys' => '24530094275' ],
            ['lat' => '28.475049', 'lon' => '-107.314355', 'est' => '_lju', 'sys' => '24530080407' ],
            ['lat' => '28.204821', 'lon' => '-107.026813', 'est' => '', 'sys' => '24530080332' ]
        ];
        $result = array_filter($SENSOR_NETWORK, function($sensorNet) use ($systemId) {
            return $sensorNet['sys'] === $systemId;
        });
        return reset($result) ?: null;
    }

    private function updateLog(array $data): void {
        $logData = $this->crearLogData($data);
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
        $localZone = $this->isRealData ? $this->getLocalZone() : 0;
        $localZone = 0;
        $date = $this->getDateTime($localZone)->format('Ymd hia');
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
            $etc = (!is_nan($tValue) && !is_nan($hrValue)) ? round($this->calcularETo($tValue, $hrValue), 1) : NAN;
            $hf = !is_nan($tValue) ? round($this->calcularHorasFrio($tValue), 1) : NAN;
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
            'date' => $date,
            'dataRaw' => json_encode($expandedData),
            'signal' => $_GET['si'] ?? '',
            'qos' => $_GET['qos'] ?? '',
            'reception' => in_array($_GET['rx'] ?? '', ['Ok', 'Er', 'ini', 'Cron']) ? $_GET['rx'] : ''
        ];
    }

    private function calcularETo(float $temp, float $hr): float {
        $tMean = $temp;
        $hrDecimal = $hr / 100;
        $ra = 0.408 * exp(0.051 * $tMean);
        $ea = $hrDecimal * 0.6108 * exp(17.27 * $tMean / ($tMean + 237.3));
        $eTo = 0.408 * $ra * (0.05 * $tMean) * (1 - $hrDecimal);
        return round(max(0, $eTo), 1);
    }

    private function calcularHorasFrio(float $temp): float {
        if (-2 <= $temp && $temp < 0) {
            return 0.5;
        } elseif (0 <= $temp && $temp < 7) {
            return 1.0;
        } elseif (7 <= $temp && $temp <= 30) {
            return 0.0;
        } else {
            return -1.0;
        }
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

    private function esPrimerRegistroDelDia(string $dayLogsFile): bool {
        $response = $this->executeRequest($dayLogsFile);
        return $response === null;
    }
    
    private function procesarPrimerRegistro(string $dayLogsFile, array $logData): void {
        $this->executeRequest($dayLogsFile, 'POST', json_encode($logData));
    }
    
    private function getCurrentDate(string $fullDate): string {
        return substr($fullDate, 0, 8);
    }
    
    private function obtenerUltimaFechaDia(string $dayLogsFile): ?string {
        $response = $this->executeRequest($dayLogsFile);
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
        $this->guardarEnLogsPrincipal($summaryLogData);
        $this->executeRequest($dayLogsFile, 'POST', json_encode($logData));
    }

    private function leerDayLogs(string $dayLogsFile): array {
        $response = $this->executeRequest($dayLogsFile);
        if ($response === null) return [];
        return is_object($response) ? get_object_vars($response) : [];
    }
    
    private function crearRegistroPromedio(string $lastDate, array $promedioDataRaw): array {
        return [
            'date' => ($lastDate ?: date('Ymd')) . ' 0000am',
            'dataRaw' => json_encode($promedioDataRaw),
            'signal' => $_GET['si'] ?? '',
            'qos' => $_GET['qos'] ?? '',
            'reception' => in_array($_GET['rx'] ?? '', ['Ok', 'Er', 'ini', 'Cron']) ? $_GET['rx'] : ''
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
        
        $minsTmin = array_fill(0, $totalSensors, PHP_FLOAT_MAX);
        $maxsTmax = array_fill(0, $totalSensors, PHP_FLOAT_MIN);
        
        $sumsETc = array_fill(0, $totalSensors, 0);
        $sumsHf = array_fill(0, $totalSensors, 0);
        
        foreach ($dayLogs as $log) {
            $dataRaw = json_decode($log->dataRaw, true);
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
                
                if ($hrValue !== "NaN" && is_numeric($hrValue)) {
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
                
                if ($etcValue !== "NaN" && is_numeric($etcValue)) {
                    $sumsETc[$i] += round((float)$etcValue, 1);
                }
                
                if ($hfValue !== "NaN" && is_numeric($hfValue)) {
                    $sumsHf[$i] += round((float)$hfValue, 1);
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
            $result[] = $minsTmin[$i] !== PHP_FLOAT_MAX ? $minsTmin[$i] : "NaN";
            $result[] = $maxsTmax[$i] !== PHP_FLOAT_MIN ? $maxsTmax[$i] : "NaN";
            $result[] = $countsT[$i] > 0 ? round($sumsT[$i] / $countsT[$i], 1) : "NaN";
            $result[] = $sumsETc[$i] > 0 ? round($sumsETc[$i], 1) : "NaN";
            $result[] = $sumsHf[$i] != 0 ? round($sumsHf[$i], 1) : "NaN";
            $result[] = $lastVcc[$i] ?: "NaN";
        }
        
        return $result;
    }

    private function sensorsDiscovery($data) {
        $settings = $this->getSettings();
        $actualize = true;
        $length = count($data);
        for ($i = 0; $i < $length; $i++) {
            $idx = "S$i";
            if (isset($data[$i]) && strpos($data[$i], '0x') === 0) {
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
        
        // Llamar a alertas.php en segundo plano
        $alertUrl = "https://dtaamerica.com/WS/alertas.php?$queryString";
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $alertUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 1);
        curl_setopt($ch, CURLOPT_NOSIGNAL, 1);
        curl_exec($ch);
        curl_close($ch);
        
        // $this->escribirLog("Lanzado alertas.php en segundo plano para sistema: $systemId");
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
    if (!isset($_GET['id']) || empty($_GET['id'])) {
        http_response_code(400);
        echo "Error: Falta el parámetro 'id' del sistema";
        exit;
    }
    
    $updater = new DatabaseUpdater($_GET['id']);
    $updater->processData();
    
} catch (Exception $e) {
    error_log("Error en updateDB.php: " . $e->getMessage());
    http_response_code(500);
    echo "Error: " . $e->getMessage();
}

?>
