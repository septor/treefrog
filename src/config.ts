import fs from 'node:fs/promises';

export interface AllowedChannels {
    basecamp: string[];
    checked: string[];
    hint: string[];
    opencodes: string[];
    quests: string[];
    setas: string[];
    vault: string[];
    fetch: string[];
    viewq: string[];

    [key: string]: string[];
}

export interface UserAccessLevels {
    medium: string[];
    high: string[];

    [key: string]: string[];
}

export interface Config {
    prefix: string;
    ownerId: string;
    vaultManager: string;
    allowedChannels: AllowedChannels;
    userAccessLevels: UserAccessLevels;
}

export async function loadConfig(path: string): Promise<Config> {
    console.log(`Loading config from ${path}`);
    const data = await fs.readFile(path, { encoding: 'utf-8' });
    return JSON.parse(data) as Config;
}
