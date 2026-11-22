<?php
declare(strict_types=1);
use PHPUnit\Framework\TestCase;

final class NeveraDbUpdaterTest extends TestCase {
    private function run_(array $get, object $settings): FakeFirebase {
        $fb = new FakeFirebase();
        (new NeveraDbUpdater('9', new Request($get + ['id' => '9']), $fb, $settings, fixedClock('2026-11-20 20:00', -6)))->process();
        return $fb;
    }

    public function testLogRecord(): void {
        $fb = $this->run_(['data' => '[60,4.5,3.6,,61,-127.0,3.5]', 'si' => '18', 'qos' => '1', 'rx' => 'Ok'], (object) ['operationMode' => '1']);
        $w = $fb->writes()[0];
        $this->assertSame(['POST', 'systems/9/logs'], [$w[0], $w[1]]);
        $this->assertSame('20261120 0200pm', $w[2]['date']);
        $vals = json_decode($w[2]['dataRaw'], true);
        $this->assertSame([60, 4.5, 3.6, null, null, null], array_slice($vals, 0, 6));
        $this->assertCount(30, $vals);
        $this->assertSame(['18', '1', 'Ok'], [$w[2]['signal'], $w[2]['qos'], $w[2]['reception']]);
    }

    public function testEmptyDataDoesNothing(): void {
        $this->assertSame([], $this->run_(['data' => '[]'], (object) ['operationMode' => '1'])->writes());
    }

    public function testDiscovery(): void {
        $s = $this->run_(['data' => '[0x11,,0x33]'], (object) ['operationMode' => '0'])->writes()[0][2];
        $this->assertSame(2, $s->sensors->sensorNumber);
        $this->assertSame('0x33', $s->sensors->S2->alias);
        $this->assertFalse(isset($s->sensors->S1));
    }
}
