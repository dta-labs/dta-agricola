let machineId = getURLParameter("id");
let machineData = getURLParameter("data");
if (machineId) {
    let accessType = processMachineData(machineId, machineData);
}

function processMachineData(machineId, machineData) {
    loadCamposFromFB().then(result => {
        let campos = result;
        let isValidId = false;
        for (let idx in campos) {
            let campo = campos[idx];
            if (campo.machine.serial == machineId) {
                //document.getElementById("data").innerHTML = JSON.stringify(campo.machine);
                document.write("Data: " + JSON.stringify(campo.machine));
                if (machineData) {
                    writeInFile(machineData);
                    // Llamar método para configurar la máquina...
                }
                isValidId = true;
            }
        }
        let accessType = !isValidId ? "Error id" : machineData ? "Write & Read" : "Read";
        updateNewAccessInFB(machineId, accessType, machineData);
        return accessType;
    });
}

function writeInFile(data) {
   var fso  = CreateObject("Scripting.FileSystemObject"); 
   var fh = fso.CreateTextFile("d:\\Test.txt", true); 
   fh.WriteLine(data); 
   fh.Close(); 
}
