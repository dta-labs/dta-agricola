#!/usr/bin/python
import sys
LED3_PATH = "/sys/class/leds/beaglebone:green:usr3"

def writeLED(filename, value, path=LED3_PATH):
    fo = open(path + filename, "w")
    fo.write(value)
    fo.close()
    return

def removeTrigger():
    writeLED(filename="/trigger", value="none")
    return

print "Iniciando el script LED"

if len(sys.arg) != 2:
    print "Error de sintaxis debe emplearse: pythonLED.py [on/off/flash/status]"
    sys.exit(2)
if sys.argv[1] == "on":
    removeTrigger()
    writeLED(filename="/brightness", value="1")
elif sys.argv[1] == "off":
    removeTrigger()
    writeLED(filename="/brightness", value="0")
elif sys.argv[1] == "flash":
    writeLED(filename="/trigger", value="timer")
    writeLED(filename="/delay_on", value="50")
    writeLED(filename="/delay_off", value="50")
elif sys.argv[1] == "status":
    fo = open(LED3_PATH + "/trigger", "r")
    print fo.read()
    fo.close()
else:
    print "Comando no válido"

print "Fin el script LED"