#pragma region Common

String fillNumber(int number, byte positions) {
  String numberStr = ((String) number);
  byte cerosLength = positions - numberStr.length();
  String result = "";
  for (byte i = 0; i < cerosLength; i++) {
    result += "0";
  }
  return result + numberStr;
}

bool checkData(String data, int ctrl) {
  if (data == "") return false;
  int contador = 0;
  for (int i = 0; i < data.length(); i++) {
    if (data[i] == '\"') {  
      contador++;
    }
  }
  return contador >= ctrl;
}

#pragma endregion Common

