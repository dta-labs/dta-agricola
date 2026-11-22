<?php
declare(strict_types=1);

/**
 * updateNeveraDB.php — procesa las lecturas de los sistemas "Nevera" e "Invernadero"
 * (3 valores por sensor) y las agrega directamente a logs (no usan dayLogs).
 *
 * data=[...] → registro nuevo en logs (con lo, si llega).
 * data=[]    → si ya hay un registro en logs: se actualiza su date y su lo; si no hay ninguno, se crea uno vacío.
 * lo = ciclos que el gateway lleva sin recibir de cada sensor (negativo = sin datos).
 */
class NeveraDbUpdater {
    private FirebaseClient $db;
    private Request $req;
    private string $id;
    private object $settings;
    private string $date;

    public function __construct(string $id, Request $req, FirebaseClient $db, ?object $settings = null, ?LocalClock $clock = null) {
        $this->id = $id;
        $this->req = $req;
        $this->db = $db;
        $this->settings = $settings ?? SystemSettings::load($db, $id);
        $this->date = ($clock ?? SystemSettings::clock($this->settings))->logDate();
    }

    public function process(): void {
        if (!$this->req->has('data')) return;
        $raw = $this->req->get('data');

        if (SystemSettings::isDiscoveryMode($this->settings)) {
            if ($raw === '[]') return;
            $this->db->put("systems/{$this->id}/settings", SensorDiscovery::applyNevera($this->settings, SensorDiscovery::tokens($raw)));
            return;
        }

        $path = "systems/{$this->id}/logs";
        if ($raw === '[]') {
            $last = $this->db->getLastEntry($path);
            if ($last === null) {
                $this->db->post($path, $this->buildRecord(array_fill(0, SensorDataParser::forNevera()->totalValues(), NAN)));
                return;
            }
            $changes = ['date' => $this->date];
            $lo = $this->req->lo();
            if ($lo !== null) $changes['lo'] = $lo;
            $this->db->patch("$path/{$last['key']}", $changes);
            return;
        }

        $data = SensorDataParser::forNevera()->parse($raw);
        $this->db->post($path, $this->buildRecord($data));
    }

    public function buildRecord(array $data): array {
        $values = array_map(function (float $v) {
            $v = Util::cleanReading($v);
            return is_nan($v) ? null : $v;
        }, $data);
        $record = [
            'date'      => $this->date,
            'dataRaw'   => json_encode($values),
            'signal'    => $this->req->get('si'),
            'qos'       => $this->req->get('qos'),
            'reception' => $this->req->get('rx'),
        ];
        $lo = $this->req->lo();
        if ($lo !== null) $record['lo'] = $lo;
        return $record;
    }
}
