<?php
declare(strict_types=1);

/**
 * Convierte el parámetro "data" del gateway ("[v,v,v,v,,v,...]") en un
 * arreglo de floats de longitud fija (sensores × valores por sensor).
 *
 * - Un campo vacío = sensor que no respondió ⇒ bloque de NaN.
 * - Un bloque incompleto o con valores fuera de formato/rango ⇒ bloque de NaN.
 *
 * Es el algoritmo de fillEmptyData() de updateSensorDB/updateNeveraDB v6,
 * unificado y con el perfil de validación como parámetro.
 */
class SensorDataParser {
    private int $totalSensors;
    private int $valuesPerSensor;
    /** @var array<int, callable(string):bool> */
    private array $validators;

    /** Perfil "Sensor": humedad de suelo, HR, temperatura, Vcc */
    public static function forSensor(int $totalSensors = DTA_TOTAL_SENSORS): self {
        return new self($totalSensors, [
            fn(string $v): bool => self::isDecimalInRange($v, 2, 0.0, 240.0),
            fn(string $v): bool => self::isIntegerInRange($v, -1, 100),
            fn(string $v): bool => $v === '-1' || self::isDecimalInRange($v, 1, -50.0, 125.0),
            fn(string $v): bool => self::isDecimalInRange($v, 1, 2.0, 6.0),
        ]);
    }

    /** Perfil "Nevera": HR, temperatura, Vcc */
    public static function forNevera(int $totalSensors = DTA_TOTAL_SENSORS): self {
        return new self($totalSensors, [
            fn(string $v): bool => self::isIntegerInRange($v, -1, 100),
            fn(string $v): bool => self::isDecimalInRange($v, 1, -50.0, 125.0),
            fn(string $v): bool => self::isDecimalInRange($v, 1, 2.0, 6.0),
        ]);
    }

    public function __construct(int $totalSensors, array $validators) {
        $this->totalSensors = $totalSensors;
        $this->validators = array_values($validators);
        $this->valuesPerSensor = count($this->validators);
    }

    public function valuesPerSensor(): int {
        return $this->valuesPerSensor;
    }

    public function totalValues(): int {
        return $this->totalSensors * $this->valuesPerSensor;
    }

    public function parse(string $rawData): array {
        $total = $this->totalValues();
        $vps = $this->valuesPerSensor;
        $rawData = trim(trim($rawData), '[]');

        if ($rawData === '') {
            return array_fill(0, $total, NAN);
        }

        $tokens = array_map('trim', explode(',', $rawData));
        $count = count($tokens);
        $result = [];
        $cursor = 0;

        while ($cursor < $count && count($result) < $total) {
            if ($tokens[$cursor] === '') {
                $this->appendEmpty($result);
                $cursor++;
                continue;
            }

            $block = array_slice($tokens, $cursor, $vps);
            if (count($block) === $vps && $this->isValidBlock($block)) {
                foreach ($block as $v) {
                    $result[] = (float) $v;
                }
                $cursor += $vps;
                continue;
            }

            // Bloque incompleto o inválido: se consume hasta el primer hueco.
            $this->appendEmpty($result);
            $consumed = 0;
            while ($consumed < $vps && ($cursor + $consumed) < $count && $tokens[$cursor + $consumed] !== '') {
                $consumed++;
            }
            $cursor += max(1, $consumed);
        }

        if (count($result) < $total) {
            $result = array_pad($result, $total, NAN);
        }
        return array_slice($result, 0, $total);
    }

    private function appendEmpty(array &$result): void {
        for ($i = 0; $i < $this->valuesPerSensor; $i++) {
            $result[] = NAN;
        }
    }

    private function isValidBlock(array $block): bool {
        foreach ($this->validators as $i => $validate) {
            if (!$validate($block[$i])) return false;
        }
        return true;
    }

    public static function isDecimalInRange(string $value, int $decimals, float $min, float $max): bool {
        if (preg_match('/^-?\d+\.\d{' . $decimals . '}$/D', $value) !== 1) return false;
        $n = (float) $value;
        return is_finite($n) && $n >= $min && $n <= $max;
    }

    public static function isIntegerInRange(string $value, int $min, int $max): bool {
        if (preg_match('/^-?\d+$/D', $value) !== 1) return false;
        $n = filter_var($value, FILTER_VALIDATE_INT);
        return $n !== false && $n >= $min && $n <= $max;
    }
}
