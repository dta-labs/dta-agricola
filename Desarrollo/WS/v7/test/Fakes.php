<?php
declare(strict_types=1);

/** Firebase en memoria: registra escrituras y responde lecturas preparadas. */
class FakeFirebase extends FirebaseClient {
    public array $data = [];
    public array $calls = [];

    public function __construct(array $data = []) {
        parent::__construct(new HttpClient(), 'https://fake');
        $this->data = $data;
    }
    public function get(string $path, array $query = []) {
        $this->calls[] = ['GET', $path];
        return array_key_exists($path, $this->data) ? json_decode(json_encode($this->data[$path])) : null;
    }
    public function put(string $path, $value): bool { $this->calls[] = ['PUT', $path, $value]; return true; }
    public function post(string $path, $value): bool { $this->calls[] = ['POST', $path, $value]; return true; }
    public function delete(string $path): bool { $this->calls[] = ['DELETE', $path]; return true; }

    public function writes(): array {
        return array_values(array_filter($this->calls, fn($c) => $c[0] !== 'GET'));
    }
}

/** Sin red: no hay datos meteorológicos. */
class FakeWeather extends WeatherService {
    public function current($lat, $lon): ?array { return null; }
    public array $stations = [];
    public ?array $owm = null;
    public array $owmCalls = [];
    public function openWeather($lat, $lon): ?array {
        $this->owmCalls[] = [$lat, $lon];
        return $this->owm;
    }
    public array $stationCalls = [];
    public function stationReading(array $station, DateTime $now): ?array {
        $this->stationCalls[] = $station['region'] . '/' . $station['id'];
        return $this->stations[$station['id']] ?? null;
    }
}

/** Guarda los comandos en lugar de ejecutarlos. */
class RecordingAsync extends AsyncCaller {
    public array $commands = [];
    public function __construct() {
        parent::__construct(function (string $cmd) { $this->commands[] = $cmd; });
    }
}

function fixedClock(string $utc, int $zone = 0): LocalClock {
    return new LocalClock($zone, fn() => new DateTime($utc, new DateTimeZone('UTC')));
}
