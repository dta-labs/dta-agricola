#pragma region Common

void(* resetSoftware)(void) = 0;

String fillNumber(int number, byte positions) {
  String numberStr = ((String) number);
  byte cerosLength = positions - numberStr.length();
  String result = "";
  for (byte i = 0; i < cerosLength; i++) {
    result += "0";
  }
  return result + numberStr;
}

String parse(String dataString, char separator, int index) {
  int found = 0;
  int strIndex[] = {0, -1};
  int maxIndex = dataString.length()-1;
  for(int i = 0; i <= maxIndex && found <= index; i++) {
    if(dataString.charAt(i) == separator || i == maxIndex) {
        found++;
        strIndex[0] = strIndex[1]+1;
        strIndex[1] = (i == maxIndex) ? i+1 : i;
    }
  }
  return found > index ? dataString.substring(strIndex[0], strIndex[1]) : "";
}

int calculateSum(String str) {
  int sum = 0;
  for (int i = 0; i < str.length(); i++) sum += str[i];
  return sum;
}

bool checkData(String data) {
  int idx = data.lastIndexOf(",") + 1;
  int dataCheckSum = (data.substring(idx)).toInt();
  data = data.substring(0, idx);
  int calculatedCheckSum = calculateSum(data);
  return dataCheckSum == calculatedCheckSum;
}

#pragma endregion Common
