const { canPostInChannel, canAccessCommand } = require('../functions');
const axios = require('axios');
const qs = require('qs');
const config = require('../config.json');

module.exports = {
    name: 'hint',
    description: 'Update code statuses based on provided hints',
    accessLevel: "medium",
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

        const hints = args.join(' ').split(',');
        const updatepoint = 'http://septor.xyz/cherrytree/fetch_codes.php';

        try {
            const response = await axios.post(updatepoint, qs.stringify({
                action: 'hint',
                hints: JSON.stringify(hints)
            }));

            console.log('Response data:', response.data);

            const updatedCodes = response.data;

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
