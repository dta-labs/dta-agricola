<?php
declare(strict_types=1);

/**
 * Lectura y validación de los parámetros GET que mandan los equipos.
 */
class Request {
    private array $params;

    public function __construct(?array $params = null) {
        $this->params = $params ?? $_GET;
    }

    public function all(): array {
        return $this->params;
    }

    public function get(string $key, string $default = ''): string {
        $v = $this->params[$key] ?? $default;
        return is_scalar($v) ? (string) $v : $default;
    }

    public function has(string $key): bool {
        return isset($this->params[$key]) && is_scalar($this->params[$key]);
    }

    /**
     * lo = ciclos sin recibir de cada sensor, como lo manda el gateway: "[-17,-17,0,...]" (negativo = sin datos).
     * Devuelve el arreglo normalizado como texto ("[-17,-17,0]") o null si falta o no es una lista de enteros.
     */
    public function lo(): ?string {
        $raw = preg_replace('/\s+/', '', $this->get('lo'));
        if (!is_string($raw) || preg_match('/^\[-?\d{1,6}(,-?\d{1,6}){0,31}\]$/D', $raw) !== 1) return null;
        return '[' . implode(',', array_map('intval', explode(',', trim($raw, '[]')))) . ']';
    }

    /**
     * Id del sistema. Rechaza caracteres que alterarían la ruta de Firebase
     * (/ . # $ [ ] ? & %) o espacios.
     */
    public function systemId(): ?string {
        $id = trim($this->get('id'));
        if ($id === '' || strlen($id) > 64 || preg_match('/[\/.#$\[\]?&%\s\\\\]/', $id)) {
            return null;
        }
        return $id;
    }

    /** Termina la petición con 400 si el id falta o no es válido. */
    public function requireSystemId(): string {
        $id = $this->systemId();
        if ($id === null) {
            http_response_code(400);
            echo "Error: Falta el parámetro 'id' del sistema";
            exit;
        }
        return $id;
    }
}
