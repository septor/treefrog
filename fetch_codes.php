<?php
header('Content-Type: application/json');

$filename = './vault/src/data.json'; // NOTE: this is pointing to a dummy copy of the actual file that will be used

if (!file_exists($filename)) {
    echo json_encode(["error" => "File not found"]);
    exit;
}

$data = json_decode(file_get_contents($filename), true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(["error" => "Failed to parse JSON"]);
    exit;
}

$action = isset($_POST['action']) ? $_POST['action'] : null;

if ($action === 'viewq') {
    $statusFilter = isset($_POST['status']) ? $_POST['status'] : null;

    if ($statusFilter) {
        $filteredCodes = array_filter($data['codes'], function($details) use ($statusFilter) {
            return $details['status'] === $statusFilter;
        });
        $codes = array_keys($filteredCodes);
    } else {
        $needsVerified = array_filter($data['codes'], function($details) {
            return $details['status'] === 'needs_verified';
        });
        $needsProcessed = array_filter($data['codes'], function($details) {
            return $details['status'] === 'needs_processed';
        });
        $codes = array_merge(array_keys($needsVerified), array_keys($needsProcessed));
    }

    echo json_encode($codes);
    exit;
}

if ($action === 'codecheck') {
    $statusFilter = isset($_POST['status']) ? $_POST['status'] : null;
    
    if ($statusFilter) {
        $filteredCodes = array_filter($data['codes'], function($details) use ($statusFilter) {
            return $details['status'] === $statusFilter && !empty($details['credit']);
        });
        $codes = array_keys($filteredCodes);
        $response = [];
        foreach ($codes as $code) {
            $response[] = ['code' => $code, 'credit' => $data['codes'][$code]['credit']];
        }
        echo json_encode($response);
        exit;
    }
}

if ($action === 'checkusercodes') {
    $credit = isset($_POST['credit']) ? $_POST['credit'] : null;

    if ($credit === null) {
        echo json_encode(["error" => "Credit parameter is required"]);
        exit;
    }

    $userCodes = array_filter($data['codes'], function($details) use ($credit) {
        return $details['status'] === 'not_checked' && $details['credit'] === $credit;
    });
    $codes = array_keys($userCodes);
    echo json_encode($codes);
    exit;
}

if ($action === 'hint') {
    $hints = isset($_POST['hints']) ? json_decode($_POST['hints'], true) : [];
    $updatedCodes = [];

    foreach ($data['codes'] as $code => $details) {
        if (!checkHints($code, $hints)) {
            $data['codes'][$code]['status'] = 'invalid';
            $updatedCodes[] = $code;
        }
    }

    file_put_contents($filename, json_encode($data));
    echo json_encode($updatedCodes);
    exit;
}

function checkHints($code, $hints) {
    $code = (string)$code;

    $specificPatterns = [
        'two_doubles' => '/(\d)\1.*(\d)\2/',
        'three_doubles' => '/(\d)\1.*(\d)\2.*(\d)\3/',
        'one_triple' => '/(\d)\1\1/',
    ];

    $positionalChecks = [
        'first' => function($code, $digit) {
            return isset($code[0]) && $code[0] === $digit;
        },
        'second' => function($code, $digit) {
            return isset($code[1]) && $code[1] === $digit;
        },
        'third' => function($code, $digit) {
            return isset($code[2]) && $code[2] === $digit;
        },
        'fourth' => function($code, $digit) {
            return isset($code[3]) && $code[3] === $digit;
        },
        'fifth' => function($code, $digit) {
            return isset($code[4]) && $code[4] === $digit;
        },
        'sixth' => function($code, $digit) {
            return isset($code[5]) && $code[5] === $digit;
        },
        'seventh' => function($code, $digit) {
            return isset($code[6]) && $code[6] === $digit;
        },
        'eighth' => function($code, $digit) {
            return isset($code[7]) && $code[7] === $digit;
        },
        'ninth' => function($code, $digit) {
            return isset($code[8]) && $code[8] === $digit;
        },
    ];

    foreach ($hints as $hint) {
        if (isset($specificPatterns[$hint]) && preg_match($specificPatterns[$hint], $code)) {
            return true;
        }

        if (preg_match('/^(two|three|four|five|six|seven|eight|nine|ten)_(\d)s$/', $hint, $matches)) {
            $count = ($matches[1] === 'two' ? 2 : 
                      ($matches[1] === 'three' ? 3 : 
                      ($matches[1] === 'four' ? 4 : 5)));
            $digit = $matches[2];
            $pattern = str_repeat(".*$digit", $count);
            if (preg_match("/$pattern/", $code)) {
                return true;
            }
        }

        foreach ($positionalChecks as $position => $checkFunction) {
            if (strpos($hint, $position) === 0) {
                $digit = substr($hint, strlen($position) + 1);
                if ($checkFunction($code, $digit)) {
                    return true;
                }
            }
        }
    }

    return false;
}

$limit = isset($_POST['limit']) ? (int)$_POST['limit'] : 5;
$credit = isset($_POST['credit']) ? $_POST['credit'] : null;
$position = isset($_POST['position']) ? $_POST['position'] : 'top';

if ($credit === null) {
    echo json_encode(["error" => "Credit parameter is required"]);
    exit;
}

$notCheckedCodes = array_filter($data['codes'], function($details) {
    return $details['status'] === 'not_checked' && $details['credit'] === '';
});

if ($position === 'bottom') {
    $codes = array_slice(array_keys($notCheckedCodes), -$limit, $limit, true);

} else if ($position === 'middle') {
    $start = floor(count(array_keys($notCheckedCodes)) / 2) - floor($limit / 2);
    $codes = array_slice(array_keys($notCheckedCodes), $start, $limit, true);

} else if ($position === 'shuffle') {
    $keys = array_keys($notCheckedCodes);
    shuffle($keys);
    $codes = array_slice($keys, 0, $limit, true);

} else if ($position === 'random') {
    $keys = array_keys($notCheckedCodes);
    $randomIndex = array_rand($keys);

    $filteredCodes = [];
    for ($i = 0; $i < $limit; $i++) {
        $index = $randomIndex + $i;
        if ($index >= count($keys)) {
            $index -= count($keys);
        }
        $filteredCodes[] = $keys[$index];
    }
    $codes = $filteredCodes;

} else {
    $codes = array_slice(array_keys($notCheckedCodes), 0, $limit, true);
}

foreach ($codes as $code) {
    $data['codes'][$code]['credit'] = $credit;
}

file_put_contents($filename, json_encode($data));

$result = [];
foreach ($codes as $code) {
    $result[$code] = $data['codes'][$code];
}

echo json_encode($result);