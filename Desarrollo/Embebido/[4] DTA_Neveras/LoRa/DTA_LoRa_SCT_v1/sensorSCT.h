#pragma region Sensor SCT013

#include <EmonLib.h>

EnergyMonitor emon[2];
String idSCT = "42000001";

String setupSCT() {
  emon[0].current(A0, 50.0);
  emon[1].current(A1, 50.0);
  return idSCT;
}

float getIrms(uint8_t sensorIndex) {
  if (sensorIndex > 1) return NAN;
  float val = emon[sensorIndex].calcIrms(1480);
  return val > 1 ? val : 0;
}

#pragma endregion Sensor SCT013
