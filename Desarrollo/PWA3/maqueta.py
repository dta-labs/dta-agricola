#!/usr/bin/python
import sys
import time
path = "/sys/class/gpio/gpio"
flash = True

def sendCommand(command, pin, value):
    fo = open(path + pin + "/" + command, "w")
    fo.write(value)
    fo.close()
    return

def flash1(pin, temp):
    while flash:
        sendCommand(command="value", pin=pin, value="1")
        time.sleep(temp)
        sendCommand(command="value", pin=pin, value="0")
    return

def flash2(pin, temp):
    while flash:
        sendCommand(command="value", pin=pin, value="1")
        time.sleep(temp)
        sendCommand(command="value", pin=pin, value="0")
    return

print "Iniciando el script Maqueta"

sendCommand(command="direction", pin="44", value="out")
sendCommand(command="direction", pin="46", value="out")

try:
    flash1(pin="44", temp=0.5)
    flash2(pin="46", temp=1.5)
except KeyboardInterrupt:
    flash = False
    sendCommand(command="value", pin="44", value="0")
    sendCommand(command="value", pin="46", value="0")
    exit()

print "Fin el script Maqueta"