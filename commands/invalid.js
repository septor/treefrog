const axios = require('axios');
const config = require('../config.json');
const { canPostInChannel, canAccessCommand } = require('../functions');

module.exports = {
    name: 'invalid',
    description: 'Update code status to invalid',
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
            return message.channel.send('Please provide a user mention or code IDs.');
        }

        let action, values;

        if (message.mentions.users.size > 0) {
            const user = message.mentions.users.first();
            action = 'user';
            values = [user.username];
        } else {
            action = 'code';
            values = args;
        }

        const endpoint = `http://septor.xyz/cherrytree/update_code.php`;
        const data = new URLSearchParams({ action, value: JSON.stringify(values) });

        try {
            const response = await axios.post(endpoint, data);
            const result = response.data;

            if (result.error) {
                return message.channel.send(`Failed to update codes: ${result.error}`);
            }

            message.channel.send('Codes successfully updated to invalid.');
        } catch (error) {
            console.error(error);
            message.channel.send('Failed to update codes.');
        }
    },
};