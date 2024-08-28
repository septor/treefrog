import axios from 'axios';

import { canAccessCommand, canPostInChannel, isInteger, toTitleCase } from '../functions.js';

export default {
    name: 'quests',
    description: 'Display the required resources to complete a quest line, or a quest.',
    accessLevel: 'low',
    async execute(message, args, { config, database }) {
        const url = 'https://raw.githubusercontent.com/septor/treefrog/main/quests.json';

        if (!canPostInChannel(this.name, message.channel.id, config.allowedChannels)) {
            const allowedChannels = config.allowedChannels[this.name].map((channelId) => `<#${channelId}>`).join(', ');
            return message.author
                .send(`\`${this.name}\` can only be used in the following channels: ${allowedChannels}`)
                .catch((error) => console.error('Could not send DM to the user.', error));
        }

        if (!canAccessCommand(message.author.id, this.accessLevel, config.userAccessLevels)) {
            return message.author
                .send('You do not have the required access level to use `${this.name}`.')
                .catch((error) => console.error('Could not send DM to the user.', error));
        }

        let level = null;
        if (args.length > 1 && isInteger(args[args.length - 1])) {
            level = args.pop();
        }

        const questName = args.join(' ').toLowerCase();

        try {
            console.log(questName);
            const response = await axios.get(url);
            const quests = response.data;

            if (!quests[questName]) {
                const displayName = toTitleCase(questName);
                return message.channel.send(`Quest "${displayName}" not found.`);
            }

            const displayName = toTitleCase(questName);

            if (level) {
                const questLevelData = quests[questName][level];
                if (!questLevelData) {
                    return message.channel.send(`Level "${level}" not found for quest "${displayName}".`);
                }

                let resultMessage = `**${displayName} ${level}**\n`;
                for (const [material, amount] of Object.entries(questLevelData)) {
                    resultMessage += `\t${material}: ${amount}\n`;
                }
                message.channel.send(resultMessage);
            } else {
                let resultMessage = `**${displayName}**\n`;
                for (const [lvl, materials] of Object.entries(quests[questName])) {
                    resultMessage += `**\t${lvl}**\n`;
                    for (const [material, amount] of Object.entries(materials)) {
                        resultMessage += `\t\t${material}: ${amount}\n`;
                    }
                }
                message.channel.send(resultMessage);
            }
        } catch (error) {
            console.error(error);
            message.channel.send('There was an error fetching the data.');
        }
    },
};
