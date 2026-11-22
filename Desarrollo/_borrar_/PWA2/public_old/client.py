# Para instalar el SDK de Firebase en Python: pip install firebase-admin
# Referencia: https://rakibul.net/fb-realtime-db-python


#!/usr/bin/python
# -*- coding: iso-8859-15 -*-


import time
import firebase_admin
from firebase_admin import credentials
from firebase_admin import db

monitoring = True
monitoringTime = 5
machineId = '00001'
data = {
    'machineId': '00001',
    'machineState': 'on',
    'machineControlH': b"FF",
    'machineControlL': b"FF",
    'machineVelocity': b"0A",
    'machineSteepH': b"F0",
    'machineSteepL': b"0F"
}

# region Firebase


cred = credentials.Certificate('firebase-adminsdk.json')
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://dta-agricola.firebaseio.com'
})


def pushData(table, machineId, data):
    ref = db.reference(table + '/' + machineId)
    new_access_ref = ref.push({
        'date': str(time.time()),
        'machineControlH': data['machineControlH'],
        'machineControlL': data['machineControlL'],
        'machineVelocity': data['machineVelocity'],
        'machineSteepH': data['machineSteepH'],
        'machineSteepL': data['machineSteepL']
    })
    access_id = new_access_ref.key
    print(access_id)


def getData(table, machineId):
    ref = db.reference(table)
    for val in ref.get():
        if val['machine']['serial'] == machineId:
            print('{0}'.format(val['name']))
            actualData = {}
            setVariablesFromFB(actualData, val)
            writeFile(actualData)


# endregion Firebase

# region IO


def readFile():
    f = open('data.txt', 'r')
    dataStr = str(f.read())
    f.close()
    return dataStr


def writeFile(data):
    dataStr = data['machineControlH'].decode() + data['machineControlL'].decode() + \
        data['machineVelocity'].decode() + data['machineSteepH'].decode() + \
        data['machineSteepL'].decode()
    print(dataStr)
    f = open('data.txt', 'w')
    f.write(dataStr)
    f.close()


# endregion IO

# region Control


def setVariables(actualData, newData):
    actualData['machineControlH'] = newData[0:2].encode()
    actualData['machineControlL'] = newData[2:4].encode()
    actualData['machineVelocity'] = newData[4:6].encode()
    actualData['machineSteepH'] = newData[6:8].encode()
    actualData['machineSteepL'] = newData[8:10].encode()


def setVariablesFromFB(actualData, newData):
    actualData['machineState'] = newData['machine']['state'].encode()
    state = b"00"
    if actualData['machineState'] == 'on':
        state = b"FF"
    actualData['machineControlH'] = state
    actualData['machineControlL'] = state
    actualData['machineVelocity'] = newData['machine']['velocity'].encode()
    actualData['machineSteepH'] = newData['machine']['startAngle'].encode()
    actualData['machineSteepL'] = newData['machine']['endAngle'].encode()


def monitor():
    global monitoring
    global monitoringTime
    global machineId
    while monitoring:
        actualState = readFile()
        print(actualState)
        getData('campos', machineId)
        time.sleep(monitoringTime)


# endregion Control


############## main ##############


if __name__ == "__main__":

    monitor()
