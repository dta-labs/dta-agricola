<?php
declare(strict_types=1);

/**
 * updateNeveraDB.php — procesa las lecturas de un sistema "Nevera"
 * (3 valores por sensor: HR, T, Vcc) y las agrega a logs.
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
        if ($raw === '[]') return;

        if (SystemSettings::isDiscoveryMode($this->settings)) {
            $this->db->put("systems/{$this->id}/settings", SensorDiscovery::applyNevera($this->settings, SensorDiscovery::tokens($raw)));
            return;
        }

        $data = SensorDataParser::forNevera()->parse($raw);
        $this->db->post("systems/{$this->id}/logs", $this->buildRecord($data));
    }

    public function buildRecord(array $data): array {
        $values = array_map(function (float $v) {
            $v = Util::cleanReading($v);
            return is_nan($v) ? null : $v;
        }, $data);
        return [
            'date'      => $this->date,
            'dataRaw'   => json_encode($values),
            'signal'    => $this->req->get('si'),
            'qos'       => $this->req->get('qos'),
            'reception' => $this->req->get('rx'),
        ];
    }
}
