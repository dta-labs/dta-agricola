<?php
declare(strict_types=1);

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/Util.php';
require_once __DIR__ . '/HttpClient.php';
require_once __DIR__ . '/FirebaseClient.php';
require_once __DIR__ . '/Request.php';
require_once __DIR__ . '/LocalClock.php';
require_once __DIR__ . '/SystemSettings.php';
require_once __DIR__ . '/FileLogger.php';
require_once __DIR__ . '/AsyncCaller.php';
require_once __DIR__ . '/SensorDataParser.php';
require_once __DIR__ . '/Agronomy.php';
require_once __DIR__ . '/WeatherService.php';
require_once __DIR__ . '/StationCatalog.php';
require_once __DIR__ . '/SensorNetwork.php';
require_once __DIR__ . '/SensorFallback.php';
require_once __DIR__ . '/DayLogAggregator.php';
require_once __DIR__ . '/SensorDiscovery.php';
require_once __DIR__ . '/../src/SensorEndpoint.php';
require_once __DIR__ . '/../src/SensorDbUpdater.php';
require_once __DIR__ . '/../src/NeveraDbUpdater.php';
