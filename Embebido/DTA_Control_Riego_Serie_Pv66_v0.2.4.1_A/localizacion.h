// Sensores

#include <SoftwareSerial.h>
#include <TinyGPS.h>
#include <QMC5883LCompass.h>

class Localizacion {
	private:
		TinyGPS gps;
		String positionSensor = "GPS";

	public:

		Localizacion(int Rx, int Tx) {
			SoftwareSerial ssGPS(Rx, Tx);                   // RX, TX	
		}
		
		float getPosition() {
			float newPosition = (positionSensor == "GPS") ? getGPSPosition() : getCompassPosition();
			//  if (lat_central * lon_central != 0.0f) { 
			//    float movementEstimation = velocityVar / 100;
			//    if (directionVar == "FF") {             // Filtro ascendente
			//      newPosition = (statusVar == "OFF") ? positionVar : (positionVar <= newPosition && newPosition <= positionVar + 2) || (positionVar == 359 && (newPosition == 360 || (0 <= newPosition && newPosition <= 2))) ? newPosition : (positionVar + movementEstimation > 360) ? positionVar + movementEstimation - 360 : positionVar + movementEstimation;
			//    } else {                                // Filtro descendente
			//      newPosition = (statusVar == "OFF") ? positionVar : (positionVar - 2 <= newPosition && newPosition <= positionVar) || (positionVar == 0 && (newPosition == 360 || (358 <= newPosition && newPosition <= 360))) ? newPosition : (positionVar - movementEstimation < 0) ? positionVar - movementEstimation + 360 : positionVar - movementEstimation;
			//    }
			//  }
			Serial.print("newPosition filtered: ");
			Serial.println(newPosition);
			return newPosition;
		}

		// GPS
		
		float getGPSPosition(float positionVar) {                  			// Posición por GPS
		  float azimut = positionVar;
		  bool newData = parseGPSData();
		  lat_central = (lat_central == 0) ? eeVar.lat_central : lat_central;
		  lon_central = (lon_central == 0) ? eeVar.lon_central : lon_central;
		  if (newData) {
			unsigned long age;
			gps.f_get_position(&lat_actual, &lon_actual, &age);
			azimut = gps.course_to(lat_central, lon_central, lat_actual, lon_actual);
			errorGPS = gps.hdop() == TinyGPS::GPS_INVALID_HDOP ? 0 : gps.hdop();
			// printGPSData(lat_actual, lon_actual, azimut, errorGPS);
		  }
		  checkGPSConnection();
		  return azimut;
		}

		bool parseGPSData() {
		  bool newData = false;
		  ssGPS.listen();
		  // Se parsean por un segundo los datos del GPSy se reportan algunos valores clave
		  for (unsigned long start = millis(); millis() - start < frecuence;) {
			while (ssGPS.available()) {
			  char c = ssGPS.read();
			  // Serial.write(c);   // descomentar para ver el flujo de datos del GPS
			  if (gps.encode(c))    // revisa si se completó una nueva cadena
				newData = true;
			}
		  }
		  return newData;
		}

		float printGPSData(float flat, float flon, float azimut, int errorGPS) {
		  Serial.print(lat_central, 6);
		  Serial.print(",");
		  Serial.print(lon_central, 6);
		  Serial.print(" ");
		  Serial.print(flat == TinyGPS::GPS_INVALID_F_ANGLE ? 0.0 : flat, 6);
		  Serial.print(",");
		  Serial.print(flon == TinyGPS::GPS_INVALID_F_ANGLE ? 0.0 : flon, 6);
		  Serial.print(" ");
		  Serial.print(gps.satellites() == TinyGPS::GPS_INVALID_SATELLITES ? 0 : gps.satellites());
		  Serial.print(" ");
		  Serial.print((int)azimut);
		  Serial.print(" ");
		  Serial.println(errorGPS);
		}

		void checkGPSConnection() {
		  unsigned long chars;
		  unsigned short sentences, failed;
		  gps.stats(&chars, &sentences, &failed);
		  if (chars == 0) {
			Serial.println("Problema de conectividad con el GPS: revise el cableado");
		  }
		}

		// Brújula
		
		float getCompassPosition() {               			// Posición por Brújula
		  compass.read();
		  delay(1000);
		  return (float) compass.getAzimuth();
		}

		void setupCompass() {
		  compass.init();                                             // Inicializar brújula
		  // compass.setMode(0x01,0x0C,0x10,0xC0);
		  compass.setSmoothing(10, true);  
		  compass.setCalibration(-511, 1017, 0, 2027, 0, 315);    // Calibrar brújula
		}

}

