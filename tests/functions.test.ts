import { beforeAll, describe, expect, test } from '@jest/globals';

import { AllowedChannels } from '../src/config';
import { canPostInChannel } from '../src/functions';

describe('canPostInChannel', () => {
    let allowedChannels: AllowedChannels;
    beforeAll(() => {
        allowedChannels = {
            basecamp: ['123'],
            checked: [],
            fetch: [],
            hint: [],
            opencodes: [],
            quests: [],
            setas: [],
            vault: [],
            viewq: [],
        };
    });

    test('command name is not in allowedChannels', () => {
        const result = canPostInChannel('a', '123', allowedChannels);
        expect(result).toBe(false);
    });

    test('channelId is not allowed', () => {
        const result = canPostInChannel('a', '321', allowedChannels);
        expect(result).toBe(false);
    });

    test('channelId is in allowedChannels', () => {
        const result = canPostInChannel('basecamp', '123', allowedChannels);
        expect(result).toBe(true);
    });
});
