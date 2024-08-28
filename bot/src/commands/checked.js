import axios from 'axios';
import qs from 'qs';

import { canAccessCommand, canPostInChannel } from '../functions.js';

export default {
    name: 'checked',
    description: 'Prompt user for codes they have checked and update their status to "needs_verified"',
    accessLevel: 'medium',
    async execute(message, args, { config, database }) {
        if (!canPostInChannel(this.name, message.channel.id, config.allowedChannels)) {
            const allowedChannels = config.allowedChannels[this.name].map((channelId) => `<#${channelId}>`).join(', ');
            return message.channel.send(
                `\`${this.name}\` can only be used in the following channels: ${allowedChannels}`
            );
        }

        if (!canAccessCommand(message.author.id, this.accessLevel, config.userAccessLevels)) {
            return message.channel.send(`You do not have the required access level to use \`${this.name}\`.`);
        }

        const filter = (response) => response.author.id === message.author.id;

        message.channel
            .send('Please provide the codes you have checked, separated by commas:')
            .then(() => {
                message.channel
                    .awaitMessages({
                        filter,
                        max: 1,
                        time: 60000,
                        errors: ['time'],
                    })
                    .then((collected) => {
                        const checkedCodes = collected
                            .first()
                            .content.split('\n')
                            .map((code) => code.trim());
                        const updatepoint = config.updatepoint;

                        axios
                            .post(
                                updatepoint,
                                qs.stringify({
                                    action: 'checked',
                                    codes: JSON.stringify(checkedCodes),
                                })
                            )
                            .then((response) => {
                                const updatedCodes = response.data.updated;

                                if (updatedCodes.length > 0) {
                                    message.channel.send(
                                        `Updated ${updatedCodes.length} codes to 'needs_verified' based on your input.`
                                    );
                                } else {
                                    message.channel.send('No codes were updated.');
                                }
                            })
                            .catch((error) => {
                                console.error('Error updating codes:', error);
                                message.channel.send('An error occurred while updating the codes.');
                            });
                    })
                    .catch(() => {
                        message.author.send(
                            `You didn't provide any codes in the alloted time. Please initiate \`!checked\` again when you have more time.`
                        );
                    });
            })
            .catch((error) => {
                console.error('Could not prompt for codes in the channel.', error);
                message.channel.send('Could not prompt for codes in the channel.');
            });
    },
};
