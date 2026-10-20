#include <QMC5883L.h>
#include <Wire.h>

QMC5883L compass;

void setup()
{
	Wire.begin();

	compass.init();
	compass.setSamplingRate(150);

	Serial.begin(9600);
	Serial.println("QMC5883L Compass Demo");
	Serial.println("Turn compass in all directions to calibrate....");
  delay(5000);
}

void loop()
{
	int heading = compass.readHeading();
	if(heading==0) {
		/* Still calibrating, so measure but don't print */
    Serial.print("Calibrando... ");
    Serial.println(heading);
	} else {
		Serial.println(heading);
	}
  delay(1000);
}
