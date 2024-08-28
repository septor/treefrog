import fs from 'fs';
import { Lock } from 'semaphore-async-await';

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

    private lock: Lock = new Lock();
    readonly data: Data;

    constructor(dbpath: string) {
        this.dbpath = dbpath;
        this.data = JSON.parse(fs.readFileSync(this.dbpath, 'utf8')) as Data;
    }

    private flush() {
        fs.writeFileSync(this.dbpath, JSON.stringify(this.data), 'utf8');
    }

    public async codeCheck(status?: Status) {
        try {
            await this.lock.acquire();

            const entries = Object.entries(this.data.codes).filter(([_, { status: s }]) => s === status);
            return Object.fromEntries(entries);
        } finally {
            this.lock.release();
        }
    }

    public async viewq(status?: Status): Promise<string[]> {
        try {
            await this.lock.acquire();

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
            this.lock.release();
        }
    }

    public async checkUserCodes(credit: string): Promise<string[]> {
        try {
            await this.lock.acquire();

            return Object.entries(this.data.codes)
                .filter(([_, { status: s, credit: c }]) => s === 'not_checked' && c === credit)
                .map(([code]) => code);
        } finally {
            this.lock.release();
        }
    }

    public async checked(codes: string[]): Promise<string[]> {
        try {
            await this.lock.acquire();

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
            this.lock.release();
        }
    }

    public async hint(hints: string[]): Promise<string[]> {
        try {
            await this.lock.acquire();

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
            this.lock.release();
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
    interface Lookup {
        [key: string]: any;
    }

    const specificPatterns: Lookup = {
        two_doubles: /(\d)\1.*(\d)\2/,
        three_doubles: /(\d)\1.*(\d)\2.*(\d)\3/,
        one_triple: /(\d)\1\1/,
    };

    for (const hint of hints) {
        if (Object.hasOwn(specificPatterns, hint) && specificPatterns[hint].test(code)) {
            return true;
        }

        const matches = /^(two|three|four|five|six|seven|eight|nine|ten)_(\d)s$/[Symbol.match](hint);
        const lut: Lookup = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
        if (matches) {
            const count = lut[matches[0]];
            if (new RegExp(`.*${matches[1].repeat(count)}`).test(code)) {
                return true;
            }
        }
    }

    const positionalChecks: { [key: string]: (code: string, digit: string) => boolean } = {
        first: (code, digit) => code[0] === digit,
        second: (code, digit) => code[1] === digit,
        third: (code, digit) => code[2] === digit,
        fourth: (code, digit) => code[3] === digit,
        fifth: (code, digit) => code[4] === digit,
        sixth: (code, digit) => code[5] === digit,
        seventh: (code, digit) => code[6] === digit,
        eighth: (code, digit) => code[7] === digit,
        ninth: (code, digit) => code[8] === digit,
    };
    for (const hint of hints) {
        for (const position in positionalChecks) {
            if (hint.startsWith(position)) {
                const digit = hint.slice(position.length + 1);
                if (positionalChecks[position](code, digit)) {
                    return true;
                }
            }
        }
    }

    return false;
}
