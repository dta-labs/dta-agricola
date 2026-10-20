#pragma region Common

void(* resetSoftware)(void) = 0;

int freeRam() {
    extern int __heap_start, *__brkval;
    int v;
    return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval);
}

void systemWatchDog() {
  pinMode(watchDogPin, OUTPUT);         // Sink current to drain charge from C2
  digitalWrite(watchDogPin, HIGH);
  delay(50);                            // Give enough time for C2 to discharge (should discharge in 50 ms)     
  pinMode(watchDogPin, INPUT);          // Return to high impedance
  // Serial.print(F("\nMemoria libre: ")); Serial.println(freeRam());
}

int calculateSum(String str) {
  int sum = 0;
  for (int i = 0; i < str.length(); i++) sum += str[i];
  return sum;
}

bool isHexadecimal(String cadena) {
    if (cadena.length() < 3) return false;
    if (cadena.substring(0, 2) != "0x") return false;
    for (int i = 2; i < cadena.length(); i++) {
        char c = cadena[i];
        if (!isDigit(c) && !(c >= 'A' && c <= 'F')) return false;
    }
    return true;
}

bool isNumber(String str) {
  for (char c : str) { // Iteramos sobre cada carácter
    if (!isDigit(c)) return false; // Si encuentra un carácter no numérico, retorna falso
  }
  return true;
}

#pragma endregion Common
