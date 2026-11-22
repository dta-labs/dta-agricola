<?php
declare(strict_types=1);
use PHPUnit\Framework\TestCase;

final class StationTest extends TestCase {
    private function now(string $local): DateTime {
        return new DateTime($local, new DateTimeZone('UTC'));
    }

    /** Respuesta real de estaciones.php (fi=2026-04-05&ff=2026-04-07&es=_osm) + renglones de resumen. */
    private function sample(): array {
        $row = fn($f, $tp, $hmin) => ['estacion' => 'Óscar Soto Maynez', 'fecha' => $f, 'tmax' => '25.7', 'tmin' => '4.2',
            'tprom' => $tp, 'hmax' => '78.1', 'hmin' => $hmin, 'rad' => '198.3', 'pret' => '0.0', 'eto' => '3.92'];
        return [$row('2026-04-05', '14.8', '18.7'), $row('2026-04-06', '14.9', '29.2'), $row('2026-04-07', '15.5', '21.2')];
    }

    /** Lo que devuelve cuando no hay datos en el rango. */
    private function emptyResponse(): array {
        $sum = fn($n) => ['estacion' => $n, 'fecha' => '0.00', 'tmax' => '', 'tmin' => '', 'tprom' => '0.00',
            'hmax' => '0.00', 'hmin' => '', 'rad' => '0.00', 'pret' => '0.00', 'eto' => ''];
        return [$sum('Promedio / Totales'), $sum('Maximo'), $sum('Minimo')];
    }

    public function testTodaysRow(): void {
        $r = WeatherService::pickStationRow($this->sample(), $this->now('2026-04-07 15:00'));
        $this->assertSame(['hr' => 21.2, 't' => 15.5, 'fecha' => '2026-04-07'], $r);
    }

    public function testYesterdayIsAcceptedWhenTodayIsNotPublishedYet(): void {
        $rows = array_slice($this->sample(), 0, 2);
        $this->assertSame('2026-04-06', WeatherService::pickStationRow($rows, $this->now('2026-04-07 09:00'))['fecha']);
    }

    public function testOlderDataIsIgnored(): void {
        $this->assertNull(WeatherService::pickStationRow($this->sample(), $this->now('2026-04-10 09:00')));
    }

    public function testSummaryRowsAreNeverUsed(): void {
        // tprom "0.00" de "Promedio / Totales" no debe convertirse en 0 °C
        $this->assertNull(WeatherService::pickStationRow($this->emptyResponse(), $this->now('2026-11-20 14:00')));
        $rows = array_merge($this->sample(), $this->emptyResponse());
        $this->assertSame(15.5, WeatherService::pickStationRow($rows, $this->now('2026-04-07 14:00'))['t']);
    }

    public function testFutureAndInvalidDatesAreSkipped(): void {
        $rows = $this->sample();
        $rows[] = ['fecha' => '2026-04-08', 'hmin' => '1', 'tprom' => '1'];
        $rows[] = ['fecha' => '2026-02-30', 'hmin' => '1', 'tprom' => '1'];
        $this->assertSame('2026-04-07', WeatherService::pickStationRow($rows, $this->now('2026-04-07 14:00'))['fecha']);
    }

    public function testRowsWithoutValuesAreSkipped(): void {
        $this->assertNull(WeatherService::pickStationRow([['fecha' => '2026-11-20', 'hmin' => '', 'tprom' => '-']], $this->now('2026-11-20 14:00')));
    }

    public function testRequestUsesIsoDates(): void {
        $http = new class extends HttpClient {
            public array $urls = [];
            public function request(string $m, string $url, ?string $b = null, array $h = [], ?int $t = null): ?array {
                $this->urls[] = $url;
                return ['status' => 200, 'body' => '[]'];
            }
        };
        $w = new WeatherService($http);
        $w->stationReading(['region' => 'NAMIQUIPA', 'id' => '_fac'], $this->now('2026-03-01 00:30'));
        $w->stationReading(['region' => 'NAMIQUIPA', 'id' => '_fac'], $this->now('2026-03-01 18:00'));   // misma estación y día: 1 sola consulta
        $this->assertCount(1, $http->urls);
        $this->assertStringContainsString('fi=2026-02-28&ff=2026-03-01', $http->urls[0]);
        $this->assertStringContainsString('tp=Hora', $http->urls[0]);
        $this->assertStringContainsString('re=NAMIQUIPA&es=_fac', $http->urls[0]);
    }

    public function testStationFromSettings(): void {
        $own = (object) ['key' => '24530080316', 'station' => (object) ['region' => 'GUERRERO', 'id' => '_mrc']];
        $this->assertSame(['region' => 'GUERRERO', 'id' => '_mrc'], SensorNetwork::stationFor($own));
        // texto de REQ-120 y objeto sin región: la región sale del catálogo
        $this->assertSame(['region' => 'GUERRERO', 'id' => '_lju'], SensorNetwork::stationFor((object) ['station' => '_lju']));
        $this->assertSame(['region' => 'CUSIHUIRIACHI', 'id' => '_lac'], SensorNetwork::stationFor((object) ['station' => (object) ['id' => '_lac']]));
        // sin station: tabla por key, con la región del catálogo
        $this->assertSame(['region' => 'NAMIQUIPA', 'id' => '_fac'], SensorNetwork::stationFor((object) ['key' => '24530080316']));
        // _mmi no está en el catálogo: sin región no se consulta
        $this->assertNull(SensorNetwork::stationFor((object) ['key' => '25331424856']));
        $this->assertNull(SensorNetwork::stationFor((object) ['key' => '999']));
    }

    public function testCatalogMatchesPwa(): void {
        $this->assertCount(29, StationCatalog::all());
        $this->assertSame(['id' => '_osm', 'name' => 'Óscar Soto Maynez', 'region' => 'NAMIQUIPA'], StationCatalog::find('_osm'));
    }

    public function testFallbackUsesStationBeforeOpenMeteo(): void {
        $settings = (object) ['key' => '24530080316', 'sensors' => (object) ['sensorNumber' => 1,
            'S0' => (object) ['id' => '0x1A', 'type' => 'SHT4', 'latitude' => 28.4, 'longitude' => -106.8]]];
        $w = new FakeWeather();
        $w->stations['_fac'] = ['hr' => 41.0, 't' => 12.3, 'fecha' => '2026-11-20'];
        $noNoise = fn(float $v) => $v;
        $out = (new SensorFallback($settings, $w, fixedClock('2026-11-20 20:00', -6), $noNoise))
            ->fill(array_merge([12.5, NAN, NAN, 3.7], array_fill(0, 36, NAN)));
        $this->assertSame([12.5, 41.0, 12.3, 3.7], array_slice($out, 0, 4));
    }

    public function testCatalogFromFirebaseShapes(): void {
        $expected = [
            ['id' => '_fac', 'name' => 'FACIATEC', 'region' => 'NAMIQUIPA'],
            ['id' => '_lju', 'name' => 'La Junta', 'region' => 'GUERRERO'],
        ];
        $j = fn(string $s) => json_decode($s);
        $this->assertSame($expected, StationCatalog::fromFirebase($j('[{"id":"_fac","name":"FACIATEC","region":"NAMIQUIPA"},{"id":"_lju","name":"La Junta","region":"GUERRERO"}]')));
        $this->assertSame($expected, StationCatalog::fromFirebase($j('{"_fac":{"estacion":"FACIATEC","region":"NAMIQUIPA"},"_lju":{"name":"La Junta","region":"GUERRERO"}}')));
        $this->assertSame($expected, StationCatalog::fromFirebase($j('{"NAMIQUIPA":{"_fac":"FACIATEC"},"GUERRERO":[{"id":"_lju","name":"La Junta"}]}')));
        $this->assertSame([], StationCatalog::fromFirebase($j('{"_x":{"name":"Sin region"},"otro":"texto"}')));
        $this->assertSame([], StationCatalog::fromFirebase(null));
    }

    public function testCatalogPrefersFirebaseAndFallsBackToJson(): void {
        $db = new FakeFirebase(['stations' => ['NAMIQUIPA' => ['_new' => 'Nueva']]]);
        StationCatalog::setFirebase($db);
        $this->assertSame('Nueva', StationCatalog::find('_new')['name']);
        $this->assertNull(StationCatalog::find('_osm'));
        StationCatalog::setFirebase(new FakeFirebase([]));          // /stations no existe
        $this->assertSame('NAMIQUIPA', StationCatalog::find('_osm')['region']);
        StationCatalog::setFirebase(null);
    }
}
