// https://github.com/eligrey/FileSaver.js/tree/master/dist

function setDataFile(data) {
    var blob = new Blob([data], { type: "text/plain;charset=utf-8" });
    saveAs(blob, "testfile1.txt");
}