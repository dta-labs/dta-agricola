<?php
declare(strict_types=1);

/**
 * Log en archivo diario: logs/{prefijo}{Y-m-d}_log.txt
 * Escribe directo (v6 lanzaba un curl a log_writer.php por cada línea).
 */
class FileLogger {
    private string $dir;
    private string $prefix;
    private LocalClock $clock;

    public function __construct(LocalClock $clock, string $prefix = '', string $dir = DTA_LOG_DIR) {
        $this->clock = $clock;
        $this->prefix = $prefix;
        $this->dir = rtrim($dir, '/');
    }

    public function write(string $message): bool {
        if (!is_dir($this->dir) && !@mkdir($this->dir, 0755, true)) {
            error_log("FileLogger: no se pudo crear {$this->dir}");
            return false;
        }
        $now = $this->clock->now();
        $file = "{$this->dir}/{$this->prefix}" . $now->format('Y-m-d') . '_log.txt';
        $line = '[' . $now->format('H:i:s') . '] ' . str_replace(["\r", "\n"], ' ', $message) . "\n";
        if (@file_put_contents($file, $line, FILE_APPEND | LOCK_EX) === false) {
            error_log("FileLogger: no se pudo escribir en $file");
            return false;
        }
        return true;
    }
}
