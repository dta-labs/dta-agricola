<?php
declare(strict_types=1);
use PHPUnit\Framework\TestCase;

final class DayLogAggregatorTest extends TestCase {
    private function log(array $sensor0): object {
        $vals = array_fill(0, 80, 'NAN');
        foreach ($sensor0 as $i => $v) $vals[$i] = (string) $v;
        return (object) ['dataRaw' => json_encode($vals)];
    }

    public function testExpandProducesEightValuesPerSensor(): void {
        $data = array_fill(0, 40, NAN);
        [$data[0], $data[1], $data[2], $data[3]] = [20.0, 50.0, 5.0, 3.7];
        $out = DayLogAggregator::expand($data, fn() => 0.423);
        $this->assertCount(80, $out);
        $this->assertSame(['20', '50', '5', '5', '5', '0.42', '1', '3.7'], array_slice($out, 0, 8));
        $this->assertSame('NAN', $out[8]);
    }

    public function testMinus127IsTreatedAsMissing(): void {
        $data = array_fill(0, 40, NAN);
        $data[2] = -127.0;
        $out = DayLogAggregator::expand($data, fn() => 1.0);
        $this->assertSame('NAN', $out[2]);
        $this->assertSame('NAN', $out[6]);
    }

    public function testSummarize(): void {
        $logs = [
            'a' => $this->log([10, 40, 3, 3, 3, 0.2, 1, 3.6]),
            'b' => $this->log([20, 60, 9, 9, 9, 0.3, 0, 3.5]),
        ];
        $r = DayLogAggregator::summarize($logs);
        // ETc 0.25 mm/h × 24 = 6 mm/día; UF 0.5 × 24 = 12
        $this->assertSame([15.0, 50.0, 3.0, 9.0, 6.0, 6.0, 12.0, 3.5], array_slice($r, 0, 8));
        $this->assertSame('NaN', $r[8]);
    }

    public function testSummarizeKeepsNegativeMaxTemperature(): void {
        $logs = ['a' => $this->log([10, 40, -8, -8, -8, 0, 0.5, 3.6]), 'b' => $this->log([10, 40, -3, -3, -3, 0, 0.5, 3.6])];
        $r = DayLogAggregator::summarize($logs);
        $this->assertSame(-8.0, $r[2]);
        $this->assertSame(-3.0, $r[3]);   // en v6 quedaba "NaN"
    }

    public function testRecordsWithWrongLengthAreIgnored(): void {
        $bad = (object) ['dataRaw' => json_encode(array_fill(0, 79, '1'))];
        $r = DayLogAggregator::summarize(['x' => $bad]);
        $this->assertSame(array_fill(0, 80, 'NaN'), $r);
    }

    public function testHumidityMinusOneIsNotAveraged(): void {
        $r = DayLogAggregator::summarize(['a' => $this->log([10, -1, 3, 3, 3, 0, 1, 3.6]), 'b' => $this->log([10, 60, 3, 3, 3, 0, 1, 3.6])]);
        $this->assertSame(60.0, $r[1]);
        $r = DayLogAggregator::summarize(['a' => $this->log([10, -1, 3, 3, 3, 0, 1, 3.6])]);
        $this->assertSame(-1.0, $r[1]);           // todo el día sin medir: queda -1
    }

    public function testUtahChillUnits(): void {
        $cases = [[1.4, 0.0], [1.5, 0.5], [2.4, 0.5], [2.5, 1.0], [9.1, 1.0], [9.2, 0.5], [12.4, 0.5], [12.5, 0.0], [15.9, 0.0], [16.0, -0.5], [18.0, -0.5], [18.1, -1.0], [-5.0, 0.0]];
        foreach ($cases as [$t, $uf]) $this->assertSame($uf, Agronomy::chillHours($t), "T=$t");
    }
}
