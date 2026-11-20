// DTA_Gateway_WiFi_ESP8266 — Módulo WiFi del Gateway Universal DTA-Agrícola (ESP-12 / ESP8266)
//
// Funciona en dos modos a la vez (D-037 del gateway):
//   1. Punto de acceso siempre activo con clave: portal de bienvenida y configuración de la WiFi local
//      (http://192.168.4.1, el celular lo abre solo al conectarse).
//   2. Puente HTTP del Arduino: recibe por serie "#GET,<host>,<ruta>", hace la petición por la WiFi
//      local y responde "#R,<código>,<cuerpo>". Protocolo completo en
//      ../DTA_LoRa_Gateway_Universal_v1.1/spec/protocolo.md ("Enlace serie con el ESP8266").
//
// Placa en el IDE: Generic ESP8266 Module · Flash Size 4MB (FS:2MB OTA:~1019KB) · Upload Speed 115200
// Conexión con el Arduino: TX del ESP → A0 · A1 → divisor 1k/2k → RX del ESP · GND común.
// Para programarlo hay que desconectarlo del Arduino (TX/RX van al adaptador USB-UART).

#define FW_VERSION "v1.261120001"             // v1.aammdd + consecutivo del día

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266HTTPClient.h>
#include <DNSServer.h>

// ---------- Configuración ----------
#define AP_PREFIX       "DTA-Gateway-"        // + 4 dígitos hex del Id del chip
#define AP_PASSWORD     "dtaagricola"         // Clave del punto de acceso (mínimo 8 caracteres)
#define LINK_BAUD       9600                  // Enlace con el Arduino (SoftwareSerial en A0/A1)
#define HTTP_TIMEOUT_MS 10000                 // Tiempo límite de la petición al servidor
#define BODY_MAX        250                   // Cuerpo máximo que se devuelve al Arduino
#define LINE_MAX        420                   // Línea más larga que se acepta del Arduino

ESP8266WebServer server(80);
DNSServer dns;
char apName[24];
String rxLine;                                // Línea en curso recibida del Arduino
String gatewayImei;                           // IMEI que informa el Arduino en #ST
int lastCode = 0;                             // Último código HTTP del puente
unsigned long lastSendMs = 0;                 // millis() del último envío (0: ninguno)
unsigned long sendCount = 0;
// ---------- Reconexión controlada ----------
// Mientras el ESP busca una red que no encuentra, salta de canal en canal y el punto de acceso deja de
// verse. Por eso cada intento dura como máximo CONNECT_TRY_MS; después la estación descansa
// CONNECT_PAUSE_MS (el punto de acceso queda estable) y solo se reintenta si nadie está en el portal.
#define CONNECT_TRY_MS   30000UL              // Duración de un intento de conexión
#define CONNECT_PAUSE_MS 300000UL             // Descanso entre intentos (5 min)
enum StaState : uint8_t { STA_IDLE, STA_TRYING, STA_CONNECTED, STA_PAUSED };
StaState staState = STA_IDLE;
unsigned long staSinceMs = 0;                 // Inicio del estado actual
bool staManual = false;                       // Intento pedido desde el portal: no se corta por clientes

// 0 sin red configurada, 1 configurada sin conexión, 2 conectada
int wifiStateCode() {
  if (WiFi.SSID().length() == 0) return 0;
  return WiFi.status() == WL_CONNECTED ? 2 : 1;
}

// ============================================================
//  Puente HTTP con el Arduino
// ============================================================

void replyResult(int code, String body) {
  body.replace('\r', ' ');
  body.replace('\n', ' ');
  if (body.length() > BODY_MAX) body.remove(BODY_MAX);
  Serial.print(F("#R,"));
  Serial.print(code);
  Serial.print(',');
  Serial.print(body);
  Serial.print(F("\r\n"));
  lastCode = code;
  lastSendMs = millis();
  sendCount++;
}

void bridgeGet(const String& host, const String& path) {
  if (WiFi.status() != WL_CONNECTED) { replyResult(-20, ""); return; }
  WiFiClient client;
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  int code = -1;                                // HTTPC_ERROR_CONNECTION_FAILED (incluye falla de DNS)
  String body;
  if (http.begin(client, host, 80, path)) {
    code = http.GET();
    if (code > 0) body = http.getString();
    http.end();
  }
  replyResult(code, code > 0 ? body : String());
}

void processCommand(const String& cmd) {
  if (cmd.startsWith(F("#ST"))) {
    if (cmd.length() > 4) gatewayImei = cmd.substring(4);
    int st = wifiStateCode();
    Serial.print(F("#ST,"));
    Serial.print(st);
    Serial.print(',');
    Serial.print(st == 2 ? WiFi.RSSI() : 0);
    Serial.print(F("\r\n"));
  } else if (cmd.startsWith(F("#GET,"))) {
    int comma = cmd.indexOf(',', 5);            // #GET,<host>,<ruta>  (la ruta puede tener comas)
    if (comma < 0) { replyResult(-21, ""); return; }
    bridgeGet(cmd.substring(5, comma), cmd.substring(comma + 1));
  }
}

void handleLink() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      rxLine.trim();
      if (rxLine.startsWith("#")) processCommand(rxLine);
      rxLine = "";
    } else if (rxLine.length() < LINE_MAX) {
      rxLine += c;
    }
  }
}

// Motivo por el que la estación no está conectada (se muestra en el portal)
String lastFailReason;                        // Motivo del último intento fallido (se muestra en el descanso)

String disconnectReason() {
  if (staState == STA_PAUSED) {
    unsigned long left = millis() - staSinceMs < CONNECT_PAUSE_MS ? (CONNECT_PAUSE_MS - (millis() - staSinceMs)) / 60000 + 1 : 0;
    return lastFailReason + F(" · nuevo intento en ") + String(left) + F(" min");
  }
  switch (WiFi.status()) {
    case WL_WRONG_PASSWORD: return F("clave incorrecta");
    case WL_NO_SSID_AVAIL:  return F("no se encuentra la red");
    case WL_CONNECT_FAILED: return F("falló la conexión");
    case WL_IDLE_STATUS:
    case WL_DISCONNECTED:   return F("conectando…");
    default:                return F("sin conexión");
  }
}

bool connecting() {
  return staState == STA_TRYING;
}

void staTry(bool manual) {
  WiFi.begin();                                 // Red guardada en la flash
  staState = STA_TRYING;
  staSinceMs = millis();
  staManual = manual;
}

void staPause() {
  switch (WiFi.status()) {
    case WL_WRONG_PASSWORD: lastFailReason = F("clave incorrecta"); break;
    case WL_NO_SSID_AVAIL:  lastFailReason = F("no se encuentra la red"); break;
    default:                lastFailReason = F("no se pudo conectar"); break;
  }
  wifi_station_disconnect();                    // Deja de buscar; NO borra la red guardada
  staState = STA_PAUSED;
  staSinceMs = millis();
}

// Se llama en cada vuelta del loop
void manageStation() {
  bool linked = WiFi.status() == WL_CONNECTED;
  unsigned long t = millis() - staSinceMs;
  switch (staState) {
    case STA_IDLE:
      break;
    case STA_CONNECTED:
      if (!linked) staTry(false);               // Se cayó la red: un intento y, si no, descanso
      break;
    case STA_TRYING:
      if (linked) { staState = STA_CONNECTED; break; }
      if (t >= CONNECT_TRY_MS) staPause();
      else if (!staManual && t > 3000 && WiFi.softAPgetStationNum() > 0) staPause();   // Alguien entra al portal
      break;
    case STA_PAUSED:
      if (t >= CONNECT_PAUSE_MS && WiFi.softAPgetStationNum() == 0) staTry(false);
      break;
  }
}

// ============================================================
//  Portal de bienvenida y configuración
// ============================================================

String htmlEscape(const String& s) {
  String o;
  o.reserve(s.length() + 8);
  for (unsigned i = 0; i < s.length(); i++) {
    char c = s[i];
    if (c == '<') o += F("&lt;");
    else if (c == '>') o += F("&gt;");
    else if (c == '&') o += F("&amp;");
    else if (c == '"') o += F("&quot;");
    else o += c;
  }
  return o;
}

const char PAGE_HEAD[] PROGMEM = R"rawliteral(<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Gateway DTA-Agrícola</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;background:#eef3ec;color:#1f2d1f}
header{background:#2e6b34;color:#fff;padding:22px 16px;text-align:center}
header h1{margin:0;font-size:1.35em}header p{margin:6px 0 0;opacity:.85;font-size:.95em}
main{max-width:460px;margin:0 auto;padding:14px}
.card{background:#fff;border-radius:12px;padding:16px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.card h2{margin:0 0 10px;font-size:1.05em;color:#2e6b34}
table{width:100%;border-collapse:collapse;font-size:.92em}td{padding:5px 0;border-bottom:1px solid #eee}
td:last-child{text-align:right;font-weight:600}
.ok{color:#2e7d32}.warn{color:#c77700}.err{color:#c62828}
label{display:block;margin:10px 0 4px;font-size:.9em}
select,input[type=text],input[type=password]{width:100%;box-sizing:border-box;padding:10px;font-size:1em;border:1px solid #bbb;border-radius:8px}
button{width:100%;padding:12px;margin-top:14px;font-size:1em;border:0;border-radius:8px;background:#2e6b34;color:#fff}
button.sec{background:#fff;color:#c62828;border:1px solid #c62828}
small{color:#666}
</style></head><body>
<header><h1>Bienvenido al Gateway Universal de DTA-Agrícola</h1><p>Configuración de la red WiFi</p></header><main>
)rawliteral";

const char PAGE_TAIL[] PROGMEM = R"rawliteral(</main></body></html>)rawliteral";

void sendPage(const String& body) {
  String page = FPSTR(PAGE_HEAD);
  page += body;
  page += FPSTR(PAGE_TAIL);
  server.send(200, "text/html; charset=utf-8", page);
}

String statusCard() {
  int st = wifiStateCode();
  String s = F("<div class='card'><h2>Estado</h2><table>");
  s += F("<tr><td>WiFi local</td><td class='");
  if (st == 2) s += F("ok'>Conectada");
  else if (st == 1) { s += F("warn'>Sin conexión ("); s += disconnectReason(); s += ')'; }
  else s += F("err'>Sin configurar");
  s += F("</td></tr>");
  if (st > 0) { s += F("<tr><td>Red</td><td>"); s += htmlEscape(WiFi.SSID()); s += F("</td></tr>"); }
  if (st == 2) {
    s += F("<tr><td>Dirección IP</td><td>"); s += WiFi.localIP().toString(); s += F("</td></tr>");
    s += F("<tr><td>Señal</td><td>"); s += WiFi.RSSI(); s += F(" dBm</td></tr>");
  }
  s += F("<tr><td>Envío al servidor</td><td>");
  if (st == 2) s += F("WiFi"); else s += F("GSM (respaldo)");
  s += F("</td></tr>");
  if (lastSendMs) {
    s += F("<tr><td>Último envío por WiFi</td><td class='");
    s += lastCode == 200 ? F("ok'>") : F("err'>");
    s += lastCode == 200 ? String(F("Correcto")) : String(F("Código ")) + lastCode;
    s += F(" · hace "); s += (millis() - lastSendMs) / 60000; s += F(" min</td></tr>");
  }
  s += F("<tr><td>Id del gateway (IMEI)</td><td>");
  s += gatewayImei.length() ? htmlEscape(gatewayImei) : String(F("—"));
  s += F("</td></tr><tr><td>Firmware WiFi</td><td>" FW_VERSION "</td></tr></table></div>");
  return s;
}

void handleRoot() {
  String s = statusCard();
  s += F("<div class='card'><h2>Conectar a la red local</h2><form method='POST' action='/guardar'>");
  s += F("<label>Red WiFi</label><select name='ssid'>");
  // La búsqueda de redes (~2 s) interrumpe un intento de conexión en curso: no se busca mientras se conecta
  bool scan = !connecting();
  int n = scan ? WiFi.scanNetworks() : 0;
  if (!scan) {
    s += F("<option value=\""); s += htmlEscape(WiFi.SSID()); s += F("\">"); s += htmlEscape(WiFi.SSID());
    s += F(" (conectando…)</option>");
  }
  if (scan && n <= 0) s += F("<option value=''>No se encontraron redes</option>");
  for (int i = 0; i < n; i++) {
    bool dup = false;                           // Una sola entrada por nombre
    for (int j = 0; j < i; j++) if (WiFi.SSID(j) == WiFi.SSID(i)) dup = true;
    if (dup || WiFi.SSID(i).length() == 0) continue;
    String name = htmlEscape(WiFi.SSID(i));
    s += F("<option value=\""); s += name; s += '"';
    if (WiFi.SSID(i) == WiFi.SSID()) s += F(" selected");
    s += '>'; s += name; s += F(" (");
    s += WiFi.RSSI(i); s += F(" dBm");
    if (WiFi.encryptionType(i) != ENC_TYPE_NONE) s += F(", con clave");
    s += F(")</option>");
  }
  if (scan) WiFi.scanDelete();
  s += F("</select><label>…o escribe el nombre de la red (si está oculta)</label>"
         "<input type='text' name='manual' autocapitalize='none' autocorrect='off'>"
         "<label>Clave de la red</label><input type='password' name='clave' id='clave'>"
         "<label><input type='checkbox' onclick=\"clave.type=this.checked?'text':'password'\"> Mostrar clave</label>"
         "<button type='submit'>Guardar y conectar</button></form>"
         "<p><small>La red se guarda en el módulo y se usa también después de un corte de energía.</small></p></div>");
  if (WiFi.SSID().length()) {
    s += F("<div class='card'><h2>Olvidar la red</h2><form method='POST' action='/olvidar'>"
           "<small>El gateway volverá a enviar sus datos solo por GSM.</small>"
           "<button class='sec' type='submit'>Olvidar la red guardada</button></form></div>");
  }
  sendPage(s);
}

void handleSave() {
  String ssid = server.arg(F("manual"));
  ssid.trim();
  if (ssid.length() == 0) ssid = server.arg(F("ssid"));
  String pass = server.arg(F("clave"));
  if (ssid.length() == 0 || ssid.length() > 32 || pass.length() > 64) {
    sendPage(F("<div class='card'><h2 class='err'>Datos incompletos</h2><p>Elige o escribe una red.</p>"
               "<a href='/'>Volver</a></div>"));
    return;
  }
  String s = F("<meta http-equiv='refresh' content='20;url=/'><div class='card'><h2>Conectando a ");
  s += htmlEscape(ssid);
  s += F("…</h2><p>En unos segundos verás el estado de la conexión.</p>"
         "<p><small>Si tu celular se desconecta un momento, vuelve a conectarte a la red <b>");
  s += apName;
  s += F("</b> y abre <b>192.168.4.1</b>.</small></p></div>");
  sendPage(s);
  delay(300);                                   // Que la página llegue antes de cambiar de canal
  WiFi.begin(ssid.c_str(), pass.c_str());       // Se guarda en la flash (WiFi.persistent)
  staState = STA_TRYING;
  staSinceMs = millis();
  staManual = true;
}

void handleForget() {
  WiFi.disconnect();                            // Borra la red guardada y deja la estación activa
  staState = STA_IDLE;
  sendPage(F("<meta http-equiv='refresh' content='3;url=/'><div class='card'><h2>Red olvidada</h2>"
             "<p>El gateway enviará sus datos por GSM.</p></div>"));
}

// Portal cautivo: cualquier dirección lleva a la página de bienvenida
void handleNotFound() {
  server.sendHeader(F("Location"), String(F("http://")) + WiFi.softAPIP().toString() + '/', true);
  server.send(302, "text/plain", "");
}

// ============================================================

void setup() {
  Serial.begin(LINK_BAUD);
  Serial.setDebugOutput(false);                 // Por el TX solo sale el protocolo con el Arduino
  WiFi.persistent(true);
  WiFi.mode(WIFI_AP_STA);
  snprintf(apName, sizeof apName, AP_PREFIX "%04X", (unsigned) (ESP.getChipId() & 0xFFFF));
  WiFi.softAP(apName, AP_PASSWORD);
  WiFi.setAutoConnect(false);                   // La reconexión la controla manageStation()
  WiFi.setAutoReconnect(false);
  if (WiFi.SSID().length()) staTry(false);      // Red guardada
  dns.start(53, "*", WiFi.softAPIP());
  server.on("/", HTTP_GET, handleRoot);
  server.on("/guardar", HTTP_POST, handleSave);
  server.on("/olvidar", HTTP_POST, handleForget);
  server.onNotFound(handleNotFound);
  server.begin();
}

void loop() {
  dns.processNextRequest();
  server.handleClient();
  handleLink();
  manageStation();
}
