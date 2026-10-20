#include <SoftwareSerial.h>

SoftwareSerial sim800(3, 4); // RX, TX

String sendATCommand(String cmd, int wait = 15, bool response = false) {
  sim800.println(cmd);
  delay(wait);  // Pequeña espera inicial tras enviar
  String result = "";
  unsigned long timeout = millis() + 5000; // Espera máxima de 5s
  unsigned long interByteTimer = millis();
  while (millis() < timeout) {
    while (sim800.available()) {
      char c = sim800.read();
      result += c;
      interByteTimer = millis(); // Reinicia cuando llega un byte
    }
    // Si pasaron 200ms sin recibir nada más, asumimos fin
    if (result.length() > 0 && (millis() - interByteTimer > 200)) {
      break;
    }
  }
  if (response) Serial.println(result);
  return result;
}

void setup() {
  Serial.begin(250000);
  sim800.begin(9600);
}

void loop() {
  Serial.println(F("\n=== Test SIM800L ===\n"));
  enviarComando("AT", "Comunicacion con modulo");                 // 1. Verificar comunicación
  enviarComando("AT+CREG?", "Registro en red");                   // 3. Verificar registro en red
  obtenerCCID();                                                  // 4. Obtener CCID
  obtenerRSSI();                                                  // 5. Obtener RSSI
  enviarComando("AT+CESQ", "QoS de la red");                      // 6. Calidad de comunicación (QoS)
  sendATCommand("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\"");             // 7. HTTP GET al web service
  sendATCommand("AT+SAPBR=3,1,\"APN\",\"internet.itelcel.com\"");
  sendATCommand("AT+SAPBR=3,1,\"USER\",\"webgpr\"");
  sendATCommand("AT+SAPBR=3,1,\"PWD\",\"webgprs2002\"");
  sendATCommand("AT+SAPBR=1,1");
  sendATCommand("AT+HTTPINIT");
  sendATCommand("AT+HTTPPARA=\"CID\",1");
  sendATCommand("AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/testgsm.php?id=dta_test_gsm\"", 15, true);
  sendATCommand("AT+HTTPACTION=0", 10000);
  sendATCommand("AT+HTTPREAD", 300, true);
  delay(1000);
}

void enviarComando(String comando, String etiqueta) {
  sim800.println(comando);
  delay(1000);
  String respuesta = leerRespuesta();
  if (respuesta.indexOf("OK") != -1) {
    Serial.println(etiqueta + ": OK");
  } else if (respuesta.indexOf("ERROR") != -1) {
    Serial.println(etiqueta + ": ERROR");
  } else {
    Serial.println(etiqueta + ": " + respuesta);
  }
}

void obtenerCCID() {
  sim800.println("AT+CCID");
  delay(1000);
  String respuesta = leerRespuesta();
  int pos = respuesta.indexOf("+CCID:");
  if (pos != -1) {
    String ccid = respuesta.substring(pos + 6);
    ccid.trim();
    Serial.println("CCID: " + ccid);
  }
}

void obtenerRSSI() {
  sim800.println("AT+CSQ");
  delay(1000);
  String respuesta = leerRespuesta();
  int pos = respuesta.indexOf("+CSQ:");
  if (pos != -1) {
    String datos = respuesta.substring(pos + 5);
    datos.trim();
    int coma = datos.indexOf(",");
    int rssi = datos.substring(0, coma).toInt();
    int porcentaje = (rssi * 100) / 31;
    Serial.print("RSSI: ");
    Serial.print(rssi);
    Serial.print(" (");
    Serial.print(porcentaje);
    Serial.println("%)");
  }
}

String leerRespuesta() {
  String resp = "";
  long tiempo = millis();
  while (millis() - tiempo < 2000) {
    while (sim800.available()) {
      char c = sim800.read();
      resp += c;
    }
  }
  return resp;
}