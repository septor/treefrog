import { CollectorFilter, Message } from 'discord.js';

import { Context } from '../context';
import { canAccessCommand, canPostInChannel } from '../functions.js';

export default {
    name: 'checked',
    description: 'Prompt user for codes they have checked and update their status to "needs_verified"',
    accessLevel: 'medium',
    execute: async function (message: Message<boolean>, args: string[], { config, database }: Context) {
        if (!canPostInChannel(this.name, message.channel.id, config.allowedChannels)) {
            const allowedChannels = config.allowedChannels[this.name].map((channelId) => `<#${channelId}>`).join(', ');
            return message.channel.send(
                `\`${this.name}\` can only be used in the following channels: ${allowedChannels}`
            );
        }

        if (!canAccessCommand(message.author.id, this.accessLevel, config.userAccessLevels)) {
            return message.channel.send(`You do not have the required access level to use \`${this.name}\`.`);
        }

        const filter: CollectorFilter<any> = (response) => response.author.id === message.author.id;

        try {
            await message.channel.send('Please provide the codes you have checked, separated by commas:');
        } catch (error) {
            console.error('Could not prompt for codes in the channel.', error);
            message.channel.send('Could not prompt for codes in the channel.');
        }

        try {
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });

            const checkedCodes = collected
                .first()!
                .content.split('\n')
                .map((code) => code.trim());
            try {
                const updatedCodes = await database.checked(checkedCodes);
                if (updatedCodes.length > 0) {
                    message.channel.send(
                        `Updated ${updatedCodes.length} codes to 'needs_verified' based on your input.`
                    );
                } else {
                    message.channel.send('No codes were updated.');
                }
            } catch (error) {
                console.error('Error updating codes:', error);
                message.channel.send('An error occurred while updating the codes.');
            }
        } catch {
            await message.author.send(
                `You didn't provide any codes in the alloted time. Please initiate \`!checked\` again when you have more time.`
            );
        }
    },
};
