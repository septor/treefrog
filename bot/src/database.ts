import fs from 'fs';
import Semaphore from 'semaphore-async-await';

type Status = 'invalid' | 'not_checked' | 'needs_verified' | 'needs_processed' | 'success';

type CodeDetails = {
    status: Status;
    credit: string;
};

interface Data {
    codes: {
        [key: string]: CodeDetails;
    };
}

export class Database {
    readonly dbpath: string;

    private lock: Semaphore = new Semaphore(1);
    private data: Data;

    constructor(dbpath: string) {
        this.dbpath = dbpath;
        this.data = JSON.parse(fs.readFileSync(this.dbpath, 'utf8')) as Data;
    }

    private flush() {
        fs.writeFileSync(this.dbpath, JSON.stringify(this.data), 'utf8');
    }

    public async codeCheck(status?: Status) {
        try {
            await this.lock.wait();
            const entries = Object.entries(this.data.codes).filter(([_, { status: s }]) => s === status);
            return Object.fromEntries(entries);
        } finally {
            this.lock.signal();
        }
    }

    public async viewq(status?: Status): Promise<string[]> {
        try {
            await this.lock.wait();
            let codes: string[];
            if (status) {
                codes = Object.entries(this.data.codes)
                    .filter(([_, { status: s }]) => s === status)
                    .map(([code]) => code);
            } else {
                const needsVerified = Object.entries(this.data.codes)
                    .filter(([_, { status: s }]) => s === 'needs_verified')
                    .map(([code]) => code);
                const needsProcessed = Object.entries(this.data.codes)
                    .filter(([_, { status: s }]) => s === 'needs_processed')
                    .map(([code]) => code);
                codes = needsVerified.concat(needsProcessed);
            }
            return codes;
        } finally {
            this.lock.signal();
        }
    }

    public async checkUserCodes(credit: string): Promise<string[]> {
        try {
            await this.lock.wait();
            return Object.entries(this.data.codes)
                .filter(([_, { status: s, credit: c }]) => s === 'not_checked' && c === credit)
                .map(([code]) => code);
        } finally {
            this.lock.signal();
        }
    }

    public async checked(codes: string[]): Promise<string[]> {
        try {
            await this.lock.wait();

            const updatedCodes = [];
            for (const code of codes) {
                if (this.data.codes[code] && this.data.codes[code].status === 'not_checked') {
                    this.data.codes[code].status = 'needs_verified';
                    updatedCodes.push(code);
                }
            }

            this.flush();
            return updatedCodes;
        } finally {
            this.lock.signal();
        }
    }

    public async hint(hints: string[]): Promise<string[]> {
        try {
            await this.lock.wait();

            const updatedCodes = [];
            for (let code in this.data.codes) {
                if (!checkHints(code, hints)) {
                    this.data.codes[code].status = 'invalid';
                    updatedCodes.push(code);
                }
            }

            this.flush();
            return updatedCodes;
        } finally {
            this.lock.signal();
        }
    }

    public async claimCodes(limit: number, position: string): Promise<string[]> {
        const codes = Object.entries(this.data.codes).filter(
            ([_, { status: s, credit: c }]) => s === 'not_checked' && c === ''
        );

        /*
        TODO:

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
         */

        return [];
    }
}

function checkHints(code: string, hints: string[]): boolean {
    /* TODO:
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
     */
    return true;
}
