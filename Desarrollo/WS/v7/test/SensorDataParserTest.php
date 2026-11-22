<?php
declare(strict_types=1);
use PHPUnit\Framework\TestCase;

final class SensorDataParserTest extends TestCase {
    private function nanCount(array $a): int { return count(array_filter($a, 'is_nan')); }

    public function testEmptyDataIsAllNaN(): void {
        $r = SensorDataParser::forSensor()->parse('[]');
        $this->assertCount(40, $r);
        $this->assertSame(40, $this->nanCount($r));
    }

    public function testValidBlocks(): void {
        $r = SensorDataParser::forSensor()->parse('[12.50,45,23.4,3.7,100.00,-1,-1,4.1]');
        $this->assertSame([12.5, 45.0, 23.4, 3.7, 100.0, -1.0, -1.0, 4.1], array_slice($r, 0, 8));
        $this->assertSame(32, $this->nanCount($r));
    }

    public function testEmptyFieldMeansMissingSensor(): void {
        $r = SensorDataParser::forSensor()->parse('[,12.50,45,23.4,3.7]');
        $this->assertSame(4, $this->nanCount(array_slice($r, 0, 4)));
        $this->assertSame([12.5, 45.0, 23.4, 3.7], array_slice($r, 4, 4));
    }

    public function testInvalidBlockBecomesNaNAndParserResyncs(): void {
        // Vcc fuera de rango (7.0) en el primer sensor
        $r = SensorDataParser::forSensor()->parse('[12.50,45,23.4,7.0,,10.00,50,20.0,3.3]');
        $this->assertSame(4, $this->nanCount(array_slice($r, 0, 4)));
        $this->assertSame(4, $this->nanCount(array_slice($r, 4, 4)));
        $this->assertSame([10.0, 50.0, 20.0, 3.3], array_slice($r, 8, 4));
    }

    public function testWrongDecimalsAreRejected(): void {
        $r = SensorDataParser::forSensor()->parse('[12.5,45,23.4,3.7]');   // ms necesita 2 decimales
        $this->assertSame(40, $this->nanCount($r));
    }

    public function testNeveraProfile(): void {
        $r = SensorDataParser::forNevera()->parse('[60,4.5,3.6,,61,5.0,3.5]');
        $this->assertCount(30, $r);
        $this->assertSame([60.0, 4.5, 3.6], array_slice($r, 0, 3));
        $this->assertSame(3, $this->nanCount(array_slice($r, 3, 3)));
        $this->assertSame([61.0, 5.0, 3.5], array_slice($r, 6, 3));
    }

    public function testExtraValuesAreTruncated(): void {
        $raw = '[' . implode(',', array_fill(0, 12, '1.00,1,1.0,3.0')) . ']';
        $this->assertCount(40, SensorDataParser::forSensor()->parse($raw));
    }
}
