import { Message } from 'discord.js';

import { Context } from '../context';
import { canAccessCommand, canPostInChannel } from '../functions.js';

export default {
    name: 'hint',
    description: 'Update code statuses based on provided hints',
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

        try {
            const hints = args.join(' ').split(',');
            const updatedCodes = await database.hint(hints);

            if (updatedCodes && updatedCodes.length > 0) {
                message.channel.send(`Updated ${updatedCodes.length} codes to 'invalid' based on the provided hints.`);
            } else {
                message.channel.send('No codes were updated.');
            }
        } catch (error) {
            console.error('Error updating codes:', error);
            message.channel.send('An error occurred while updating the codes.');
        }
    },
};
