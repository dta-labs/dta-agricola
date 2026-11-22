<?php
declare(strict_types=1);
use PHPUnit\Framework\TestCase;

final class SecurityTest extends TestCase {
    public function testShellCommandCannotBeInjected(): void {
        $cmd = AsyncCaller::buildCommand(AsyncCaller::buildUrl('https://x/ws', ['id' => '1"; rm -rf ~; echo "', 'data' => '$(reboot)`id`']));
        $this->assertStringStartsWith("curl -s -m 120 '", $cmd);
        $this->assertStringNotContainsString('$(reboot)', $cmd);
        $this->assertStringNotContainsString('"; rm', $cmd);
    }

    public function testSystemIdValidation(): void {
        $this->assertSame('861234567890123', (new Request(['id' => '861234567890123']))->systemId());
        $this->assertSame('24530080316', (new Request(['id' => ' 24530080316 ']))->systemId());
        foreach (['', '../users', 'a/b', 'a.b', 'x?print=pretty', 'a#b', 'a$b', 'a b'] as $bad) {
            $this->assertNull((new Request(['id' => $bad]))->systemId(), $bad);
        }
        $this->assertNull((new Request(['id' => ['x']]))->systemId());
    }
}
