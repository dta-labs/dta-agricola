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
