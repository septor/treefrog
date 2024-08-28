import { describe, expect, test } from '@jest/globals';

import { canPostInChannel } from '../src/functions.js';

describe('canPostInChannel', () => {
    test('command name is not in allowedChannels', () => {
        const result = canPostInChannel('a', '123', { b: ['a'] });
        expect(result).toBe(false);
    });
});
