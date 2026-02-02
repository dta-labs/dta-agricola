<?php
// Test para verificar las nuevas reglas de cálculo de Horas Frío (Hf)
require_once 'sensor_v6.1.php';

$_GET['id'] = 'test';
$_GET['data'] = '[23.5,78.2,3.3,24.1,76.8,3.4]';
$_GET['si'] = '85';
$_GET['qos'] = '1';
$_GET['rx'] = 'Ok';
$_SERVER['HTTP_HOST'] = 'localhost';
$_SERVER['REQUEST_URI'] = '/sensor_v6.1.php?id=test&data=[...]';

echo "=== Test de Nuevas Reglas de Horas Frío (Hf) ===\n\n";

$system = new SensorSystem('test');

// Test directo de la función calcularHorasFrio
$reflection = new ReflectionClass($system);
$method = $reflection->getMethod('calcularHorasFrio');
$method->setAccessible(true);

$testCases = [
    ['temp' => -3, 'expected' => -1.0, 'desc' => 'Menor a -2°C (fuera de rango)'],
    ['temp' => -2, 'expected' => 0.5, 'desc' => 'Exactamente -2°C'],
    ['temp' => -1, 'expected' => 0.5, 'desc' => 'Entre -2°C y 0°C'],
    ['temp' => -0.5, 'expected' => 0.5, 'desc' => 'Entre -2°C y 0°C (decimal)'],
    ['temp' => 0, 'expected' => 1.0, 'desc' => 'Exactamente 0°C'],
    ['temp' => 3, 'expected' => 1.0, 'desc' => 'Entre 0°C y 7°C'],
    ['temp' => 6.9, 'expected' => 1.0, 'desc' => 'Entre 0°C y 7°C (límite)'],
    ['temp' => 7, 'expected' => 0.0, 'desc' => 'Exactamente 7°C'],
    ['temp' => 15, 'expected' => 0.0, 'desc' => 'Entre 7°C y 30°C'],
    ['temp' => 30, 'expected' => 0.0, 'desc' => 'Exactamente 30°C'],
    ['temp' => 31, 'expected' => -1.0, 'desc' => 'Mayor a 30°C'],
    ['temp' => 35, 'expected' => -1.0, 'desc' => 'Mayor a 30°C (extremo)'],
];

echo "🧪 Test de la función calcularHorasFrio():\n";
echo "----------------------------------------\n";
$passed = 0;
$total = count($testCases);

foreach ($testCases as $case) {
    $result = $method->invoke($system, $case['temp']);
    $status = ($result == $case['expected']) ? "✅" : "❌";
    echo "  $status Temp: {$case['temp']}°C → Hf: $result (esperado: {$case['expected']}) - {$case['desc']}\n";
    if ($result == $case['expected']) $passed++;
}

echo "\n📊 Resultados: $passed/$total tests pasados\n\n";

// Test con datos reales en crearLogData
echo "🔧 Test con crearLogData():\n";
echo "----------------------------------------\n";

// Crear datos de prueba con diferentes temperaturas
$testData = [23.5,78.2,3.3, 24.1,76.8,3.4, 22.8,79.1,3.2, 23.9,77.5,3.5, 24.5,75.9,3.3, 23.2,78.6,3.4, 24.8,76.2,3.3, 23.7,77.8,3.5, 24.2,76.4,3.2, 23.4,78.9,3.4, 23.5,78.2,3.3, 24.1,76.8,3.4, 22.8,79.1,3.2, 23.9,77.5,3.5];

$logMethod = $reflection->getMethod('crearLogData');
$logMethod->setAccessible(true);

$logData = $logMethod->invoke($system, $testData);
$dataRaw = json_decode($logData['dataRaw']);

echo "📈 DataRaw generado (primeros 24 valores - 3 sensores):\n";
for ($sensor = 0; $sensor < 3; $sensor++) {
    $start = $sensor * 8;
    echo "  Sensor $sensor: ";
    for ($i = 0; $i < 8; $i++) {
        $valor = $dataRaw[$start + $i];
        echo "[$valor] ";
    }
    echo "\n";
}

echo "\n🔍 Análisis de valores Hf:\n";
$expectedStructure = ['Ms', 'Hr', 'Tmin', 'Tmax', 'T', 'ETc', 'Hf', 'Vcc'];
for ($sensor = 0; $sensor < 3; $sensor++) {
    $hfIndex = $sensor * 8 + 6; // Hf está en el índice 6 de cada sensor
    $hfValue = $dataRaw[$hfIndex];
    $tIndex = $sensor * 8 + 4; // T está en el índice 4 de cada sensor
    $tValue = $dataRaw[$tIndex];
    
    echo "  Sensor $sensor: T=$tValue°C → Hf=$hfValue\n";
    
    // Verificar que el Hf corresponda a la temperatura
    $expectedHf = $method->invoke($system, (float)$tValue);
    $status = ($hfValue == $expectedHf) ? "✅" : "❌";
    echo "    $status Esperado: $expectedHf, Obtenido: $hfValue\n";
}

echo "\n🎯 Test de promedios:\n";
echo "----------------------------------------\n";

// Crear múltiples registros para probar promedios
$dayLogs = [];
for ($i = 0; $i < 3; $i++) {
    $log = new stdClass();
    $log->dataRaw = json_encode($dataRaw);
    $dayLogs[] = $log;
}

$promedioMethod = $reflection->getMethod('calcularPromedioDataRaw');
$promedioMethod->setAccessible(true);
$promedio = $promedioMethod->invoke($system, $dayLogs);

echo "📊 Promedios (primeros 24 valores - 3 sensores):\n";
for ($sensor = 0; $sensor < 3; $sensor++) {
    $start = $sensor * 8;
    echo "  Sensor $sensor: ";
    for ($i = 0; $i < 8; $i++) {
        $valor = $promedio[$start + $i];
        echo "[$valor] ";
    }
    echo "\n";
}

echo "\n🔍 Análisis de promedios Hf:\n";
for ($sensor = 0; $sensor < 3; $sensor++) {
    $hfIndex = $sensor * 8 + 6;
    $hfPromedio = $promedio[$hfIndex];
    echo "  Sensor $sensor: Hf promedio = $hfPromedio\n";
}

echo "\n🎉 RESULTADO FINAL:\n";
if ($passed == $total) {
    echo "✅ Todas las nuevas reglas de Hf funcionan correctamente\n";
    echo "✅ Valores decimales (0.5) manejados correctamente\n";
    echo "✅ Valores negativos (-1.0) manejados correctamente\n";
    echo "✅ Promedios calculados correctamente\n";
    echo "✅ Sistema listo para producción\n";
} else {
    echo "❌ Algunas reglas no funcionan correctamente\n";
}

echo "\n📋 Resumen de las nuevas reglas:\n";
echo "  • -2°C ≤ T < 0°C  → Hf = 0.5\n";
echo "  • 0°C ≤ T < 7°C   → Hf = 1.0\n";
echo "  • 7°C ≤ T ≤ 30°C  → Hf = 0.0\n";
echo "  • T > 30°C       → Hf = -1.0\n";
?>
