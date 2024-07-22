<?php
header('Content-Type: application/json');

$filename = './vault/src/data.json'; // NOTE: this is pointing to a dummy copy of the actual file that will be used

if (!file_exists($filename)) {
    echo json_encode(["error" => "File not found"]);
    exit;
}

$data = json_decode(file_get_contents($filename), true);

if (!isset($_POST['action']) || !isset($_POST['value'])) {
    echo json_encode(["error" => "Missing parameters"]);
    exit;
}

$action = $_POST['action'];
$values = json_decode($_POST['value'], true);

if ($values === null || !is_array($values)) {
    echo json_encode(["error" => "Invalid value parameter"]);
    exit;
}

$updated = false;

foreach ($values as $value) {
    if ($action == 'user') {
        foreach ($data['codes'] as &$details) {
            if ($details['credit'] === $value) {
                $details['status'] = 'invalid';
                $updated = true;
            }
        }
    } elseif ($action == 'code') {
        if (isset($data['codes'][$value])) {
            $data['codes'][$value]['status'] = 'invalid';
            $updated = true;
        } else {
            echo json_encode(["error" => "Code not found: $value"]);
            exit;
        }
    } elseif ($action == 'flag') {
        if (isset($data['codes'][$value])) {
            $data['codes'][$value]['status'] = 'needs_processed';
            $updated = true;
        } else {
            echo json_encode(["error" => "Code not found: $value"]);
            exit;
        }
    } elseif ($action == 'reset') {
        if (isset($data['codes'][$value])) {
            $data['codes'][$value]['status'] = 'not_checked';
            $data['codes'][$value]['credit'] = '';
            $updated = true;
        } else {
            echo json_encode(["error" => "Code not found: $value"]);
            exit;
        }
    } elseif ($action == 'candidate') {
        if (isset($data['codes'][$value])) {
            $data['codes'][$value]['status'] = 'needs_verified';
            $updated = true;
        } else {
            echo json_encode(["error" => "Code not found: $value"]);
            exit;
        }
    } elseif ($action == 'success') {
        if (isset($data['codes'][$value])) {
            $data['codes'][$value]['status'] = 'success';
            $updated = true;
        } else {
            echo json_encode(["error" => "Code not found: $value"]);
            exit;
        }
    } else {
        echo json_encode(["error" => "Invalid action"]);
        exit;
    }
}

if ($updated) {
    $data['logs'][] = "The bot has made changes to the file";
    file_put_contents($filename, json_encode($data));
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["error" => "No codes updated"]);
}