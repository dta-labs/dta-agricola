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

#pragma endregion Common

