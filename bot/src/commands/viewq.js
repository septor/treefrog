import axios from 'axios';
import qs from 'qs';

import { canAccessCommand, canPostInChannel, firstLetterUppercase } from '../functions.js';

export default {
    name: 'viewq',
    description: 'View all the codes labelled as "needs_verified" and/or "needs_processed".',
    accessLevel: 'medium',
    async execute(message, args, config) {
        if (!canPostInChannel(this.name, message.channel.id, config.allowedChannels)) {
            const allowedChannels = config.allowedChannels[this.name].map((channelId) => `<#${channelId}>`).join(', ');
            return message.author
                .send(`\`${this.name}\` can only be used in the following channels: ${allowedChannels}`)
                .catch((error) => console.error('Could not send DM to the user.', error));
        }

        if (!canAccessCommand(message.author.id, this.accessLevel)) {
            return message.author
                .send(`You do not have the required access level to use \`${this.name}\`.`)
                .catch((error) => console.error('Could not send DM to the user.', error));
        }

        const mappings = {
            unprocessed: 'needs_processed',
            unverified: 'needs_verified',
        };

        const userInput = args[0] ? args[0].toLowerCase() : '';
        const status = mappings[userInput] || '';
        const endpoint = config.fetchpoint;

        try {
            const response = await axios.post(endpoint, qs.stringify({ action: 'viewq', status }));
            const codes = response.data;

            if (codes.error) {
                return message.channel.send(codes.error);
            }

            if (codes.length === 0) {
                return message.channel.send('No codes found with the specified status.');
            }

            const codesList = codes.join('\n');
            const reply = `${firstLetterUppercase(userInput) || 'All'} codes that need managed:\n${codesList}`;

            message.channel.send(reply);
        } catch (error) {
            console.error('Error fetching codes:', error);
            return message.channel.send('An error occurred while fetching the codes.');
        }
    },
};
