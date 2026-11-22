<?php
declare(strict_types=1);

/**
 * Cliente HTTP mínimo sobre cURL (un solo handle reutilizado).
 * Devuelve null ante error de red o código HTTP fuera de 2xx.
 */
class HttpClient {
    /** @var resource|\CurlHandle|null */
    private $handle = null;
    private bool $verifySsl;

    public function __construct(bool $verifySsl = true) {
        $this->verifySsl = $verifySsl;
    }

    public function __destruct() {
        if ($this->handle) {
            curl_close($this->handle);
        }
    }

    /**
     * @return array{status:int, body:string}|null
     */
    public function request(string $method, string $url, ?string $body = null, array $headers = [], ?int $timeout = null): ?array {
        if ($this->handle === null) {
            $this->handle = curl_init();
        } else {
            curl_reset($this->handle);
        }

        $options = [
            CURLOPT_URL            => $url,
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => $timeout ?? DTA_HTTP_TIMEOUT,
            CURLOPT_CONNECTTIMEOUT => DTA_HTTP_CONNECT_TIMEOUT,
            CURLOPT_SSL_VERIFYPEER => $this->verifySsl,
            CURLOPT_SSL_VERIFYHOST => $this->verifySsl ? 2 : 0,
            CURLOPT_FOLLOWLOCATION => true,
        ];
        if ($body !== null) {
            $options[CURLOPT_POSTFIELDS] = $body;
        }
        curl_setopt_array($this->handle, $options);

        $response = curl_exec($this->handle);
        if ($response === false) {
            error_log("HttpClient $method $url: " . curl_error($this->handle));
            return null;
        }
        $status = (int) curl_getinfo($this->handle, CURLINFO_HTTP_CODE);
        if ($status < 200 || $status >= 300) {
            error_log("HttpClient $method $url: HTTP $status");
            return null;
        }
        return ['status' => $status, 'body' => (string) $response];
    }

    /** GET que decodifica JSON. Con $assoc=true devuelve arrays. */
    public function getJson(string $url, bool $assoc = false) {
        $res = $this->request('GET', $url);
        return $res === null ? null : json_decode($res['body'], $assoc);
    }
}
