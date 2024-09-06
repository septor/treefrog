import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Interaction, Message } from 'discord.js';

import { Context } from '../context';
import { canAccessCommand, canPostInChannel, convertMilliseconds } from '../functions.js';

export default {
    name: 'vault',
    description: 'Fetch a specified number of codes or a specific code range',
    accessLevel: 'low',
    async execute(message: Message<boolean>, args: string[], { config, database }: Context) {
        const allowedChannels = config.allowedChannels[this.name].map((channelId) => `<#${channelId}>`).join(', ');

        if (!canPostInChannel(this.name, message.channel.id, config.allowedChannels)) {
            return message.author
                .send(`\`${this.name}\` can only be used in the following channels: ${allowedChannels}`)
                .catch((error) => console.error('Could not send DM to the user.', error));
        }

        if (!canAccessCommand(message.author.id, this.accessLevel, config.userAccessLevels)) {
            return message.author
                .send(`You do not have the required access level to use \`${this.name}\`.`)
                .catch((error) => console.error('Could not send DM to the user.', error));
        }

        let limit: number = 5;
        if (args[0]) {
            const n = parseInt(args[0]);
            if (!isNaN(n)) {
                limit = n;
            }
        }
        const position = args[1] || 'random';
        const gap = 5;
        const credit = message.author.username;

        try {
            const userCodes = await database.checkUserCodes(credit);

            if (userCodes.length > 0) {
                return message.channel
                    .send('You have unprocessed codes. Please check them before requesting more.')
                    .catch((error) => console.error('Could not send DM to the user.', error));
            }

            const codes = await database.claimCodes(limit, position, credit);
            if (!Object.keys(codes).length) {
                return message.channel.send('No codes with status "not_checked" found.');
            }

            const location =
                position === 'random'
                    ? 'a random part of the list'
                    : position === 'shuffle'
                      ? 'random locations on the list'
                      : `the ${position} of the list`;

            const userMention = `<@${message.author.id}>`;

            const row: ActionRowBuilder = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('no')
                    .setLabel('None of these are correct.')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('untested')
                    .setLabel("I couldn't test all my codes!")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('success')
                    .setLabel('I found the correct code!')
                    .setStyle(ButtonStyle.Success)
            );

            const reply = Object.keys(codes).reduce((acc, code, index) => {
                const spacedCode = code.split('').join(' ');
                return acc + (index % gap === 0 && index > 0 ? '\n' : '') + `${spacedCode}\n`;
            }, '');

            const botMessage = await message.channel.send({
                content: `${userMention} here are your ${limit} codes, from ${location}:\nPlease reply within ${convertMilliseconds(30000 * Object.keys(codes).length)} so we can keep things flowing!\n${reply.trimEnd()}`,
                // @ts-ignore
                components: [row],
            });

            const filter = (i: Interaction) => i.user.id === message.author.id;
            const collector = botMessage.createMessageComponentCollector({
                filter,
                time: 30000 * Object.keys(codes).length,
            });

            collector.on('collect', async (i) => {
                await i.deferUpdate();

                const handleResponseAction = async (action: 'reset' | 'flag', codesList: string[]) => {
                    try {
                        if (action == 'reset') {
                            await database.updateCodes(codesList, { status: 'not_checked', credit: '' });
                        } else if (action == 'flag') {
                            await database.updateCodes(codesList, { status: 'needs_processed' });
                        }

                        const responseMessage =
                            action === 'reset' ? "I've reset all your codes!" : 'The statuses have been updated.';
                        await i.followUp({ content: responseMessage });
                    } catch (error) {
                        await i.followUp({
                            content: 'An error occurred while updating the codes.',
                        });
                    }
                };

                if (i.customId === 'untested') {
                    await i.followUp({
                        content:
                            'Let me know which you missed (split them by new lines). If you missed them all, just reply "all":',
                    });

                    const messageFilter = (m: Message) => m.author.id === message.author.id;
                    const messageCollector = message.channel.createMessageCollector({
                        filter: messageFilter,
                        time: 60000,
                    });

                    messageCollector.on('collect', async (m) => {
                        const missedCodes = m.content.toLowerCase().includes('all')
                            ? Object.keys(userCodes)
                            : m.content.split('\n').map((code) => code.trim());

                        const leftoverCodes = Object.keys(userCodes).filter((item) => !missedCodes.includes(item));
                        await handleResponseAction('reset', missedCodes);
                        await handleResponseAction('flag', leftoverCodes);
                        messageCollector.stop();
                    });

                    messageCollector.on('end', (collected) => {
                        if (!collected.size) {
                            message.channel.send(
                                `No codes were provided within the time limit. Please get with a <@&${config.vaultManager}> to sort this out.`
                            );
                        }
                    });

                    collector.stop();
                } else if (i.customId === 'no') {
                    await handleResponseAction('flag', Object.keys(codes));
                    collector.stop();
                } else if (i.customId === 'success') {
                    await i.followUp({
                        content: 'Which code cracked the vault?!:',
                    });

                    const messageCollector = message.channel.createMessageCollector({
                        filter: (m) => m.author.id === message.author.id,
                        time: 60000,
                    });

                    messageCollector.on('collect', async (m) => {
                        try {
                            const correctCode = [m.content];
                            await database.updateCodes(correctCode, { status: 'needs_processed' });
                            message.channel.send(
                                `<@&${config.vaultManager}> a successful code may have been found, please check it out: \`!viewq unverified\`.`
                            );
                        } catch (error) {
                            await m.reply({
                                content: 'An error occurred while updating the code.',
                            });
                        }
                        messageCollector.stop();
                    });

                    messageCollector.on('end', (collected) => {
                        if (!collected.size) {
                            message.channel.send(
                                `${userMention} please message any <@&${config.vaultManager}> so we can get this sorted, when you get a chance.`
                            );
                        }
                    });

                    collector.stop();
                }
            });

            collector.on('end', (collected) => {
                if (!collected.size) {
                    message.channel.send(
                        `${userMention} I assume you still haven't checked the codes. Please let me know when you do by initiating the \`!checked\` command.`
                    );
                }
            });
        } catch (error) {
            message.channel.send('Failed to fetch codes.');
        }
    },
};
