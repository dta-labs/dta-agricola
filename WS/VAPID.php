<?php
require 'vendor/autoload.php';

use Minishlink\WebPush\VAPID;

print_r(VAPID::createVapidKeys());

// (
//     [publicKey] => BG1caHGzzvPNBWM4NuN5oIpqaRaVFKld8iwNtpx100P3bkMYhEDYfWcCs9sy0Ay3t170750tQlLM8XCzxpysD7o        
//     [privateKey] => 2H6ygT5NVsLJenYenTLIiUBZ47RdgVCG_cw8mJ9L9cY
// )