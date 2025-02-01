<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

class SensorSystemTest extends TestCase
{
    private $sensorSystem;
    private $mockCurlHandle;

    protected function setUp(): void
    {
        // Configurar el ambiente de prueba
        $_GET = [];
        $this->sensorSystem = $this->getMockBuilder(SensorSystem::class)
            ->setConstructorArgs(['test-system'])
            ->onlyMethods(['executeRequest'])
            ->getMock();
    }

    protected function tearDown(): void
    {
        $_GET = [];
    }

    public function testConstructorInitializesCorrectly()
    {
        $sensorSystem = new SensorSystem('test-id');
        $this->assertInstanceOf(SensorSystem::class, $sensorSystem);
    }

    public function testFormatSettingsForDeviceReturnsCorrectFormat()
    {
        $mockSettings = (object)[
            'operationMode' => 'N',
            'sensors' => (object)[
                'sensorNumber' => 2,
                'S0' => (object)['id' => '001'],
                'S1' => (object)['id' => '002']
            ]
        ];

        $this->sensorSystem
            ->expects($this->once())
            ->method('executeRequest')
            ->willReturn($mockSettings);

        $result = $this->sensorSystem->formatSettingsForDevice();
        $this->assertEquals('"N"001"002"', $result);
    }

    public function testProcessDataInNormalMode()
    {
        $_GET['data'] = '[25.5,60.2]';
        $_GET['si'] = '80';
        $_GET['rx'] = 'Ok';

        $mockSettings = (object)[
            'operationMode' => 'N',
            'zona' => 0,
            'summerHour' => 0
        ];

        $this->sensorSystem
            ->expects($this->atLeastOnce())
            ->method('executeRequest')
            ->willReturn($mockSettings);

        $this->sensorSystem->processData();
        // La prueba pasa si no hay excepciones
        $this->assertTrue(true);
    }

    public function testProcessDataInDeviceMode()
    {
        $_GET['data'] = '[001,002]';

        $mockSettings = (object)[
            'operationMode' => 'D',
            'sensors' => (object)[
                'sensorNumber' => 2,
                'S0' => (object)['id' => '000'],
                'S1' => (object)['id' => '000']
            ]
        ];

        $this->sensorSystem
            ->expects($this->atLeastOnce())
            ->method('executeRequest')
            ->willReturn($mockSettings);

        $this->sensorSystem->processData();
        // La prueba pasa si no hay excepciones
        $this->assertTrue(true);
    }

    public function testProcessDataWithEmptyData()
    {
        $_GET['data'] = '[]';
        
        $this->sensorSystem
            ->expects($this->never())
            ->method('executeRequest');

        $this->sensorSystem->processData();
        $this->assertTrue(true);
    }
}
