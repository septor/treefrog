const axios = require('axios');
const config = require('../config.json');
const { canPostInChannel, canAccessCommand } = require('../functions');

module.exports = {
    name: 'success',
    description: 'Mark a single code as successful.',
    accessLevel: 'medium',
    async execute(message, args) {
        if (!canPostInChannel(this.name, message.channel.id)) {
            const allowedChannels = config.allowedChannels[this.name].map(channelId => `<#${channelId}>`).join(', ');
            return message.author.send(`\`${this.name}\` can only be used in the following channels: ${allowedChannels}`)
                .catch(error => console.error('Could not send DM to the user.', error));
        }

        if (!canAccessCommand(message.author.id, this.accessLevel)) {
            return message.author.send(`You do not have the required access level to use \`${this.name}\`.`)
                .catch(error => console.error('Could not send DM to the user.', error));
        }

        if (args.length === 0) {
            return message.channel.send('Please provide a code ID to mark as successful.');
        }

        const values = args;

        const endpoint = 'http://septor.xyz/cherrytree/update_code.php';
        const data = new URLSearchParams({ action: 'success', value: JSON.stringify(values) });

        try {
            const response = await axios.post(endpoint, data);
            const result = response.data;

            if (result.error) {
                return message.channel.send(`Failed to update code: ${result.error}`);
            }

            message.channel.send('Code successfully marked as successful.');
        } catch (error) {
            console.error(error);
            message.channel.send('Failed to update code.');
        }
    },
};
