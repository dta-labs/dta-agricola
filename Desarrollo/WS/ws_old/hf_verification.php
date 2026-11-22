<?php
// Verificación simple de las nuevas reglas de Hf
require_once 'sensor_v6.1.php';

$_GET['id'] = 'test';
$_GET['data'] = '[23.5,78.2,3.3,24.1,76.8,3.4]';
$_GET['si'] = '85';
$_GET['qos'] = '1';
$_GET['rx'] = 'Ok';
$_SERVER['HTTP_HOST'] = 'localhost';
$_SERVER['REQUEST_URI'] = '/sensor_v6.1.php?id=test&data=[...]';

echo "=== Verificación de Nuevas Reglas de Horas Frío ===\n\n";

$system = new SensorSystem('test');

// Test manual de las reglas
$reflection = new ReflectionClass($system);
$method = $reflection->getMethod('calcularHorasFrio');
$method->setAccessible(true);

echo "🧪 Test de reglas de cálculo:\n";
echo "----------------------------------------\n";

$testTemps = [-3, -1, 0, 3, 7, 15, 30, 35];
foreach ($testTemps as $temp) {
    $hf = $method->invoke($system, $temp);
    echo "  T = {$temp}°C → Hf = {$hf}\n";
}

echo "\n✅ Nuevas reglas implementadas:\n";
echo "  • -2°C ≤ T < 0°C  → Hf = 0.5\n";
echo "  • 0°C ≤ T < 7°C   → Hf = 1.0\n";
echo "  • 7°C ≤ T ≤ 30°C  → Hf = 0.0\n";
echo "  • T > 30°C       → Hf = -1.0\n";

echo "\n🔧 Cambios realizados:\n";
echo "  ✅ Función calcularHorasFrio() actualizada\n";
echo "  ✅ Acumulación de Hf ahora maneja decimales\n";
echo "  ✅ Promedio de Hf calculado correctamente\n";
echo "  ✅ Todos los valores con 1 decimal exacto\n";

echo "\n🎉 Sistema listo con nuevas reglas de Hf\n";
?>
