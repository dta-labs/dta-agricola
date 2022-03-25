// Sensores

#include "analogo.h"

class Sensores {
	private:
	
		int pinSensorPresion = A0;                     // Presión de agua
		int pinSensorSeguridadAnalogico = A1;          // Segurdidad analógico
		int pinSensorSeguridadDigital = 9;             // Segurdidad digital
		int pinSensorVoltaje = 10          			   // Voltaje

	public:

		Sensores(int presionPin, int seguridadAPin, int seguridadDPin, int voltajePin) {
			pinSensorPresion = presionPin;
			pinSensorSeguridadAnalogico = seguridadAPin;
			pinSensorSeguridadDigital = seguridadDPin;
			pinSensorVoltaje = voltajePin;
			Analogo presion = Analogo(pinSensorPresion, false);
		}
		
		bool controlSeguridad() {
			bool sensorSeguridadD = digitalRead(pinSensorSeguridad);
			bool sensorSeguridadA = getCorriente();
			if (!sensorSeguridadD && !sensorSeguridadA) {
				Serial.println(F("    Falla sensor de seguridad... reintentando!"));
				setDirection();
				wdt_reset();
				sensorSeguridadD = digitalRead(pinSensorSeguridad);
				sensorSeguridadA = getCorriente();
				if (!sensorSeguridadD && !sensorSeguridadA) {
					Serial.println(F("    Falla sensor de seguridad... reintentando nuevamente!"));
					setDirection();
					wdt_reset();
				}
				sensorSeguridadD = digitalRead(pinSensorSeguridad);
				sensorSeguridadA = getCorriente();
				if (!sensorSeguridadD && !sensorSeguridadA) {
					Serial.println(F("   Sistem off: Stuck alarm!"));
					statusVar = "OFF";
					apagar(); 
					for (int i = 0; i < 60; i++){
						delay(1000);
						wdt_reset();
					}
				}
			}
			return sensorSeguridadD | sensorSeguridadA;
		}

		bool getCorriente() {
			float sensibilidad = 0.185;
			float valorReferencia = 5;
			float valorReposo = 2.5;
			float I = 0;
			float Ipico = 0;
			float Imin = 0;
			float Imax = 0;
			float ruido = 0.07;
			unsigned long tiempo = millis();
			while (millis() - tiempo < 120) { // medir por 120ms
				float Vin = analogRead(pinSensorSeguridadAnalogico);
				float acs712 = Vin * valorReferencia / 1023;
				I = 0.9 * I + 0.1 * (acs712 - valorReposo) / sensibilidad;
				if (I > Imax) Imax = I;
				if (I < Imax) Imin = I;
			}
			Ipico = Imax - ruido;
			float Irms = Ipico * 0.707;  // I RMS = Ipico / (2^1/2)
			digitalWrite(13, (Irms >= 0.10) ? HIGH : LOW);
			return (Irms >= 0.10) ? true : false;
		}

		bool controlVoltaje() {
		  // bool sensorVoltaje = true;
		  bool sensorVoltaje = digitalRead(pinSensorVoltaje);
		  if (!sensorVoltaje) {
			Serial.println(F("Sistem off: Electric alarm!"));
			apagar();
		  }
		  return sensorVoltaje;
		}

		bool controlPresion(int sensorPresionVar) {
		  bool result = true;
		  if (sensorPresionVar != 0) {
			result = (controlPresionAnalogica() > 1) ? true : false;
		  }
		  return result;
		}

		float controlPresionAnalogica(int sensorPresionVar) {
		  float presionActual = 0.0f;
		  for (int i = 0; i < 3; i++) {
			float pAnalog = presion.getAnalogValue();
			float temp = presion.fmap(pAnalog, 100, 1023, 0.0, sensorPresionVar);
			presionActual += temp > 0 ? temp : 0;
			delay(10);
		  }
		  presionActual = presionActual / 3;
		  Serial.print(F("PresionF: "));
		  Serial.println((String) presionActual);
		  return presionActual;
		}

}

