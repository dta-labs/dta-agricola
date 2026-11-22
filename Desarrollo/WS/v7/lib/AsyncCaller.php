<?php
declare(strict_types=1);

/**
 * Llama a otro servicio sin esperar respuesta ("dispara y olvida").
 *
 * v6 armaba el comando con los parámetros GET sin escapar
 * (curl "...$_GET..." &), lo que permitía inyectar comandos de shell.
 * Aquí la URL se construye con http_build_query y se pasa con escapeshellarg.
 */
class AsyncCaller {
    /** @var callable|null  Para pruebas: recibe el comando en lugar de ejecutarlo */
    private $runner;

    public function __construct(?callable $runner = null) {
        $this->runner = $runner;
    }

    public static function buildUrl(string $baseUrl, array $params): string {
        return $params ? $baseUrl . '?' . http_build_query($params) : $baseUrl;
    }

    public static function buildCommand(string $url): string {
        return 'curl -s -m 120 ' . escapeshellarg($url) . ' > /dev/null 2>&1 &';
    }

    public function call(string $baseUrl, array $params = []): void {
        $cmd = self::buildCommand(self::buildUrl($baseUrl, $params));
        if ($this->runner) {
            ($this->runner)($cmd);
            return;
        }
        $proc = @popen($cmd, 'r');
        if ($proc === false) {
            error_log("AsyncCaller: no se pudo lanzar $baseUrl");
            return;
        }
        pclose($proc);
    }
}
