const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const qs = require('qs');
const config = require('../config.json');
const { canPostInChannel, canAccessCommand, convertMilliseconds } = require('../functions');

//TODO: Leveling system. See here: https://github.com/septor/treefrog/issues/4

module.exports = {
    name: 'vault',
    description: 'Fetch a specified number of codes or a specific code range',
    accessLevel: "low",
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

        const limit = args[0] || 5;
        const position = args[1] || 'random';
        const gap = 5;
        const credit = message.author.username;

        const fetchpoint = 'http://septor.xyz/cherrytree/fetch_codes.php';
        const updatepoint = 'http://septor.xyz/cherrytree/update_code.php';

        try {

            const checkCodesResponse = await axios.post(fetchpoint, qs.stringify({ action: 'checkusercodes', credit }));
            const userCodes = checkCodesResponse.data || {};
            const hasUncheckedCodes = userCodes.length > 0;

            if (hasUncheckedCodes) {
                //TODO: create a command that will send them all the codes they need to check in a DM.
                return message.channel.send('You have unprocessed codes. Please check them before requesting more.')
                    .catch(error => console.error('Could not send DM to the user.', error));
            }

            const params = new URLSearchParams();
            params.append('limit', limit);
            params.append('position', position);
            params.append('credit', credit);

            const response = await axios.post(fetchpoint, params);
            const codes = response.data;

            if (codes.error) {
                return message.channel.send(codes.error);
            }

            if (Object.keys(codes).length === 0) {
                return message.channel.send('No codes with status "not_checked" found.');
            }

            const location = position === "random" 
                ? "a random part of the list" 
                : position === "shuffle" 
                ? "random locations on the list" 
                : `the ${position} of the list`;

            const userMention = `<@${message.author.id}>`;

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('no')
                        .setLabel('None of these are correct.')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('untested')
                        .setLabel(`I couldn't test all my codes!`)
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('success')
                        .setLabel('I found the correct code!')
                        .setStyle(ButtonStyle.Success),
                );

            const reply = Object.keys(codes).reduce((acc, code, index) => {
                const spacedCode = code.split('').join(' ');
                return acc + (index % gap === 0 && index > 0 ? `\n` : '') + `${spacedCode}\n`;
            }, '');

            const botMessage = await message.channel.send({
                content: `${userMention} here are your ${limit} codes, from ${location}:\nPlease reply within ${convertMilliseconds(30000 * Object.keys(codes).length)} so we can keep things flowing!\n${reply.trimEnd()}`,
                components: [row]
            });

            const filter = i => i.user.id === message.author.id;
            const collector = botMessage.createMessageComponentCollector({ filter, time: 30000 * Object.keys(codes).length });

            collector.on('collect', async i => {
                await i.deferUpdate();

                const handleResponseAction = async (action, codesList) => {
                    try {
                        const phpResponse = await axios.post(updatepoint, qs.stringify({ action, value: JSON.stringify(codesList) }));
                        if (phpResponse.data.success) {
                            await i.followUp({ content: action === 'reset' ? `I've reset all your codes!` : 'The statuses have been updated.' });
                        } else {
                            await i.followUp({ content: `Failed to update codes: ${phpResponse.data.error}` });
                        }
                    } catch (error) {
                        await i.followUp({ content: 'An error occurred while updating the codes.' });
                    }
                };

                if (i.customId === 'untested') {
                    await i.followUp({ content: 'Let me know which you missed (split them by new lines). If you missed them all, just reply "all":' });

                    const messageFilter = m => m.author.id === message.author.id;
                    const messageCollector = message.channel.createMessageCollector({ filter: messageFilter, time: 60000 });

                    messageCollector.on('collect', async m => {
                        if (m.content.toLowerCase().includes("all")) {
                            await handleResponseAction('reset', Object.keys(userCodes));
                        } else {
                            const missedCodes = m.content.split('\n').map(code => code.trim());
                            const leftoverCodes = Object.keys(userCodes).filter(item => !missedCodes.includes(item));
                            await handleResponseAction('reset', missedCodes);
                            await handleResponseAction('flag', leftoverCodes);
                        }
                        messageCollector.stop();
                    });

                    messageCollector.on('end', collected => {
                        if (collected.size === 0) {
                            message.channel.send(`No codes were provided within the time limit. Please get with a <@&${config.vaultManager}> to sort this out.`);
                        }
                    });

                    collector.stop();
                } else if (i.customId === 'no') {
                    const values = Object.keys(codes);
                    await handleResponseAction('flag', values);
                    collector.stop();
                } else if (i.customId === 'success') {
                    await i.followUp({ content: 'Which code cracked the vault?!:' });

                    const messageFilter = m => m.author.id === message.author.id;
                    const messageCollector = message.channel.createMessageCollector({ filter: messageFilter, time: 60000 });

                    messageCollector.on('collect', async m => {
                        try {
                            const correctCode = [m.content];
                            const phpResponse = await axios.post(updatepoint, qs.stringify({
                                action: 'candidate',
                                value: JSON.stringify(correctCode)
                            }));
                            if (phpResponse.data.success) {
                                message.channel.send(`<@&${config.vaultManager}> a successful code may have been found, please check it out: \`!viewq unverified\`.`);
                            } else {
                                await m.reply({ content: `Failed to send your code in for verification codes: ${phpResponse.data.error}` });
                            }
                        } catch (error) {
                            await m.reply({ content: 'An error occurred while updating the code.' });
                        }
                        messageCollector.stop();
                    });

                    messageCollector.on('end', collected => {
                        if (collected.size === 0) {
                            message.channel.send(`${userMention} please message any <@&${config.vaultManager}> so we can get this sorted, when you get a chance.`);
                        }
                    });

                    collector.stop();
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    message.channel.send(`${userMention} I assume you still haven't checked the codes. Please let me know when you do by initiating the \`!checked\` command.`);
                }
            });

        } catch (error) {
            message.channel.send('Failed to fetch codes.');
        }
    },
};