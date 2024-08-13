<?php

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