const axios = require('axios');
const config = require('../config.json');
const { canPostInChannel, canAccessCommand, isValidRomanNumeral } = require('../functions');

module.exports = {
    name: 'quests',
    description: 'Display the required resources to complete a quest line, or a quest.',
    accessLevel: 'low',
    async execute(message, args) {
        const url = 'https://raw.githubusercontent.com/septor/treefrog/main/quests.json';

        if (!canPostInChannel(this.name, message.channel.id)) {
            const allowedChannels = config.allowedChannels[this.name].map(channelId => `<#${channelId}>`).join(', ');
            return message.author.send(`\`${this.name}\` can only be used in the following channels: ${allowedChannels}`)
                .catch(error => console.error('Could not send DM to the user.', error));
        }

        if (!canAccessCommand(message.author.id, this.accessLevel)) {
            return message.author.send('You do not have the required access level to use \`${this.name}\`.')
                .catch(error => console.error('Could not send DM to the user.', error));
        }

        let level = null;
        if (args.length > 1 && isValidRomanNumeral(args[args.length - 1])) {
            level = args.pop();
        }
        
        const questName = args.join(' ');

        try {
            const response = await axios.get(url);
            const quests = response.data;

            if (!quests[questName]) {
                return message.channel.send(`Quest "${questName}" not found.`);
            }

            if (level) {
                const questLevelData = quests[questName][level];
                if (!questLevelData) {
                    return message.channel.send(`Level "${level}" not found for quest "${questName}".`);
                }
                
                let resultMessage = `**${questName} ${level}**\n`;
                for (const [material, amount] of Object.entries(questLevelData)) {
                    resultMessage += `\t${material}: ${amount}\n`;
                }
                message.channel.send(resultMessage);
            } else {
                let resultMessage = `**${questName}**\n`;
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
