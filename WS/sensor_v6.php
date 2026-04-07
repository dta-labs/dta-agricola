<?php
// if (function_exists('opcache_invalidate')) { opcache_invalidate(__FILE__, true); }
declare(strict_types=1);

class SensorSystem {
    private $baseUrl;
    private $settings = null;
    private $users = null;
    private $curlHandle;
    private $agroCache = []; // Array de cache por ubicación

    #region 0.- Funciones básicas

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
        $headers = ['Content-Type: application/json'];
        
        // Si es PATCH, necesitamos agregar el método en un encabezado especial
        if ($method === 'PATCH') {
            $headers[] = 'X-HTTP-Method-Override: PATCH';
            $method = 'POST'; // Usamos POST para PATCH
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
        // $this->escribirLog("HTTP $method $url - Código: $httpCode");
        
        return $httpCode >= 200 && $httpCode < 300 ? json_decode($response) : null;
    }

    private function getSettings(): object {
        if ($this->settings === null) {
            $this->settings = $this->executeRequest($this->baseUrl . "settings.json");
            if ($this->settings === null) {
                // Si no hay settings, devolver un objeto con valores por defecto
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
            } else {
                // Completar settings faltantes con valores por defecto
                if (!isset($this->settings->operationMode)) {
                    $this->settings->operationMode = 1;
                }
                if (!isset($this->settings->sensors)) {
                    $this->settings->sensors = (object)[
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
                    ];
                } elseif (!isset($this->settings->sensors->sensorNumber)) {
                    $this->settings->sensors->sensorNumber = 10;
                }
            }
        }
        return $this->settings;
    }

    #endregion 0.- Funciones básicas

    #region 1.- Enviar configuración al dispositivo

    public function formatSettingsForDevice(): string {
        // $this->escribirLog("formatSettingsForDevice...");
        $settings = $this->getSettings();
        $sendData = "\"{$settings->operationMode}";
        for ($i = 0; $i < $settings->sensors->sensorNumber; $i++) {
            $idx = "S$i";
            $sendData .= "\"{$settings->sensors->$idx->id}";
        }
        return $sendData . "\"";
    }

    #endregion 1.- Enviar configuración al dispositivo

    #region 2.- Procesar datos

    public function processData(): void {
        // $this->escribirLog("processData...");
        if (isset($_GET['data']) && $_GET['data'] !== '[]') {
            $this->processRegularData();
        } else {
            $this->processEmptyData();
        }
    }

    private function processRegularData() {
        $settings = $this->getSettings();
        $data = $this->fillEmptyData($_GET['data']);
        if ($settings->operationMode && ($settings->operationMode == "" || $settings->operationMode == "0" || $settings->operationMode == 0)) {
            $this->sensorsDiscovery($data);
        } else {
            $this->updateLog($data);
            $this->updateActualData($data);
            $this->verifyAlerts($data);
        }
    }
    
    private function fillEmptyData($rawData): array {
        $rawData = str_replace('[,', '[NaN,NaN,NaN,NaN,', $rawData);
        $rawData = preg_replace_callback('/,{2,}/', function($matches) {    // Reemplazar secuencias de comas vacías por NaN
            $count = strlen($matches[0]) - 1;                               // Número de huecos
            $nanBlock = implode(',', array_fill(0, $count * 4, 'NaN'));
            return ',' . $nanBlock . ',';
        }, $rawData);
        $rawData = str_replace(',]', ',NaN,NaN,NaN,NaN]', $rawData);
        $rawData = trim($rawData, '[]');                                    // Limpiar corchetes
        $data = explode(',', $rawData);                                     // Convertir a array
        $numericData = array_map(function($v) {                             // Convertir cada valor a número, usando NAN cuando no sea posible
            if ($v === 'NaN') {
                return NAN;                                                 // constante de PHP
            }
            return is_numeric($v) ? (float)$v : NAN;
        }, $data);
        return $numericData;
    }

    private function sensorsDiscovery($data) {
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
            $settings->sensors->sensorNumber = $length;       // Actualizar el número de sensores
            $this->settings = $settings;                      // Actualizar la caché local
            $this->updateSettings($settings);
        }
    }

    private function updateLog(array $data): void {
        // $this->escribirLog("updateLog...");
        $logData = $this->crearLogData($data);
        $dayLogsFile = $this->baseUrl . "dayLogs.json";
        if ($this->esPrimerRegistroDelDia($dayLogsFile)) {
            // $this->escribirLog("Es primer registro del día...");
            $this->procesarPrimerRegistro($dayLogsFile, $logData);
        } else {
            // $this->escribirLog("Adicionar nuevo registro diario...");
            $currentDate = $this->getCurrentDate($logData['date']);
            $lastDate = $this->obtenerUltimaFechaDia($dayLogsFile);
            // $this->escribirLog("currentDate: " . $currentDate . " ~ lastDate: " . $lastDate);
            if ($this->esMismoDia($currentDate, $lastDate)) {
                // $this->escribirLog("Procesar mismo día... ");
                $this->procesarMismoDia($dayLogsFile, $logData);
            } else {
                // $this->escribirLog("Procesar cambio de día... ");
                $this->procesarCambioDia($dayLogsFile, $logData, $lastDate);
            }
        }
    }
    
    private function updateActualData(array $data) {
        $settings = $this->getSettings();
        $date = $this->getDateTime($this->getLocalZone())->format('Ymd hia');
        $data = array_map(function($value) {       // Redondear a 1 decimal, manejar NAN y -127
            if (is_nan($value) || $value === -127.0) return NAN;
            return round($value, 1);
        }, array: $data);                                                  // [Ms, Hr, T, Vcc]
        $estacion = $this->getFilterObject($settings->key);
        $limit = $settings->sensors->sensorNumber;
        for ($i = 0; $i < $limit; $i++) {
            $l = ($limit - 1) * 4;
            $data[$i * 4] = $this->getValidOrFallbackValue($data, $i * 4, 0, $l, $date, null);
            $data[$i * 4 + 1] = $this->getValidOrFallbackValue($data, $i * 4 + 1, 1, $l, $date, $estacion);
            $data[$i * 4 + 2] = $this->getValidOrFallbackValue($data, $i * 4 + 2, 2, $l, $date, $estacion);
            $data[$i * 4 + 3] = $this->getValidOrFallbackValue($data, $i * 4 + 3, 3, $l, $date, null);
        }
        $dataClean = array_map(function($v) {
            return is_nan($v) ? -99 : $v;
        }, $data);
        $actualDataFile = [
            'date' => $date,
            'dataRaw' => $dataClean
        ];
        $this->executeRequest($this->baseUrl . "actualData.json", 'PUT', json_encode($actualDataFile));
    }

    private function getValidOrFallbackValue($data, $i, $j, $limit, $date, $estacion) {
        if (is_nan($data[$i])) {
            $indices = range($j, $limit + $j, 4); // genera [j, j+4, j+8, ..., j+36]
            $valores = array_map(fn($i) => $data[$i] ?? NAN, $indices);
            $valoresValidos = array_filter($valores, fn($v) => is_numeric($v) && !is_nan($v));
            if (count($valoresValidos) > 0) {
                return array_sum($valoresValidos) / count($valoresValidos);
            } 
            $settings = $this->getSettings();
            $idx = "S" . (($i - $j) / 4);
            $sensorLat = $settings->sensors->{$idx}->latitude;
            $sensorLon = $settings->sensors->{$idx}->longitude;
            if ($j === 0) return $this->getSoilMoisturePoint($sensorLat, $sensorLon);       // Ms
            if ($j === 3) return 2.7;                                                                 // Vcc
            if ($j === 1 || $j === 2) {
                if ($estacion) {
                    $est = $estacion['est'];
                    $meteo = $this->executeRequest("https://dtaamerica.com/ws/estaciones.php?fi=$date&ff=$date&tp=Hora&re=DTA&es=$est");
                    if ($j === 1 && isset($meteo['hmin'])) return $meteo['hmin'];                     // Hmin Estación meteorológica
                    if ($j === 2 && isset($meteo['tprom'])) return $meteo['tprom'];                   // Tprom Estación meteorológica
                }
                $response = $this->getTHData($sensorLat, $sensorLon);
                if ($j === 1 && isset($response[0])) return $response[0];                             // H2M open-meteo.com
                if ($j === 2 && isset($response[1])) return $response[1];                             // T2M open-meteo.com
            }
            return NAN;
        }
        return $data[$i];
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
            ['lat' => '28.6008204', 'lon' => '-107.5425449', 'est' => '_gue', 'sys' => '24530094119' ],
            ['lat' => '28.60248', 'lon' => '-107.54051', 'est' => '_gue', 'sys' => '24530080423' ],
            ['lat' => '28.4894', 'lon' => '-107.441965', 'est' => '_mmi', 'sys' => '24530094143' ],
            ['lat' => '28.4894383', 'lon' => '-107.4418783', 'est' => '_mmi', 'sys' => '24530094150' ],
            ['lat' => '28.60248', 'lon' => '-107.54051', 'est' => '_gue', 'sys' => '24530080423' ],
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

    private function getTHData($lat, $lon) {
        $url = "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&hourly=temperature_2m,relative_humidity_2m&timezone=America/Chihuahua";
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);      // máximo 10 segundos
        $response = curl_exec($ch);
        $locationKey = round((float)$lat, 4) . ',' . round((float)$lon, 4);
        if ($response === false) {
            error_log("Open-Meteo API Error: " . curl_error($ch));
            return isset($this->agroCache[$locationKey]) ? [null, $this->agroCache[$locationKey]['temp'] ?? null] : [null, null];          // [Hr, Temp]
        }
        $data = json_decode($response, true);
        $times  = $data['hourly']['time'] ?? [];
        $temps  = $data['hourly']['temperature_2m'] ?? [];
        $humids = $data['hourly']['relative_humidity_2m'] ?? [];
        date_default_timezone_set("America/Chihuahua");
        $currentHour = date("Y-m-d\TH:00");
        $index = array_search($currentHour, $times);
        if ($index !== false && isset($temps[$index]) && isset($humids[$index])) {
            return [$humids[$index], $temps[$index]];                                           // [Hr, Temp]
        }
        // Si no encontramos la hora actual, usar la más cercana
        $closestIndex = $this->findClosestHourIndex($times, $currentHour);
        if ($closestIndex !== null && isset($temps[$closestIndex]) && isset($humids[$closestIndex])) {
            return [$humids[$closestIndex], $temps[$closestIndex]];                             // [Hr, Temp]
        }
        return isset($this->agroCache[$locationKey]) ? [null, $this->agroCache[$locationKey]['temp'] ?? null] : [null, null];    // [Hr, Temp]
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
        $resp = file_get_contents($soilUrl);
        if ($resp === false) return null;                           // Error de conexión
        $soilData = json_decode($resp, true);
        if ($soilData === null) return null;                        // Error al decodificar
        $sm = $soilData['moisture']                                 // Buscar humedad en diferentes posibles claves
            ?? ($soilData['soil_moisture'] 
            ?? ($soilData['volumetric_water_content'] ?? null));
        if ($sm !== null && is_numeric($sm) && $sm < 1) {    // Convertir de fracción a porcentaje si es < 1
            $sm = $sm * 100.0;
        }
        
        // Almacenar datos de temperatura y humedad para uso futuro (cache por ubicación)
        $locationKey = round((float)$lat, 4) . ',' . round((float)$lon, 4);
        $tempKelvin = $soilData['t0'] ?? null;
        // $tempKelvin = $soilData['t10'] ?? $soilData['t0'] ?? null;
        $temp = $tempKelvin !== null ? $tempKelvin - 273.15 : null;
        
        $this->agroCache[$locationKey] = [
            'temp' => $temp,
            'humidity' => null, // No disponible en endpoint soil
            'timestamp' => time()
        ];
        
        return is_numeric($sm) ? floatval($sm) : null;
    }

    private function crearLogData(array $data): array {
        $date = $this->getDateTime($this->getLocalZone())->format('Ymd hia');
        $data = array_map(function($value) {                                           // Redondear a 1 decimal, manejar NAN y -127
            if (is_nan($value) || $value === -127.0) return NAN;
            return round($value, 1);
        }, $data);
        $totalSensors = 10;                                                                   // 10 sensores
        $valuesPerSensor = 6;                                                                 // [Ms, Hr, T, Vcc, Lat, Lng]
        $expandedData = [];
        for ($i = 0; $i < $totalSensors; $i++) {
            $msIndex  = $i * $valuesPerSensor;                                                // Ms
            $hrIndex  = $i * $valuesPerSensor + 1;                                            // Hr
            $tIndex   = $i * $valuesPerSensor + 2;                                            // T
            $vccIndex = $i * $valuesPerSensor + 3;                                            // Vcc
            $msValue  = $data[$msIndex]  ?? NAN;
            $hrValue  = $data[$hrIndex]  ?? NAN;
            $tValue   = $data[$tIndex]   ?? NAN;
            $vccValue = $data[$vccIndex] ?? NAN;
            $etc = (!is_nan($tValue) && !is_nan($hrValue)) ? round($this->calcularETo($tValue, $hrValue), 1) : NAN; // Calcular ETc
            $hf = !is_nan($tValue) ? round($this->calcularHorasFrio($tValue), 1) : NAN;       // Calcular Hf
            $expandedData[] = (string)$msValue;                                               // Array expandido: [Ms, Hr, Tmin, Tmax, T, ETc, Hf, Vcc]
            $expandedData[] = (string)$hrValue;                                               // Ms
            $expandedData[] = (string)$tValue;                                                // Tmin
            $expandedData[] = (string)$tValue;                                                // Tmax
            $expandedData[] = (string)$tValue;                                                // T
            $expandedData[] = (string)$etc;                                                   // ETc
            $expandedData[] = (string)$hf;                                                    // Hf
            $expandedData[] = (string)$vccValue;                                              // Vcc
        }
        return [
            'date' => $date,
            'dataRaw' => json_encode($expandedData),
            'signal' => $_GET['si'] ?? '',
            'qos' => $_GET['qos'] ?? '',
            'reception' => in_array($_GET['rx'] ?? '', ['Ok', 'Er', 'ini']) ? $_GET['rx'] : ''
        ];
    }

    private function esPrimerRegistroDelDia(string $dayLogsFile): bool {
        $response = $this->executeRequest($dayLogsFile);
        return $response === null;
    }
    
    private function procesarPrimerRegistro(string $dayLogsFile, array $logData): void {
        $this->executeRequest($dayLogsFile, 'POST', json_encode($logData));
        // $this->escribirLog("Primer registro del día - guardado en dayLogs.json");
    }
    
    private function getCurrentDate(string $fullDate): string {
        return substr($fullDate, 0, 8);
    }
    
    private function obtenerUltimaFechaDia(string $dayLogsFile): ?string {
        $response = $this->executeRequest($dayLogsFile);
        // $this->escribirLog("Response: " . json_encode($response));
        if ($response === null) return null;
        $dayLogs = json_decode(json_encode($response), true);
        if (empty($dayLogs)) return null;
        $lastLog = end($dayLogs);
        if (!isset($lastLog['date'])) {
            return null; // o ajusta según tu estructura
        }
        return substr($lastLog['date'], 0, 8);
    }

    private function esMismoDia(string $currentDate, ?string $lastDate): bool {
        return $lastDate !== null && $currentDate === $lastDate;
    }
    
    private function procesarMismoDia(string $dayLogsFile, array $logData): void {
        $this->executeRequest($dayLogsFile, 'POST', json_encode($logData));
        // $this->escribirLog("Mismo día - guardado en dayLogs.json");
    }
    
    private function procesarCambioDia(string $dayLogsFile, array $logData, ?string $lastDate): void {
        // $this->escribirLog("Cambio de día detectado - calculando promedio");
        $dayLogs = $this->leerDayLogs($dayLogsFile);
        $promedioDataRaw = $this->calcularPromedioDataRaw($dayLogs);
        $this->executeRequest($dayLogsFile, 'DELETE');                                          // Eliminar dayLogs.json completo
        // $this->escribirLog("dayLogs.json eliminado");
        $summaryLogData = $this->crearRegistroPromedio($lastDate ?? '', $promedioDataRaw);      // Crear registro promedio
        $this->guardarEnLogsPrincipal($summaryLogData);                                         // Guardar promedio en logs.json principal
        $this->executeRequest($dayLogsFile, 'POST', json_encode($logData));                     // Iniciar nuevo día con el registro actual
        // $this->escribirLog("Nuevo día iniciado - registro actual guardado en dayLogs.json");
    }

    private function processEmptyData() {
        // $data80 = array_fill(0, 80, NAN);
        // $this->updateLog($data80);
        $data40 = array_fill(0, 40, NAN);
        $this->updateActualData($data40);
        // $this->escribirLog("Datos vacíos recibidos");
    }

    #endregion 2.- Procesar datos

    #region 3.- Verificar Alertas

    private function verifyAlerts($data): void {
        $settings = $this->getSettings();
        $usersID = $this->getUsers(); 
        $dataSize = count($data);
        $length = $settings->sensors->sensorNumber ?? 0;
        if ($length == 0) {
            return;
        }
        for ($i = 0; $i < $settings->sensors->sensorNumber; $i++) {
            $idx = "S$i";
            $sensor = $settings->sensors->$idx;
            $sensorType = $sensor->type ?? "SHT4";
            $sensorLength = ($sensorType == "SHT4" || $sensorType == "WM") ? 4 : (($sensorType == "STH" || $sensorType == "FlP") ? 3 : 1);
            $sensorID = $sensor->alias ?? $sensor->id;
            if ($sensorID !== '0x0') {
                $notificationId = ($settings->name ?? $settings->key) . " - " . $sensorID;
                $minHumThreshold = $sensor->h->minValue ?? 30;
                $maxHumThreshold = $sensor->h->maxValue ?? 80;
                $notifyH = $sensor->h->notify ?? false;
                $value = $data[$i * $sensorLength] ?? 'NaN';
                if($value !== 'NaN' && isset($sensor->h) && $notifyH) {
                    $this->escribirLog("Alerta Humedad...");
                    $this->sendPushNotification($usersID, "Humedad", $notificationId, $value, $minHumThreshold, $maxHumThreshold);
                }
                $minTempThreshold = $sensor->t->minValue ?? 2;
                $maxTempThreshold = $sensor->t->maxValue ?? 30;
                $notifyT = $sensor->t->notify ?? false;
                $value = $data[$i * $sensorLength + 2] ?? 'NaN';
                if($value !== 'NaN' && isset($sensor->t) && $notifyT) {
                    $this->escribirLog("Alerta Temperatura...");
                    $this->sendPushNotification($usersID, "Temperatura", $notificationId, $value, $minTempThreshold, $maxTempThreshold);
                }
            }
        }
    }

    private function sendPushNotification($usersID, $txt, $sensorID, $value, $minThreshold, $maxThreshold): void {
        if ($value !== 'NaN' && $value !== '-127' && $value > -127 && $value !== '' && $minThreshold !== 'null' && $maxThreshold !== 'null') {
            if ($value <= $minThreshold || $maxThreshold <= $value) { 
                $msg = "Alerta " . ($value <= $minThreshold ? "baja " : "alta ") . $txt; 
                foreach ($usersID as $user) {
                    $msg = "{$msg}: {$sensorID} [{$value}" . ($txt == 'Temperatura' ? '°C' : '%') . "]...";
                    $url = "https://dtaamerica.com/ws/push.php?user={$user}&txt=" . urlencode($msg);
                    $response = file_get_contents($url);
                }
            }
        }
    }

    #endregion 3.- Verificar Alertas

    #region 4.- Miscelaneas

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
            $usersData = []; // fallback por seguridad
        }
        $usersID = array_keys($usersData); 
        return $usersID;
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
    
    /**
     * Leer dayLogs.json (usando Firebase)
     */
    private function leerDayLogs(string $dayLogsFile): array {
        $response = $this->executeRequest($dayLogsFile);
        if ($response === null) {
            return [];
        }
        
        return is_object($response) ? get_object_vars($response) : [];
    }
    
    /**
     * Crear registro promedio
     */
    private function crearRegistroPromedio(string $lastDate, array $promedioDataRaw): array {
        return [
            'date' => ($lastDate ?: date('Ymd')) . ' 0000am',
            'dataRaw' => json_encode($promedioDataRaw),
            'signal' => $_GET['si'] ?? '',
            'qos' => $_GET['qos'] ?? '',
            'reception' => in_array($_GET['rx'] ?? '', ['Ok', 'Er', 'ini']) ? $_GET['rx'] : ''
        ];
    }
    
    /**
     * Guardar en logs.json principal
     */
    private function guardarEnLogsPrincipal(array $logData): void {
        $this->executeRequest(
            $this->baseUrl . "logs.json",
            'POST',
            json_encode($logData)
        );
    }
    
    /**
     * Calcular el promedio del campo dataRaw de todos los registros (usando objetos Firebase)
     * Estructura: 10 sensores × 8 valores [Ms, Hr, Tmin, Tmax, T, ETc, Hf, Vcc] = 80 elementos
     * Resultado: 10 sensores × 8 valores [Ms, Hr, Tmin, Tmax, T, ETc, Hf, Vcc] = 80 elementos
     */
    private function calcularPromedioDataRaw(array $dayLogs): array {
        if (empty($dayLogs)) {
            return [];
        }
        
        $totalSensors = 10; // Siempre 10 sensores
        $valuesPerSensor = 8; // [Ms, Hr, Tmin, Tmax, T, ETc, Hf, Vcc]
        
        // Inicializar arrays para acumular
        $sumsMs = array_fill(0, $totalSensors, 0);
        $sumsHr = array_fill(0, $totalSensors, 0);
        $sumsT = array_fill(0, $totalSensors, 0);
        $lastVcc = array_fill(0, $totalSensors, 0);
        $counts = array_fill(0, $totalSensors, 0);
        
        // Arrays para Tmin y Tmax (encontrar valores mínimos y máximos reales)
        $minsTmin = array_fill(0, $totalSensors, PHP_FLOAT_MAX);
        $maxsTmax = array_fill(0, $totalSensors, PHP_FLOAT_MIN);
        
        // Arrays para ETc y Hf (acumular directamente)
        $sumsETc = array_fill(0, $totalSensors, 0);
        $sumsHf = array_fill(0, $totalSensors, 0);
        
        foreach ($dayLogs as $log) {
            $dataRaw = json_decode($log->dataRaw, true);
            if (!is_array($dataRaw) || count($dataRaw) !== $totalSensors * $valuesPerSensor) {
                continue;
            }
            // $this->escribirLog("DataRaw: " . json_encode($dataRaw));
            
            for ($i = 0; $i < $totalSensors; $i++) {
                $msIndex = $i * $valuesPerSensor;     // Ms
                $hrIndex = $i * $valuesPerSensor + 1; // Hr
                $tminIndex = $i * $valuesPerSensor + 2; // Tmin
                $tmaxIndex = $i * $valuesPerSensor + 3; // Tmax
                $tIndex = $i * $valuesPerSensor + 4;  // T
                $etcIndex = $i * $valuesPerSensor + 5; // ETc
                $hfIndex = $i * $valuesPerSensor + 6;  // Hf
                $vccIndex = $i * $valuesPerSensor + 7; // Vcc
                
                // Obtener valores
                $msValue = $dataRaw[$msIndex] ?? "NaN";
                $hrValue = $dataRaw[$hrIndex] ?? "NaN";
                $tminValue = $dataRaw[$tminIndex] ?? "NaN";
                $tmaxValue = $dataRaw[$tmaxIndex] ?? "NaN";
                $tValue = $dataRaw[$tIndex] ?? "NaN";
                $etcValue = $dataRaw[$etcIndex] ?? "NaN";
                $hfValue = $dataRaw[$hfIndex] ?? "NaN";
                $vccValue = $dataRaw[$vccIndex] ?? "NaN";
                
                // Acumular Ms, Hr, T (ignorar NaN)
                if ($msValue !== "NaN" && is_numeric($msValue)) {
                    $sumsMs[$i] += round((float)$msValue, 1);
                    $counts[$i]++;
                }
                
                if ($hrValue !== "NaN" && is_numeric($hrValue)) {
                    $sumsHr[$i] += round((float)$hrValue, 1);
                }
                
                if ($tValue !== "NaN" && is_numeric($tValue)) {
                    $tValueFloat = round((float)$tValue, 1);
                    $sumsT[$i] += $tValueFloat;
                }
                
                // Encontrar Tmin y Tmax reales (no promediar)
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
                
                // Acumular ETc y Hf directamente
                if ($etcValue !== "NaN" && is_numeric($etcValue)) {
                    $sumsETc[$i] += round((float)$etcValue, 1);
                }
                
                if ($hfValue !== "NaN" && is_numeric($hfValue)) {
                    $sumsHf[$i] += round((float)$hfValue, 1); // Hf ahora puede ser decimal (0.5, 1.0, 0.0, -1.0)
                }
                
                // Guardar Vcc del último registro válido
                if ($vccValue !== "NaN" && is_numeric($vccValue)) {
                    $lastVcc[$i] = round((float)$vccValue, 1);
                }
            }
        }
        
        // Construir array final con todos los valores
        $result = [];
        for ($i = 0; $i < $totalSensors; $i++) {
            $result[] = $counts[$i] > 0 ? round($sumsMs[$i] / $counts[$i], 1) : "NaN";       // Ms promedio
            $result[] = $sumsHr[$i] > 0 ? round($sumsHr[$i] / $counts[$i], 1) : "NaN";       // Hr promedio
            $result[] = $minsTmin[$i] !== PHP_FLOAT_MAX ? $minsTmin[$i] : "NaN";        // Tmin real
            $result[] = $maxsTmax[$i] !== PHP_FLOAT_MIN ? $maxsTmax[$i] : "NaN";        // Tmax real
            $result[] = $sumsT[$i] > 0 ? round($sumsT[$i] / $counts[$i], 1) : "NaN";         // T promedio
            $result[] = $sumsETc[$i] > 0 ? round($sumsETc[$i], 1) : "NaN";           // ETc acumulado
            $result[] = $sumsHf[$i] != 0 ? round($sumsHf[$i], 1) : "NaN";              // Hf acumulado
            $result[] = $lastVcc[$i] ?: "NaN";                                               // Vcc último registro
        }
        
        return $result;
    }
    
    /**
     * Calcular Evapotranspiración de Referencia (ETo) usando fórmula simplificada
     * Basado en temperatura y humedad relativa
     */
    private function calcularETo(float $temp, float $hr): float {
        // Fórmula simplificada de Hargreaves
        // ETo = 0.0023 × (Tmean + 17.8) × (Tmax - Tmin)^0.5 × Ra
        
        // Para simplificar, usamos una versión basada en temperatura actual
        $tMean = $temp; // En realidad debería ser promedio diario
        $hrDecimal = $hr / 100; // Convertir humedad a decimal
        
        // Factor de radiación (simplificado)
        $ra = 0.408 * exp(0.051 * $tMean); // Estimación simplificada
        
        // Factor de presión de vapor
        $ea = $hrDecimal * 0.6108 * exp(17.27 * $tMean / ($tMean + 237.3));
        
        // ETo simplificado (mm/día)
        $eTo = 0.408 * $ra * (0.05 * $tMean) * (1 - $hrDecimal);
        
        // Redondear a 1 decimal y asegurar que no sea negativo
        return round(max(0, $eTo), 1);
    }

    /**
     * Calcular Horas Frío (Hf)
     * Reglas de cálculo:
     * +1/2 si la temperatura está entre -2°C y 0°C
     * +1 si la temperatura está entre 0°C y 7°C
     * 0 si la temperatura está entre 7° y 30°C
     * -1 si la temperatura es mayor a 30°C
     */
    private function calcularHorasFrio(float $temp): float {
        if (-2 <= $temp && $temp < 0) {
            return 0.5;  // +1/2 si está entre -2°C y 0°C
        } elseif (0 <= $temp && $temp < 7) {
            return 1.0;  // +1 si está entre 0°C y 7°C
        } elseif (7 <= $temp && $temp <= 30) {
            return 0.0;  // 0 si está entre 7° y 30°C
        } else { // $temp > 30
            return -1.0; // -1 si es mayor a 30°C
        }
    }

    public function escribirLog($mensaje) {
        $archivo = __DIR__ . '/log.txt'; // Usamos ruta absoluta
        $fechaHora = date('Y-m-d H:i:s');
        $entrada = "[{$fechaHora}] {$mensaje}\n";
        
        // Verificar si podemos escribir en el directorio
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

    private function updateSettings(object $settings): void {
        $this->executeRequest(
            $this->baseUrl . "settings.json",
            'PUT',
            json_encode($settings)
        );
    }

    #endregion 4.- Miscelaneas

}

    #region 5.- Programa principal - solo ejecutar si se accede directamente al archivo

// if (basename($_SERVER['PHP_SELF']) === 'sensor_v6.php') {
    try {
        // Verificar que se proporcionó el ID del sistema
        if (!isset($_GET['id']) || empty($_GET['id'])) {
            http_response_code(400);
            echo "Error: Falta el parámetro 'id' del sistema";
            exit;
        }
        
        $system = new SensorSystem($_GET['id']);
        $urlCompleta = "http://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];     // URL completa
        $system->escribirLog($urlCompleta);
        print_r($system->formatSettingsForDevice());                                    // Enviar configuración al dispositivo
        $system->processData();                                                         // Procesar datos si están presentes    
    } catch (Exception $e) {
        error_log("Error: " . $e->getMessage());
        http_response_code(500);
        echo "Error: " . $e->getMessage();
    }
// }

    #endregion 5.- Programa principal - solo ejecutar si se accede directamente al archivo

?>
