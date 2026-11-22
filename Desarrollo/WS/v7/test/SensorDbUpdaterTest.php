<?php
declare(strict_types=1);
use PHPUnit\Framework\TestCase;

final class SensorDbUpdaterTest extends TestCase {
    private function settings(string $mode = '30'): object {
        $s = (object) ['key' => '1', 'type' => 'Sensor', 'operationMode' => $mode, 'zona' => -6, 'sensors' => (object) ['sensorNumber' => 2]];
        $s->sensors->S0 = (object) ['id' => '0x1A', 'type' => 'SHT4'];
        $s->sensors->S1 = (object) ['id' => '0x2B', 'type' => 'SHT4'];
        return $s;
    }

    private function updater(array $get, array $db, ?object $settings = null): array {
        $fb = new FakeFirebase($db);
        $u = new SensorDbUpdater('1', new Request($get + ['id' => '1']), $fb, new FakeWeather(),
            $settings ?? $this->settings(), fixedClock('2026-11-20 20:00', -6));   // 02:00pm local
        $u->process();
        return [$fb];
    }

    public function testFirstRecordOfTheDay(): void {
        [$fb] = $this->updater(['data' => '[12.50,45,23.4,3.7,,]', 'si' => '20', 'rx' => 'Ok'], []);
        $w = $fb->writes();
        $this->assertCount(1, $w);
        $this->assertSame(['POST', 'systems/1/dayLogs'], [$w[0][0], $w[0][1]]);
        $this->assertSame('20261120 0200pm', $w[0][2]['date']);
        $raw = json_decode($w[0][2]['dataRaw'], true);
        $this->assertCount(80, $raw);
        $this->assertSame(['12.5', '45'], array_slice($raw, 0, 2));
    }

    public function testMissingSensorIsFilledFromTheOthers(): void {
        [$fb] = $this->updater(['data' => '[12.50,45,23.4,3.7,,]'], []);
        $raw = json_decode($fb->writes()[0][2]['dataRaw'], true);
        $this->assertSame('4', $raw[15]);                         // Vcc faltante: 4 V
        $this->assertEqualsWithDelta(23.4, (float) $raw[12], 3.0); // T ≈ promedio ± ruido
    }


    public function testDayChangeWritesSummary(): void {
        $prev = ['-a' => ['date' => '20261119 1150pm', 'dataRaw' => json_encode(array_fill(0, 80, '1'))]];
        [$fb] = $this->updater(['data' => '[12.50,45,23.4,3.7]'], ['systems/1/dayLogs' => $prev]);
        $w = $fb->writes();
        $this->assertSame(['DELETE', 'POST', 'POST'], array_column($w, 0));
        $this->assertSame('systems/1/logs', $w[1][1]);
        $this->assertSame('20261119 0000am', $w[1][2]['date']);
        $this->assertSame('systems/1/dayLogs', $w[2][1]);
    }

    public function testDayLogsIsReadOnlyOnce(): void {
        $prev = ['-a' => ['date' => '20261120 0150pm', 'dataRaw' => '[]']];
        [$fb] = $this->updater(['data' => '[12.50,45,23.4,3.7]'], ['systems/1/dayLogs' => $prev]);
        $reads = array_filter($fb->calls, fn($c) => $c === ['GET', 'systems/1/dayLogs']);
        $this->assertCount(1, $reads);
    }



    public function testDiscoveryModeUpdatesSensorIds(): void {
        [$fb] = $this->updater(['data' => '[0x11,0x22,0x33]'], [], $this->settings('0'));
        $w = $fb->writes();
        $this->assertSame(['PUT', 'systems/1/settings'], [$w[0][0], $w[0][1]]);
        $s = $w[0][2];
        $this->assertSame(3, $s->sensors->sensorNumber);
        $this->assertSame('0x33', $s->sensors->S2->id);
        $this->assertSame('SHT4', $s->sensors->S2->type);
    }

    public function testDiscoveryModeIgnoresNonIds(): void {
        [$fb] = $this->updater(['data' => '[0x11,12.50]'], [], $this->settings('0'));
        $this->assertSame([], $fb->writes());
    }

    public function testHumidityMinusOneIsReadFromMeteorology(): void {
        $s = $this->settings();
        $s->key = '24530080316';                    // estación _fac
        $fb = new FakeFirebase();
        $w = new FakeWeather();
        $w->stations['_fac'] = ['hr' => 40.0, 't' => 20.0, 'fecha' => '2026-11-20'];
        (new SensorDbUpdater('1', new Request(['id' => '1', 'data' => '[12.50,-1,23.4,3.7]']), $fb, $w, $s, fixedClock('2026-11-20 20:00', -6)))->process();
        $raw = json_decode($fb->writes()[0][2]['dataRaw'], true);
        $this->assertEqualsWithDelta(40.0, (float) $raw[1], 2.5);   // HR de la estación (con el ruido del respaldo)
        $this->assertSame((string) round(Agronomy::etc((float) $raw[2], (float) $raw[1], null, $s->sensors->S0, $s), 2), $raw[5]);
    }

    public function testHumidityMinusOneWithoutMeteorologyIsNotFilledWithMinusOne(): void {
        [$fb] = $this->updater(['data' => '[12.50,-1,23.4,3.7,,]'], []);
        $raw = json_decode($fb->writes()[0][2]['dataRaw'], true);
        $this->assertSame('NAN', $raw[1]);
        $this->assertSame('NAN', $raw[9]);
    }

    public function testFallbackAveragesOnlySensorsOfTheSameType(): void {
        $s = $this->settings();
        $s->sensors = (object) ['sensorNumber' => 4,
            'S0' => (object) ['id' => '0x1', 'type' => 'SHT4'], 'S1' => (object) ['id' => '0x2', 'type' => 'WM'],
            'S2' => (object) ['id' => '0x3', 'type' => 'SHT4'], 'S3' => (object) ['id' => '0x4', 'type' => 'PSI']];
        $fb = new FakeFirebase();
        // S0 SHT4 30 %, S1 WM 150 cb, S2 SHT4 sin dato, S3 PSI sin dato
        (new SensorDbUpdater('1', new Request(['id' => '1', 'data' => '[30.00,50,20.0,3.7,150.00,50,20.0,3.7,,]']), $fb, new FakeWeather(), $s, fixedClock('2026-11-20 20:00', -6)))->process();
        $raw = json_decode($fb->writes()[0][2]['dataRaw'], true);
        $this->assertEqualsWithDelta(30.0, (float) $raw[16], 3.0);   // SHT4: solo del otro SHT4, no de los 150 cb
        $this->assertSame('NAN', $raw[24]);                          // PSI no se rellena
    }

    public function testMissingWmIsNotFilledFromPercentSensors(): void {
        $s = $this->settings();
        $s->sensors->S1->type = 'WM';
        [$fb] = [new FakeFirebase()];
        (new SensorDbUpdater('1', new Request(['id' => '1', 'data' => '[30.00,50,20.0,3.7,,]']), $fb, new FakeWeather(), $s, fixedClock('2026-11-20 20:00', -6)))->process();
        $raw = json_decode($fb->writes()[0][2]['dataRaw'], true);
        $this->assertSame('NAN', $raw[8]);                           // WM sin otro WM: vacío
    }

    public function testNpkAndMsAreFilledAndWmGetsNoMeteorology(): void {
        $s = $this->settings();
        $s->key = '24530080316';
        $s->sensors = (object) ['sensorNumber' => 4,
            'S0' => (object) ['id' => '0x1', 'type' => 'NPK'], 'S1' => (object) ['id' => '0x2', 'type' => 'NPK'],
            'S2' => (object) ['id' => '0x3', 'type' => 'WM'],  'S3' => (object) ['id' => '0x4', 'type' => 'WM']];
        $w = new FakeWeather();
        $w->stations['_fac'] = ['hr' => 40.0, 't' => 12.0, 'fecha' => '2026-11-20'];
        $fb = new FakeFirebase();
        // S1 NPK sin dato; S2 WM sin dato; S3 WM con HR -1
        (new SensorDbUpdater('1', new Request(['id' => '1', 'data' => '[40.00,60,15.0,3.3,,,150.00,-1,10.0,3.5]']), $fb, $w, $s, fixedClock('2026-11-20 20:00', -6)))->process();
        $raw = json_decode($fb->writes()[0][2]['dataRaw'], true);
        $this->assertEqualsWithDelta(40.0, (float) $raw[8], 3.0);    // NPK del otro NPK
        $this->assertSame('4', $raw[15]);
        $this->assertEqualsWithDelta(40.0, (float) $raw[25], 2.5);   // WM S3: HR -1 y ningún WM con HR ⇒ estación
        $this->assertEqualsWithDelta(150.0, (float) $raw[16], 3.0);  // WM S2: ms del otro WM
        $this->assertEqualsWithDelta(10.0, (float) $raw[18], 3.0);   // WM S2: T del otro WM, no de la estación
        $this->assertEqualsWithDelta(40.0, (float) $raw[17], 2.5);   // WM S2: HR ⇒ estación
    }

    public function testHumidityFromOpenWeatherWithSystemCoordinates(): void {
        $s = $this->settings();
        $s->latitude = 28.40;
        $s->longitude = -106.86;
        $s->sensors->S1->latitude = 0.0;                 // 0,0 del modo descubrimiento: no vale
        $s->sensors->S1->longitude = 0.0;
        $w = new FakeWeather();
        $w->owm = ['hr' => 47.0, 't' => 11.2];
        $fb = new FakeFirebase();
        (new SensorDbUpdater('1', new Request(['id' => '1', 'data' => '[0.00,-1,11.3,3.3,0.00,-1,12.4,3.3]']), $fb, $w, $s, fixedClock('2026-11-20 20:00', -6)))->process();
        $raw = json_decode($fb->writes()[0][2]['dataRaw'], true);
        $this->assertEqualsWithDelta(47.0, (float) $raw[1], 2.5);   // S0 sin coordenadas: OpenWeatherMap con las del sistema
        $this->assertEqualsWithDelta(47.0, (float) $raw[9], 2.5);
        $this->assertSame([[28.4, -106.86]], $w->owmCalls);   // S1 toma el promedio de S0 (mismo tipo): 1 consulta
    }

    public function testHumidityMinusOneUsesSameTypeFirst(): void {
        $s = $this->settings();
        $s->sensors = (object) ['sensorNumber' => 3,
            'S0' => (object) ['id' => '0x1', 'type' => 'WM'], 'S1' => (object) ['id' => '0x2', 'type' => 'WM'],
            'S2' => (object) ['id' => '0x3', 'type' => 'SHT4']];
        $w = new FakeWeather();
        $w->owm = ['hr' => 55.0, 't' => 11.0];
        $fb = new FakeFirebase();
        (new SensorDbUpdater('1', new Request(['id' => '1', 'data' => '[100.00,-1,11.0,3.3,120.00,62,12.0,3.3,30.00,40,13.0,3.3]']), $fb, $w, $s, fixedClock('2026-11-20 20:00', -6)))->process();
        $raw = json_decode($fb->writes()[0][2]['dataRaw'], true);
        $this->assertEqualsWithDelta(62.0, (float) $raw[1], 2.5);   // del otro WM, no del SHT4 (40) ni de OpenWeatherMap (55)
    }

    private function emptyLog(string $date): array {
        return ['date' => $date, 'dataRaw' => json_encode(array_fill(0, 80, 'NAN')), 'signal' => '', 'qos' => '', 'reception' => 'Ok'];
    }

    public function testEmptyDataWithoutRecordsCreatesAnEmptyRecord(): void {
        [$fb] = $this->updater(['data' => '[]', 'si' => '17', 'rx' => 'Ok'], []);
        $w = $fb->writes();
        $this->assertCount(1, $w);
        $this->assertSame(['POST', 'systems/1/dayLogs'], [$w[0][0], $w[0][1]]);
        $this->assertSame('20261120 0200pm', $w[0][2]['date']);
        $this->assertSame(array_fill(0, 80, 'NAN'), json_decode($w[0][2]['dataRaw'], true));   // nada rellenado
        $this->assertSame(['17', 'Ok'], [$w[0][2]['signal'], $w[0][2]['reception']]);
    }

    public function testEmptyDataUpdatesDateOfLastEmptyRecord(): void {
        $logs = ['-a' => ['date' => '20261120 0900am', 'dataRaw' => json_encode(array_fill(0, 80, '1'))],
                 '-b' => $this->emptyLog('20261120 0100pm')];
        [$fb] = $this->updater(['data' => '[]'], ['systems/1/dayLogs' => $logs]);
        $this->assertSame([['PUT', 'systems/1/dayLogs/-b/date', '20261120 0200pm']], $fb->writes());
    }

    public function testEmptyDataDoesNothingWhenLastRecordHasValues(): void {
        $logs = ['-a' => $this->emptyLog('20261120 0900am'),
                 '-b' => ['date' => '20261120 0100pm', 'dataRaw' => json_encode(array_merge(['12.5'], array_fill(0, 79, 'NAN')))]];
        [$fb] = $this->updater(['data' => '[]'], ['systems/1/dayLogs' => $logs]);
        $this->assertSame([], $fb->writes());
    }

    public function testEmptyDataOnANewDayClosesThePreviousDay(): void {
        $logs = ['-a' => ['date' => '20261119 1000pm', 'dataRaw' => json_encode(array_fill(0, 80, '1'))],
                 '-b' => $this->emptyLog('20261119 1100pm')];
        [$fb] = $this->updater(['data' => '[]'], ['systems/1/dayLogs' => $logs]);
        $w = $fb->writes();
        $this->assertSame(['DELETE', 'POST', 'POST'], array_column($w, 0));
        $this->assertSame('systems/1/logs', $w[1][1]);                 // resumen del 19
        $this->assertSame('20261119 0000am', $w[1][2]['date']);
        $this->assertSame(array_fill(0, 80, 'NAN'), json_decode($w[2][2]['dataRaw'], true));   // vacío del 20
    }

    public function testIsEmptyRecord(): void {
        $this->assertTrue(SensorDbUpdater::isEmptyRecord((object) $this->emptyLog('x')));
        $this->assertTrue(SensorDbUpdater::isEmptyRecord((object) ['dataRaw' => json_encode(['NaN', null, ''])]));
        $this->assertFalse(SensorDbUpdater::isEmptyRecord((object) ['dataRaw' => json_encode(['NAN', '-1'])]));
        $this->assertFalse(SensorDbUpdater::isEmptyRecord((object) ['dataRaw' => 'no-json']));
    }

    public function testEmptyDataOnANewDayClosesTheDayEvenIfLastRecordHasValues(): void {
        $logs = ['-a' => ['date' => '20261119 1000pm', 'dataRaw' => json_encode(array_fill(0, 80, '2'))],
                 '-b' => ['date' => '20261119 1100pm', 'dataRaw' => json_encode(array_fill(0, 80, '4'))]];
        [$fb] = $this->updater(['data' => '[]'], ['systems/1/dayLogs' => $logs]);
        $w = $fb->writes();
        $this->assertSame(['DELETE', 'POST', 'POST'], array_column($w, 0));
        $sum = json_decode($w[1][2]['dataRaw'], true);
        $this->assertSame('20261119 0000am', $w[1][2]['date']);
        $this->assertSame([3.0, 3.0, 2.0, 4.0, 3.0], array_map('floatval', array_slice($sum, 0, 5)));   // ms, hr, Tmin, Tmax, T del 19
        $this->assertSame(array_fill(0, 80, 'NAN'), json_decode($w[2][2]['dataRaw'], true));
    }
}
