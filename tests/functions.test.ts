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
            opencodes: ['456'],
            quests: [],
            setas: [],
            vault: [],
            viewq: [],
        };
    });

    test('command name is not in allowedChannels', () => {
        expect(canPostInChannel('a', '123', allowedChannels)).toBe(false);
    });

    test('channelId is not allowed', () => {
        expect(canPostInChannel('a', '321', allowedChannels)).toBe(false);
        expect(canPostInChannel('opencodes', '123', allowedChannels)).toBe(false);
    });

    test('channelId is allowed', () => {
        expect(canPostInChannel('basecamp', '123', allowedChannels)).toBe(true);
    });
});
