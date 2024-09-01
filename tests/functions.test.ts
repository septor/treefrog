import { beforeAll, describe, expect, test } from '@jest/globals';

import { AllowedChannels } from '../src/config';
import { canPostInChannel, shuffleArray } from '../src/functions';

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

describe('shuffleArray', () => {
    test('mutates input array', () => {
        const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const inputCopy = [...input];

        expect(input).toEqual(inputCopy);
        shuffleArray(input);
        expect(input).not.toEqual(inputCopy);
    });

    test('contains same elements after shuffle', () => {
        const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const inputCopy = [...input];
        const len = input.length;

        shuffleArray(input);
        expect(input).toHaveLength(len);
        expect(input.every((n) => inputCopy.includes(n))).toBe(true);
    });
});
