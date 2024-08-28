import fs from 'node:fs/promises';

export interface Config {
    prefix: string;
    ownerId: string;
    vaultManager: string;
    allowedChannels: {
        basecamp: string[];
        checked: string[];
        hint: string[];
        opencodes: string[];
        quests: string[];
        setas: string[];
        vault: string[];
        fetch: string[];
        viewq: string[];
    };
    userAccessLevels: {
        medium: string[];
        high: string[];
    };
}

export async function loadConfig(path: string): Promise<Config> {
    console.log(`Loading config from ${path}`);
    const data = await fs.readFile(path, { encoding: 'utf-8' });
    return JSON.parse(data) as Config;
}
