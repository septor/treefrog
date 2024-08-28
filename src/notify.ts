import { Client } from 'discord.js';

import { Context } from './context';

export async function checkForCodes(client: Client, { config, database }: Context) {
    const vaultChannels = config.allowedChannels['vault'].map((channelId) => `<#${channelId}>`).join(', ');

    try {
        const data = database.codeCheck('not_checked');

        const usersToNotify: { [key: string]: string[] } = {};
        for (const [codeId, codeDetails] of Object.entries(data)) {
            if (codeDetails.credit) {
                if (!usersToNotify[codeDetails.credit]) {
                    usersToNotify[codeDetails.credit] = [];
                }
                usersToNotify[codeDetails.credit].push(codeId);
            }
        }

        for (const [userId, codes] of Object.entries(usersToNotify)) {
            const user = await client.users.fetch(userId);
            const codesList = codes.join('\n');
            await user.send(
                `You have the following codes assigned to you that are not flagged as checked:\n${codesList}\n\nPlease check them as soon as possible notify me in one of the following channels: ${vaultChannels}`
            );
        }
    } catch (error) {
        console.error('Error checking and notifying users:', error);
    }
}
