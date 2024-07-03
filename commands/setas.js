const axios = require('axios');
const qs = require('qs');
const config = require('../config.json');
const { canPostInChannel, canAccessCommand } = require('../functions');

module.exports = {
    name: 'setas',
    description: 'Set a code, or a group of codes, as a specific status.',
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
            return message.channel.send('Please provide a status to change codes into.');
        }

        let action, response;

        switch(args[0]) {
            case "invalid":
                action = "code";
                response = "Which codes should I set as invalid? (split by new line)"
                break;
            case "new":
                action = "reset";
                response = "Which codes do you want me to complete reset? (split by new line)"
                break;
            case "success":
                action = "success";
                response = "Which code cracks the vault?"
                break;
            default:
                return message.channel.send(`You're trying to do something I'm not able to help you with.`);
        }

        const endpoint = `http://septor.xyz/cherrytree/update_code.php`;

        await message.channel.send({ content: response});
        const filter = m => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector({ filter: filter, time: 60000 });

        collector.on('collect', async m => {
            
            const codesToProcess = m.content.split('\n').map(code => code.trim());

            try {
                const phpResponse = await axios.post(endpoint, qs.stringify({
                    action: action,
                    value: JSON.stringify(codesToProcess)
                }));

                if (phpResponse.data.success) {
                    //TODO: IF `action` is 'success', send out a message notifing someone of importance so they can @everyone
                    await m.reply({ content: 'The statuses have been updated.'});
                } else {
                    await m.reply({ content: `Failed to update codes: ${phpResponse.data.error}`});
                }
            } catch (error) {
                console.error('Error updating codes:', error);
                await m.reply({ content: 'An error occurred while updating the codes.'});
            }

            collector.stop();
        });
    },
};