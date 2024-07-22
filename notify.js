const axios = require('axios');
const qs = require('qs');

async function checkForCodes(client) {

    var endpoint = 'http://septor.xyz/cherrytree/fetch_codes.php';
    var params = qs.stringify({ action: 'codecheck', status: 'not_checked' });

    try {
        const response = await axios.post(endpoint, params);
        const data = response.data;

        if (data.error) {
            console.error('Error fetching codes:', data.error);
            return;
        }

        const usersToNotify = {};

        data.forEach(code => {
            if (code.credit) {
                if (!usersToNotify[code.credit]) {
                    usersToNotify[code.credit] = [];
                }
                usersToNotify[code.credit].push(code);
            }
        });

        for (const [userId, codes] of Object.entries(usersToNotify)) {
            const user = await client.users.fetch(userId);
            const codesList = codes.join('\n');
            user.send(`You have the following codes assigned to you that are not flagged as checked:\n${codesList}\n\nPlease check them as soon as possible notify me in the #vault-crackers channel.`);
        }

    } catch (error) {
        console.error('Error checking and notifying users:', error);
    }
}

module.exports = {
    checkForCodes
};