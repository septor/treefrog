import { Message } from 'discord.js';

import { Context } from '../context';
import { canAccessCommand, canPostInChannel } from '../functions.js';

export default {
    name: 'setas',
    description: 'Set a code, or a group of codes, as a specific status.',
    accessLevel: 'medium',
    async execute(message: Message<boolean>, args: string[], { config, database }: Context) {
        if (!canPostInChannel(this.name, message.channel.id, config.allowedChannels)) {
            const allowedChannels = config.allowedChannels[this.name].map((channelId) => `<#${channelId}>`).join(', ');
            return message.author
                .send(`\`${this.name}\` can only be used in the following channels: ${allowedChannels}`)
                .catch((error) => console.error('Could not send DM to the user.', error));
        }

        if (!canAccessCommand(message.author.id, this.accessLevel, config.userAccessLevels)) {
            return message.author
                .send(`You do not have the required access level to use \`${this.name}\`.`)
                .catch((error) => console.error('Could not send DM to the user.', error));
        }

        if (args.length === 0) {
            return message.channel.send('Please provide a status to change codes into.');
        }

        let action, response;
        switch (args[0]) {
            case 'invalid':
                action = 'code';
                response = 'Which codes should I set as invalid? (split by new line)';
                break;
            case 'new':
                action = 'reset';
                response = 'Which codes do you want me to complete reset? (split by new line)';
                break;
            case 'success':
                action = 'success';
                response = 'Which code cracks the vault?';
                break;
            default:
                return message.channel.send(`You're trying to do something I'm not able to help you with.`);
        }

        await message.channel.send({ content: response });
        const filter = (m: Message) => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector({
            filter: filter,
            time: 60000,
        });

        collector.on('collect', async (m) => {
            const codesToProcess = m.content.split('\n').map((code) => code.trim());

            try {
                switch (action) {
                    case 'code':
                        await database.updateCodes(codesToProcess, { status: 'invalid' });
                        break;
                    case 'reset':
                        await database.updateCodes(codesToProcess, { status: 'not_checked', credit: '' });
                        break;
                    case 'success':
                        await database.updateCodes(codesToProcess, { status: 'success' });
                        break;
                }
                await m.reply({ content: 'The codes have been updated.' });
            } catch (error) {
                console.error('Error updating codes:', error);
                await m.reply({
                    content: 'An error occurred while updating the codes.',
                });
            }

            collector.stop();
        });
    },
};
