import axios from 'axios';
import { Message } from 'discord.js';

import { Context } from '../context';
import { canAccessCommand, canPostInChannel, formatNumber } from '../functions.js';

export default {
    name: 'basecamp',
    description: 'Displays the materials you need to upgrade your Base Camp to a defined level.',
    accessLevel: 'low',
    async execute(message: Message<boolean>, args: string[], { config, database }: Context) {
        const url = 'https://raw.githubusercontent.com/septor/treefrog/main/data/basecamp.json';

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

        async function getUpgradeMaterials(startLevel: number, endLevel: number | null = null) {
            try {
                const response = await axios.get(url);
                const materials = response.data;

                let requiredMaterials: { [key: string]: number } = {};

                if (endLevel === null) {
                    requiredMaterials = materials[startLevel.toString()] || {};
                } else {
                    for (let level = startLevel; level <= endLevel; level++) {
                        const levelMaterials: { [key: string]: number } = materials[level.toString()];
                        if (levelMaterials) {
                            for (const [material, amount] of Object.entries(levelMaterials)) {
                                if (requiredMaterials[material]) {
                                    requiredMaterials[material] += amount;
                                } else {
                                    requiredMaterials[material] = amount;
                                }
                            }
                        }
                    }
                }

                return requiredMaterials;
            } catch (error) {
                console.error('Error fetching materials:', error);
                return null;
            }
        }

        try {
            if (args.length < 1) {
                message.channel.send('Please provide at least one level.');
                return;
            }

            const startLevel = parseInt(args[0]);
            const endLevel = args[1] ? parseInt(args[1]) : null;

            if (isNaN(startLevel) || (endLevel !== null && isNaN(endLevel))) {
                message.channel.send('Invalid levels provided. Please provide valid levels.');
                return;
            }

            const materials = await getUpgradeMaterials(startLevel, endLevel);

            if (materials) {
                const materialList = Object.entries(materials)
                    .map(([material, amount]) => `${material}: ${formatNumber(amount)}`)
                    .join('\n');

                if (endLevel) {
                    message.channel.send(
                        `To upgrade your Base Camp from levels ${startLevel} to ${endLevel}, you need:\n${materialList}`
                    );
                } else {
                    message.channel.send(
                        `To upgrade your Base Camp to level ${startLevel}, you need:\n${materialList}`
                    );
                }
            } else {
                message.channel.send('Failed to fetch materials.');
            }
        } catch (error) {
            console.error(error);
            message.channel.send('There was an error fetching the data.');
        }
    },
};
