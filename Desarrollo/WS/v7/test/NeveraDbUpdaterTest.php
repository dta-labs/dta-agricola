<?php
declare(strict_types=1);
use PHPUnit\Framework\TestCase;

final class NeveraDbUpdaterTest extends TestCase {
    private function run_(array $get, object $settings, array $db = []): FakeFirebase {
        $fb = new FakeFirebase($db);
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

    public function testEmptyDataWithoutLogsCreatesAnEmptyRecord(): void {
        $w = $this->run_(['data' => '[]', 'lo' => '[-3,0,0]'], (object) ['operationMode' => '5'])->writes();
        $this->assertSame(['POST', 'systems/9/logs'], [$w[0][0], $w[0][1]]);
        $this->assertSame(array_fill(0, 30, null), json_decode($w[0][2]['dataRaw'], true));
        $this->assertSame('[-3,0,0]', $w[0][2]['lo']);
    }

    public function testEmptyDataUpdatesDateAndLoOfLastRecord(): void {
        $logs = ['-a' => ['date' => '20261120 0100pm', 'dataRaw' => '[60,4.5,3.6]'], '-b' => ['date' => '20261120 0130pm', 'dataRaw' => '[61,4.4,3.6]']];
        $fb = $this->run_(['data' => '[]', 'lo' => '[-17, -17,-17,-17,-17,0,0,0,0,0]'], (object) ['operationMode' => '5'], ['systems/9/logs' => $logs]);
        $this->assertSame([['PATCH', 'systems/9/logs/-b', ['date' => '20261120 0200pm', 'lo' => '[-17,-17,-17,-17,-17,0,0,0,0,0]']]], $fb->writes());
    }

    public function testEmptyDataWithoutLoOnlyUpdatesDate(): void {
        $fb = $this->run_(['data' => '[]'], (object) ['operationMode' => '5'], ['systems/9/logs' => ['-a' => ['date' => 'x', 'dataRaw' => '[]']]]);
        $this->assertSame([['PATCH', 'systems/9/logs/-a', ['date' => '20261120 0200pm']]], $fb->writes());
    }

    public function testNewRecordKeepsLo(): void {
        $w = $this->run_(['data' => '[60,4.5,3.6]', 'lo' => '[0,-2]'], (object) ['operationMode' => '5'])->writes();
        $this->assertSame('[0,-2]', $w[0][2]['lo']);
    }

    public function testInvalidLoIsIgnored(): void {
        $w = $this->run_(['data' => '[60,4.5,3.6]', 'lo' => '[a,1]'], (object) ['operationMode' => '5'])->writes();
        $this->assertFalse(isset($w[0][2]['lo']));
    }

    public function testDiscoveryWithEmptyDataDoesNothing(): void {
        $this->assertSame([], $this->run_(['data' => '[]'], (object) ['operationMode' => '0'])->writes());
    }

    public function testDiscovery(): void {
        $s = $this->run_(['data' => '[0x11,,0x33]'], (object) ['operationMode' => '0'])->writes()[0][2];
        $this->assertSame(2, $s->sensors->sensorNumber);
        $this->assertSame('0x33', $s->sensors->S2->alias);
        $this->assertFalse(isset($s->sensors->S1));
    }
}
