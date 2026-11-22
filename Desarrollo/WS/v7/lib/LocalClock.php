<?php
declare(strict_types=1);

/**
 * Hora local del sistema = hora del servidor + (zona + horario de verano).
 * Mismo cálculo que v6 (el servidor se asume en UTC).
 */
class LocalClock {
    private int $offsetHours;
    /** @var callable|null */
    private $nowFn;

    public function __construct(int $offsetHours, ?callable $nowFn = null) {
        $this->offsetHours = $offsetHours;
        $this->nowFn = $nowFn;
    }

    public function offset(): int {
        return $this->offsetHours;
    }

    public function now(): DateTime {
        $dt = $this->nowFn ? ($this->nowFn)() : new DateTime();
        $dt->modify("{$this->offsetHours} hours");
        return $dt;
    }

    /** Formato usado en logs/dayLogs: "20261120 0855pm" */
    public function logDate(): string {
        return $this->now()->format('Ymd hia');
    }

    public static function parseLogDate(string $date): ?DateTime {
        $dt = DateTime::createFromFormat('Ymd hia', $date);
        return $dt ?: null;
    }
}
