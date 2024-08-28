import { Client, Collection, GatewayIntentBits, Message } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import url from 'url';

import { loadConfig } from './config.js';
import { Context } from './context.js';
import { Database } from './database.js';
import { checkForCodes } from './notify.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const context: Context = {
    config: await loadConfig('config.json'),
    database: new Database('data/data.json'),
};

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const token = process.env.TOKEN;
const prefix = context.config.prefix;

interface Command {
    execute: (message: Message<boolean>, args: string[], context: Context) => Promise<void>;
}

async function loadCommands(): Promise<Collection<string, Command>> {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs
        .readdirSync(url.pathToFileURL(commandsPath))
        .filter((file) => file.endsWith('.js') || file.endsWith('.ts'));

    const commands: Collection<string, Command> = new Collection();
    for (const file of commandFiles) {
        const command = await import(url.pathToFileURL(path.join(commandsPath, file)).toString());
        if (command.execute && typeof command.execute == 'function') {
            console.log('loaded');
            commands.set(command.name, command);
        }
    }

    return commands;
}

const commands = await loadCommands();

client.once('ready', async () => {
    console.log(`Bot online as ${client.user!.tag}!`);

    setInterval(() => {
        checkForCodes(client, context);
    }, 3600000);

    const restartPath = path.join(__dirname, 'restart.json');
    if (fs.existsSync(restartPath)) {
        const restartData = JSON.parse(fs.readFileSync(restartPath, 'utf8'));

        try {
            const channel = await client.channels.fetch(restartData.channelId);
            if (channel?.partial) {
                const restartMessage = await channel.messages.fetch(restartData.messageId).catch((err) => {
                    console.error('Error fetching restart message:', err);
                });

                if (restartMessage && restartMessage.react) {
                    await restartMessage.react('✅');
                } else {
                    console.error('Restart message not found or react method is not available');
                }
            } else {
                console.error('Channel not found');
            }
        } catch (error) {
            console.error('Error processing restart:', error);
        }

        fs.unlinkSync(restartPath);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args[0].toLowerCase();
    if (!commands.has(commandName)) return;

    const command = commands.get(commandName);
    if (command) {
        try {
            await command.execute(message, args.slice(1), context);
        } catch (error) {
            console.error(error);
            await message.reply('There was an error trying to execute that command!');
        }
    }
});

await client.login(token);
