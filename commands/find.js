const axios = require('axios');
const config = require('../config.json');
const { canPostInChannel, canAccessCommand } = require('../functions');

module.exports = {
    name: 'find',
    description: 'Display information on how to obtain Secret Rares.',
    accessLevel: 'low',
    async execute(message, args) {

        //TODO: BIG TODO -- is this needed? should it be ditched? should we build out the JSON file to include all item data for everything and build from there?
        const url = 'https://raw.githubusercontent.com/septor/treefrog/main/rares.json';

        if (!canPostInChannel(this.name, message.channel.id)) {
            const allowedChannels = config.allowedChannels[this.name].map(channelId => `<#${channelId}>`).join(', ');
            return message.author.send(`\`${this.name}\` can only be used in the following channels: ${allowedChannels}`)
                .catch(error => console.error('Could not send DM to the user.', error));
        }

        if (!canAccessCommand(message.author.id, this.accessLevel)) {
            return message.author.send('You do not have the required access level to use \`${this.name}\`.')
                .catch(error => console.error('Could not send DM to the user.', error));
        }

        async function getRareItemData(itemName) {
            try {
                const response = await axios.get(url);
                const rares = response.data;
                const itemData = rares[itemName.toLowerCase()] || null;
        
                return itemData;
            } catch (error) {
                console.error('Error fetching rare item data:', error);
                return null;
            }
        }

        try {
            
            if (args.length < 1) {
                message.channel.send('Please provide the name of the item.');
                return;
            }

            const itemName = args.slice(0).join(' ').toLowerCase();

            const itemData = await getRareItemData(itemName);
    
            if (itemData) {
                message.channel.send(`${itemData}`);
            } else {
                message.channel.send(`No information found for "${itemName}".`);
            }

        } catch (error) {
            console.error(error);
            message.channel.send('There was an error fetching the data.');
        }
    },
};
