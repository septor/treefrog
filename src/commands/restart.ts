import { Message } from 'discord.js';
import fs from 'fs';
import path from 'path';

import { Context } from '../context';

export default {
    name: 'restart',
    description: 'Restarts the bot',
    accessLevel: 'high',
    async execute(message: Message<boolean>, args: string[], { config, database }: Context) {
        if (message.author.id !== config.ownerId) {
            return message.reply('You do not have permission to use this command.');
        }
        try {
            const restartPath = path.join(__dirname, '../restart.json');
            const restartData = {
                channelId: message.channel.id,
                messageId: message.id,
            };
            fs.writeFileSync(restartPath, JSON.stringify(restartData));
            await message.react('🔄');
            setTimeout(() => {
                process.exit(0);
            }, 1000);
        } catch (error) {
            console.error('Error restarting the bot:', error);
            message.channel.send('Failed to restart the bot.');
        }
    },
};
