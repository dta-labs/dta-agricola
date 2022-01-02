#include <SoftwareSerial.h>
#include <TinyGPS.h>
#include <SimpleKalmanFilter.h>

TinyGPS gps;
SoftwareSerial ss(12, 11);
SimpleKalmanFilter kalmanFilter(2, 2, 0.01);

float lat_central = 28.407291;
float lon_central = -106.863456;
int frecuence =  1000;

void setup() {
  Serial.begin(115200);
  ss.begin(9600);
  Serial.println("LATITUD\t\tLONGITUD\tSAT\tAZIMUT\tKALMAN\tERROR");
}

void loop() {
  bool newData = parseGPSData();
  printGPSData(newData);
  checkGPSConnection();
}

bool parseGPSData() {
  bool newData = false;
  // Se parsean por un segundo los datos del GPSy se reportan algunos valores clave
  for (unsigned long start = millis(); millis() - start < frecuence;) {
    while (ss.available()) {
      char c = ss.read();
      Serial.write(c);   // descomentar para ver el flujo de datos del GPS
      if (gps.encode(c))    // revisa si se completó una nueva cadena
        newData = true;
    }
  }
  return newData;
}

void printGPSData(bool newData) {
  if (newData) {
    float flat, flon, azimut;
    unsigned long age;
    gps.f_get_position(&flat, &flon, &age);
    Serial.print(flat == TinyGPS::GPS_INVALID_F_ANGLE ? 0.0 : flat, 6);
    Serial.print("\t");
    Serial.print(flon == TinyGPS::GPS_INVALID_F_ANGLE ? 0.0 : flon, 6);
    Serial.print("\t");
    Serial.print(gps.satellites() == TinyGPS::GPS_INVALID_SATELLITES ? 0 : gps.satellites());
    Serial.print("\t");
    azimut = gps.course_to(lat_central, lon_central, flat, flon);
    Serial.print((int)azimut);
    Serial.print("\t");
    float estimatedAzimut = kalmanFilter.updateEstimate(azimut);
    Serial.print((int)estimatedAzimut);
    Serial.print("\t");
    Serial.println(gps.hdop() == TinyGPS::GPS_INVALID_HDOP ? 0 : gps.hdop());
  }
}

void checkGPSConnection() {
  unsigned long chars;
  unsigned short sentences, failed;
  gps.stats(&chars, &sentences, &failed);
  if (chars == 0) {
    Serial.println("Problema de conectividad con el GPS: revise el cableado");
  }
}
