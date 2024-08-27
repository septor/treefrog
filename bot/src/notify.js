import axios from 'axios';
import qs from 'qs';

export async function checkForCodes(client, config) {
    const endpoint = config.updatepoint;
    const params = qs.stringify({ action: 'codecheck', status: 'not_checked' });

    const vaultChannels = config.allowedChannels['vault'].map((channelId) => `<#${channelId}>`).join(', ');

    try {
        const response = await axios.post(endpoint, params);
        const data = response.data;

        if (data.error) {
            console.error('Error fetching codes:', data.error);
            return;
        }

        const usersToNotify = {};

        if (typeof data === 'object' && !Array.isArray(data)) {
            for (const [codeId, codeDetails] of Object.entries(data)) {
                if (codeDetails.credit) {
                    if (!usersToNotify[codeDetails.credit]) {
                        usersToNotify[codeDetails.credit] = [];
                    }
                    usersToNotify[codeDetails.credit].push(codeId);
                }
            }
        } else {
            console.error('Unexpected data format:', data);
            return;
        }

        for (const [userId, codes] of Object.entries(usersToNotify)) {
            const user = await client.users.fetch(userId);
            const codesList = codes.join('\n');
            user.send(
                `You have the following codes assigned to you that are not flagged as checked:\n${codesList}\n\nPlease check them as soon as possible notify me in one of the following channels: ${vaultChannels}`
            );
        }
    } catch (error) {
        console.error('Error checking and notifying users:', error);
    }
}
