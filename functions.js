const config = require('./config.json');

function canPostInChannel(commandName, channelId) {
    if (config.allowedChannels[commandName]) {
        return config.allowedChannels[commandName].includes(channelId);
    }
    return false;
}

function getUserAccessLevel(userId) {
    if (config.userAccessLevels.high.includes(userId)) {
        return 'high';
    } else if (config.userAccessLevels.medium.includes(userId)) {
        return 'medium';
    } else {
        return 'low';
    }
}

function canAccessCommand(userId, commandAccessLevel) {
    const userAccessLevel = getUserAccessLevel(userId);

    if (commandAccessLevel === 'high' && userAccessLevel !== 'high') {
        return false;
    } else if (commandAccessLevel === 'medium' && userAccessLevel === 'low') {
        return false;
    }
    return true;
}

function formatNumber(number) {
    const digits = number.toString().length;
    const suffix = digits >= 10 ? 'b' : digits >= 7 ? 'm' : digits >= 4 ? 'k' : '';
    const formattedNumber = number / (suffix === 'b' ? 1000000000 : suffix === 'm' ? 1000000 : suffix === 'k' ? 1000 : 1);
    return formattedNumber.toFixed(0) + suffix;
}

function isValidRomanNumeral(str) {
    const romanNumeralPattern = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/;
    return romanNumeralPattern.test(str);
}

module.exports = {
    canPostInChannel,
    getUserAccessLevel,
    canAccessCommand,
    formatNumber,
    isValidRomanNumeral,
};