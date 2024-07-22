const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const qs = require('qs');
const config = require('../config.json');
const { canPostInChannel, canAccessCommand, convertMilliseconds } = require('../functions');

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
        const params = new URLSearchParams();
        params.append('limit', limit);
        params.append('position', position);
        params.append('credit', credit);

        const fetchpoint = 'http://septor.xyz/cherrytree/fetch_codes.php';
        const updatepoint = 'http://septor.xyz/cherrytree/update_code.php';

        try {
            const response = await axios.post(fetchpoint, params);
            const codes = response.data;

            if (codes.error) {
                return message.channel.send(codes.error);
            }

            if (Object.keys(codes).length === 0) {
                return message.channel.send('No codes with status "not_checked" found.');
            }

            let location = "";

            if (position === "random") {
                location = "a random part of the list";
            } else if (position === "shuffle") {
                location = "random locations on the list";
            } else {
                location = `the ${position} of the list`;
            }

            const mentionedUserId = message.author.id;
            const userMention = `<@${mentionedUserId}>`;

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

            const filter = i => i.user.id === message.author.id;
            var codeTimeout = 30000 * Object.entries(codes).length;

            message.channel.send(`${userMention} here are your ${limit} codes, from ${location}:\nPlease reply within ${convertMilliseconds(codeTimeout)} so we can keep things flowing!\n`);
            let reply = '';
            let counter = 0;
            for (const [code] of Object.entries(codes)) {
                reply += `${code.split('').join(' ')}\n`;
                counter++;
            
                if (counter % gap === 0) {
                    reply += `\n`;
                }
            }
            
            reply = reply.trimEnd();
            reply += '\n';

            const botMessage = await message.channel.send({ content: reply, components: [row] });

            // current timeout is 30 seconds per code given, for 10 codes that's 5 minutes
            //TODO: should this be a fixed amount, or should we increase/decrease the amount of time needed per code?
            const collector = botMessage.createMessageComponentCollector({ filter, time: codeTimeout });

            collector.on('collect', async i => {
                await i.deferUpdate();
                console.log(`Interaction collected with customId: ${i.customId}`);

                if (i.customId === 'untested') {
                    await i.followUp({ content: 'Let me know which you missed (split them by new lines). If you missed them all, just reply "all":'});

                    const messageFilter = m => m.author.id === message.author.id;
                    const messageCollector = message.channel.createMessageCollector({ filter: messageFilter, time: 60000 });

                    messageCollector.on('collect', async m => {
                        if(m.content.toLowerCase().includes("all")) {
                            try {
                                const values = Object.keys(codes);

                                const phpResonse = await axios.post(updatepoint, qs.stringify({
                                    action: 'reset',
                                    value: JSON.stringify(values)
                                }));

                                if (phpResonse.data.success) {
                                    await m.reply({ content: `I've reset all your codes!`});
                                } else {
                                    await m.reply({ content: `Failed to update codes: ${phpResonse.data.error}`});
                                }
                            } catch (error) {
                                console.error('Error updating codes:', error);
                                await m.reply({ content: 'An error occurred while updating the codes.'});
                            }
                        } else {
                            const missedCodes = m.content.split('\n').map(code => code.join(' ').trim());
                            console.log(`Missed codes received: ${missedCodes}`);

                            try {
                                const values = Object.keys(codes);
                                const leftoverCodes = values.filter(item => !missedCodes.includes(item));

                                const phpResponseMissed = await axios.post(updatepoint, qs.stringify({
                                    action: 'reset',
                                    value: JSON.stringify(missedCodes)
                                }));

                                const phpResponseLeftover = await axios.post(updatepoint, qs.stringify({
                                    action: 'flag',
                                    value: JSON.stringify(leftoverCodes)
                                }));

                                if (phpResponseMissed.data.success && phpResponseLeftover.data.success) {
                                    await m.reply({ content: 'The statuses have been updated.'});
                                } else {
                                    const errors = [
                                        phpResponseMissed.data.error,
                                        phpResponseLeftover.data.error
                                    ].filter(error => error).join('; ');
                                    await m.reply({ content: `Failed to update codes: ${errors}`});
                                }
                            } catch (error) {
                                console.error('Error updating codes:', error);
                                await m.reply({ content: 'An error occurred while updating the codes.'});
                            }
                        }

                        messageCollector.stop();
                    });

                    messageCollector.on('end', collected => {
                        // this is where we handle actions if they don't reply in time
                        //TODO: what do we do if they don't reply with their missed codes in time? ask again?
                        if (collected.size === 0) {
                            message.channel.send(`No codes were provided within the time limit. Please get with a <@&${config.vaultManager}> to sort this out.`);
                        }
                    });

                    collector.stop();
                }

                if(i.customId === "no") {
                    //TODO: add in leveling system that will skip over them needing to be processed by someone
                    try {
                        const values = Object.keys(codes);

                        const phpResonse = await axios.post(updatepoint, qs.stringify({
                            action: 'flag',
                            value: JSON.stringify(values)
                        }));

                        if (phpResonse.data.success) {
                            await message.reply({ content: `I've noted that none of your codes worked.`});
                        } else {
                            await message.reply({ content: `Failed to update codes: ${phpResonse.data.error}`});
                        }
                    } catch (error) {
                        console.error('Error updating codes:', error);
                        await message.reply({ content: 'An error occurred while updating the codes.'});
                    }
                }

                if (i.customId === 'success') {
                    await i.followUp({ content: 'Which code cracked the vault?!:'});

                    const messageFilter = m => m.author.id === message.author.id;

                    // currently gives them 1 entire minute to send back code is correct, should this be more/less/same?
                    const messageCollector = message.channel.createMessageCollector({ filter: messageFilter, time: 60000 });

                    messageCollector.on('collect', async m => {
                        try {
                            const correctCode = [m.content];

                            const phpResonse = await axios.post(updatepoint, qs.stringify({
                                action: 'candidate',
                                value: JSON.stringify(correctCode)
                            }));

                            if (phpResonse.data.success) {
                                message.channel.send(`<@&${config.vaultManager}> a successful code may have been found, please check it out: \`!viewq unverified\`.`)
                            } else {
                                await m.reply({ content: `Failed to send your code in for verification codes: ${phpResonse.data.error}`});
                            }
                        } catch (error) {
                            console.error('Error updating code:', error);
                            await m.reply({ content: 'An error occurred while updating the code.'});
                        }

                        messageCollector.stop();
                    });

                    messageCollector.on('end', collected => {
                        // this is where we handle actions if they don't reply in time
                        //TODO: what do we do if they don't reply with successful code in time? ask again?
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
            console.error('Error fetching or processing data:', error);
            message.channel.send('Failed to fetch codes.');
        }
    },
};