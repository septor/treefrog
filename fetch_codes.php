<?php
header('Content-Type: application/json');

$filename = './vault/src/data.json'; // NOTE: this is pointing to a dummy copy of the actual file that will be used

if (!file_exists($filename)) {
    echo json_encode(["error" => "File not found"]);
    exit;
}

$data = json_decode(file_get_contents($filename), true);
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


if($position == "bottom") {
    $codes = array_slice(array_keys($notCheckedCodes), -$limit, $limit, true);

} else if($position == "middle") {
    $start = floor(count(array_keys($notCheckedCodes)) / 2) - floor($limit / 2);
    $codes = array_slice(array_keys($notCheckedCodes), $start, $limit, true);

} else if($position == "shuffle") {
    $keys = array_keys($notCheckedCodes);
    shuffle($keys);
    $codes = array_slice($keys, 0, $limit, true);

} else if($position == "random") {
    $keys = array_keys($notCheckedCodes);
    $randomIndex = array_rand($keys);

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
?>