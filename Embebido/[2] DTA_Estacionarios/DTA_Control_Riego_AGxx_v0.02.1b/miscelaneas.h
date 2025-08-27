#pragma region Common

bool checkData(String data, int ctrl) {
  if (data == F("")) return false;
  int contador = 0;
  for (int i = 0; i < data.length(); i++) {
    if (data[i] == '\"') {  
      contador++;
    }
  }
  return contador >= ctrl;
}

bool isNumber(String str) {
  for (char c : str) { // Iteramos sobre cada carácter
    if (!isDigit(c)) return false; // Si encuentra un carácter no numérico, retorna falso
  }
  return true;
}

#pragma endregion Common

