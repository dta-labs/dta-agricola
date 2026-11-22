<?php
declare(strict_types=1);
use PHPUnit\Framework\TestCase;

final class SensorEndpointTest extends TestCase {
    private function settings(string $mode, string $type = 'Sensor'): object {
        return (object) ['operationMode' => $mode, 'type' => $type, 'sensors' => (object) [
            'sensorNumber' => 2, 'S0' => (object) ['id' => '0x1A'], 'S1' => (object) ['id' => '0x2B'],
        ]];
    }

    public function testResponseFormatIsUnchanged(): void {
        $this->assertSame('"30"0x1A"0x2B"', SensorEndpoint::deviceResponse($this->settings('30'), fixedClock('2026-11-20 12:00')));
    }

    public function testDynamicFrequency(): void {
        $this->assertSame('"10"0x1A"0x2B"', SensorEndpoint::deviceResponse($this->settings('10'), fixedClock('2026-11-20 12:00', -6)));  // 06:00 local
        $this->assertSame('"30"0x1A"0x2B"', SensorEndpoint::deviceResponse($this->settings('10'), fixedClock('2026-11-20 14:00', -6)));  // 08:00 local
    }

    public function testDiscoveryModeResponse(): void {
        $s = (object) ['operationMode' => '0', 'sensors' => (object) ['sensorNumber' => 0]];
        $this->assertSame('"0"', SensorEndpoint::deviceResponse($s, fixedClock('2026-11-20 12:00')));
    }

    public function testProcessorByType(): void {
        $this->assertSame(DTA_WS_V7_URL . '/updateSensorDB.php', SensorEndpoint::processorUrl($this->settings('30', 'Sensor')));
        $this->assertSame(DTA_WS_V7_URL . '/updateNeveraDB.php', SensorEndpoint::processorUrl($this->settings('30', 'Nevera')));
        $this->assertSame(DTA_WS_V7_URL . '/updateNeveraDB.php', SensorEndpoint::processorUrl($this->settings('30', 'Invernadero')));
        $this->assertNull(SensorEndpoint::processorUrl($this->settings('30', 'Pivot')));
    }
}
