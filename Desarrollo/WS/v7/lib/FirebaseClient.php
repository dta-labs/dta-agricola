<?php
declare(strict_types=1);

/**
 * Acceso REST a Firebase Realtime Database.
 * Las rutas son relativas a la raíz, p. ej. "systems/123/settings".
 * Toda escritura se hace en JSON (mismo contenido que v6).
 */
class FirebaseClient {
    private HttpClient $http;
    private string $baseUrl;

    public function __construct(?HttpClient $http = null, string $baseUrl = DTA_FIREBASE_URL) {
        $this->http = $http ?? new HttpClient();
        $this->baseUrl = rtrim($baseUrl, '/');
    }

    public function url(string $path, array $query = []): string {
        $url = $this->baseUrl . '/' . trim($path, '/') . '.json';
        if ($query) {
            $url .= '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
        }
        return $url;
    }

    /** Lee un nodo. Devuelve null si no existe o hubo error. */
    public function get(string $path, array $query = []) {
        $res = $this->http->request('GET', $this->url($path, $query), null, ['Content-Type: application/json']);
        return $res === null ? null : json_decode($res['body']);
    }

    /** Último hijo de un nodo ordenado por llave (push-id ⇒ el más reciente). */
    public function getLastChild(string $path) {
        $data = $this->get($path, ['orderBy' => '"$key"', 'limitToLast' => 1]);
        if (!is_object($data)) {
            return null;
        }
        $vars = get_object_vars($data);
        return $vars ? end($vars) : null;
    }

    public function put(string $path, $value): bool {
        return $this->write('PUT', $path, $value);
    }

    public function post(string $path, $value): bool {
        return $this->write('POST', $path, $value);
    }

    public function delete(string $path): bool {
        return $this->http->request('DELETE', $this->url($path), null, ['Content-Type: application/json']) !== null;
    }

    private function write(string $method, string $path, $value): bool {
        $json = json_encode($value);
        if ($json === false) {
            error_log("FirebaseClient: no se pudo codificar JSON para $path: " . json_last_error_msg());
            return false;
        }
        return $this->http->request($method, $this->url($path), $json, ['Content-Type: application/json']) !== null;
    }
}
