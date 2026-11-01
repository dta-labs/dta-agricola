const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const args = new Set(process.argv.slice(2));
const shouldDelete = args.has("--delete");
const printLocalOnly = args.has("--print-local");
const showHelp = args.has("--help") || args.has("-h");
const projectArg = process.argv.find((arg) => arg.startsWith("--project="));
const projectId = projectArg ? projectArg.slice("--project=".length) : null;
const functionsDir = path.resolve(__dirname, "..");
const indexPath = path.join(functionsDir, "index.js");

function usage() {
  console.log(`
Uso:
  npm run cleanup:stale
  npm run cleanup:stale:delete
  node scripts/cleanup-stale-functions.js --project=dta-agricola

Opciones:
  --delete       Elimina las funciones desplegadas que no existan en index.js.
  --project=ID   Usa un proyecto Firebase especifico.
  --print-local  Muestra solo las funciones exportadas localmente.
  --help         Muestra esta ayuda.

Sin --delete solo hace una simulacion.
`);
}

function readLocalFunctionNames() {
  const source = fs.readFileSync(indexPath, "utf8");
  const names = new Set();
  const exportPatterns = [
    /exports\.([A-Za-z_$][\w$]*)\s*=/g,
    /module\.exports\.([A-Za-z_$][\w$]*)\s*=/g,
  ];

  exportPatterns.forEach((pattern) => {
    let match = pattern.exec(source);
    while (match) {
      names.add(match[1]);
      match = pattern.exec(source);
    }
  });

  return names;
}

function runFirebase(argsList) {
  const finalArgs = projectId ? [...argsList, "--project", projectId] : argsList;
  return execFileSync("firebase", finalArgs, {
    cwd: functionsDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function parseFirebaseList(rawOutput) {
  const parsed = JSON.parse(rawOutput);
  const result = Array.isArray(parsed) ? parsed : parsed.result;
  const functions = Array.isArray(result) ? result : [];

  return functions
    .map((item) => {
      const rawName = item.id || item.name;
      const name = rawName && rawName.includes("/")
        ? rawName.split("/").pop()
        : rawName;

      return {
        name,
        region: item.region || item.location || "us-central1",
      };
    })
    .filter((item) => item.name);
}

function listRemoteFunctions() {
  const rawOutput = runFirebase(["functions:list", "--json"]);
  return parseFirebaseList(rawOutput);
}

function deleteRemoteFunction(remoteFunction) {
  runFirebase([
    "functions:delete",
    remoteFunction.name,
    "--region",
    remoteFunction.region,
    "--force",
  ]);
}

function main() {
  if (showHelp) {
    usage();
    return;
  }

  const localFunctions = readLocalFunctionNames();

  if (printLocalOnly) {
    console.log([...localFunctions].sort().join("\n"));
    return;
  }

  const remoteFunctions = listRemoteFunctions();
  const staleFunctions = remoteFunctions.filter((remoteFunction) =>
    !localFunctions.has(remoteFunction.name)
  );

  console.log("Funciones locales:");
  [...localFunctions].sort().forEach((name) => console.log(`  - ${name}`));

  console.log("\nFunciones desplegadas fuera de index.js:");
  if (staleFunctions.length === 0) {
    console.log("  Ninguna.");
    return;
  }

  staleFunctions.forEach((remoteFunction) => {
    console.log(`  - ${remoteFunction.name} (${remoteFunction.region})`);
  });

  if (!shouldDelete) {
    console.log("\nSimulacion completa. Ejecuta con --delete para eliminarlas.");
    return;
  }

  staleFunctions.forEach((remoteFunction) => {
    console.log(`Eliminando ${remoteFunction.name} (${remoteFunction.region})...`);
    deleteRemoteFunction(remoteFunction);
  });

  console.log("Limpieza completa.");
}

main();
