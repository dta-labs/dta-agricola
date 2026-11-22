<?php
declare(strict_types=1);

/**
 * updateSensorDB.php — procesa las lecturas de un sistema "Sensor".
 *
 * data=[...]  → valida, completa faltantes y guarda en dayLogs. Las alertas las mandan las Cloud Functions
 *               de Firebase (FCM) al crearse el registro.
 * data=[]     → sin registros en dayLogs: crea uno vacío. Si el último registro es vacío: solo actualiza su
 *               date. Si el último registro tiene valores: no hace nada. (No se rellena nada.)
 * operationMode="0" → modo descubrimiento de sensores.
 */
class SensorDbUpdater {

    private FirebaseClient $db;
    private WeatherService $weather;
    private Request $req;
    private string $id;
    private object $settings;
    private LocalClock $clock;
    private string $date;
    /** @var array|null  dayLogs leídos una sola vez por petición */
    private $dayLogs = false;
    private ?SensorFallback $fallback = null;

    public function __construct(string $id, Request $req, FirebaseClient $db, WeatherService $weather, ?object $settings = null, ?LocalClock $clock = null) {
        $this->id = $id;
        $this->req = $req;
        $this->db = $db;
        $this->weather = $weather;
        $this->settings = $settings ?? SystemSettings::load($db, $id);
        $this->clock = $clock ?? SystemSettings::clock($this->settings);
        $this->date = $this->clock->logDate();
    }

    public function process(): void {
        if (!$this->req->has('data')) return;
        $raw = $this->req->get('data');

        if (SystemSettings::isDiscoveryMode($this->settings)) {
            $updated = SensorDiscovery::applySensor($this->settings, SensorDiscovery::tokens($raw));
            if ($updated !== null) $this->db->put("systems/{$this->id}/settings", $updated);
            return;
        }

        if ($raw === '[]') {
            $this->processEmptyData();
            return;
        }

        $data = SensorDataParser::forSensor()->parse($raw);
        $data = $this->replaceUnmeasuredHumidity($data);
        $data = $this->fallback()->fill($data);
        $this->saveDayLog($this->buildRecord($data));
    }

    /** @return array<string, object> */
    private function dayLogs(): array {
        if ($this->dayLogs === false) {
            $res = $this->db->get("systems/{$this->id}/dayLogs");
            $this->dayLogs = is_object($res) ? get_object_vars($res) : [];
        }
        return $this->dayLogs;
    }

    private function lastDayLogDate(): ?string {
        $logs = $this->dayLogs();
        if (!$logs) return null;
        $last = end($logs);
        return is_object($last) && isset($last->date) ? (string) $last->date : null;
    }

    /**
     * data=[] (el gateway no tiene lecturas):
     *   - sin registros en dayLogs                   → crea un registro vacío (todo NAN);
     *   - el último registro es de otro día          → cambio de fecha: resumen del día anterior en logs (como
     *                                                  siempre), se vacía dayLogs y se crea el vacío de hoy;
     *   - mismo día y el último registro es vacío    → solo actualiza su date;
     *   - mismo día y el último registro tiene valores → no hace nada.
     */
    private function processEmptyData(): void {
        $empty = $this->record($this->date, array_fill(0, DayLogAggregator::SENSORS * DayLogAggregator::VPS, 'NAN'));
        $logs = $this->dayLogs();
        if (!$logs) {
            $this->db->post("systems/{$this->id}/dayLogs", $empty);
            return;
        }

        $keys = array_keys($logs);
        $lastKey = (string) end($keys);
        $last = $logs[$lastKey];
        $lastDate = is_object($last) && isset($last->date) ? (string) $last->date : '';

        if (substr($lastDate, 0, 8) !== substr($this->date, 0, 8)) {
            $this->saveDayLog($empty);   // cambio de fecha: resumen + dayLogs nuevo con el registro vacío
            return;
        }
        if (self::isEmptyRecord($last)) {
            $this->db->put("systems/{$this->id}/dayLogs/$lastKey/date", $this->date);
        }
        // REQ-147: el lo del gateway se actualiza siempre en el ultimo registro del dia (aunque no haya lecturas)
        $lo = $this->req->lo();
        if ($lo !== null) $this->db->put("systems/{$this->id}/dayLogs/$lastKey/lo", $lo);
    }

    /** Registro sin ningún valor numérico en dataRaw (todo NAN/NaN/null/vacío). */
    public static function isEmptyRecord($log): bool {
        $raw = is_object($log) ? ($log->dataRaw ?? null) : null;
        $values = is_string($raw) ? json_decode($raw, true) : null;
        if (!is_array($values)) return false;
        foreach ($values as $v) {
            if (is_numeric($v)) return false;
        }
        return true;
    }

    /** HR = -1 (el sensor no mide HR) se trata como valor faltante y sigue el respaldo normal. */
    private function replaceUnmeasuredHumidity(array $data): array {
        $count = SystemSettings::sensorCount($this->settings);
        for ($i = 0; $i < $count; $i++) {
            $k = $i * 4 + 1;
            if (isset($data[$k]) && $data[$k] === DTA_HR_NOT_MEASURED) {
                $data[$k] = NAN;   // faltante: promedio del mismo tipo → estación → OpenWeatherMap → Open-Meteo
            }
        }
        return $data;
    }

    private function fallback(): SensorFallback {
        return $this->fallback ??= new SensorFallback($this->settings, $this->weather, $this->clock);
    }

    public function buildRecord(array $data): array {
        $settings = $this->settings;
        $expanded = DayLogAggregator::expand($data, function (int $i, float $t, float $hr) use ($settings): float {
            $sensor = SystemSettings::sensor($settings, $i);
            [$lat, $lon] = $this->fallback()->coordinates($i);   // del sensor o, si no tiene, del sistema
            $weather = $sensor ? $this->weather->current($lat, $lon) : null;
            return Agronomy::etc($t, $hr, $weather, $sensor, $settings);
        });
        return $this->record($this->date, $expanded);
    }

    private function record(string $date, array $dataRaw, bool $withLo = true): array {
        $record = [
            'date'      => $date,
            'dataRaw'   => json_encode($dataRaw),
            'signal'    => $this->req->get('si'),
            'qos'       => $this->req->get('qos'),
            'reception' => $this->req->get('rx'),
        ];
        // REQ-147: lo = ciclos que el gateway lleva sin recibir de cada sensor (negativo = sin datos), como en neveras
        $lo = $this->req->lo();
        if ($withLo && $lo !== null) $record['lo'] = $lo;
        return $record;
    }

    /** REQ-146: tipo de cada sensor (S0..S9) para el resumen del día. */
    private function sensorTypes(): array {
        $types = [];
        for ($i = 0; $i < DayLogAggregator::SENSORS; $i++) {
            $sensor = SystemSettings::sensor($this->settings, $i);
            $types[$i] = $sensor && isset($sensor->type) ? (string) $sensor->type : '';
        }
        return $types;
    }

    /**
     * Mismo día → se agrega a dayLogs.
     * Cambio de día → resumen del día anterior a logs, se vacía dayLogs y se agrega el nuevo.
     */
    private function saveDayLog(array $record): void {
        $path = "systems/{$this->id}/dayLogs";
        $lastDate = $this->lastDayLogDate();
        $logs = $this->dayLogs();

        if (!$logs || ($lastDate !== null && substr($lastDate, 0, 8) === substr($record['date'], 0, 8))) {
            $this->db->post($path, $record);
            return;
        }

        $lastDay = $lastDate !== null ? substr($lastDate, 0, 8) : '';
        $summary = $this->record(($lastDay ?: date('Ymd')) . ' 0000am', DayLogAggregator::summarize($logs, $this->sensorTypes()), false);
        $this->db->delete($path);
        $this->db->post("systems/{$this->id}/logs", $summary);
        $this->db->post($path, $record);
    }
}
