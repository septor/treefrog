export function canPostInChannel(commandName, channelId, allowedChannels) {
    if (allowedChannels[commandName]) {
        return allowedChannels[commandName].includes(channelId);
    }
    return false;
}

function getUserAccessLevel(userId, userAccessLevels) {
    if (userAccessLevels.high.includes(userId)) {
        return 'high';
    } else if (userAccessLevels.medium.includes(userId)) {
        return 'medium';
    } else {
        return 'low';
    }
}

export function canAccessCommand(userId, commandAccessLevel, userAccessLevels) {
    const userAccessLevel = getUserAccessLevel(userId, userAccessLevels);

    if (commandAccessLevel === 'high' && userAccessLevel !== 'high') {
        return false;
    } else if (commandAccessLevel === 'medium' && userAccessLevel === 'low') {
        return false;
    }
    return true;
}

export function formatNumber(number) {
    const digits = number.toString().length;
    const suffix = digits >= 10 ? 'b' : digits >= 7 ? 'm' : digits >= 4 ? 'k' : '';
    const formattedNumber =
        number / (suffix === 'b' ? 1000000000 : suffix === 'm' ? 1000000 : suffix === 'k' ? 1000 : 1);
    return formattedNumber.toFixed(0) + suffix;
}

export function convertMilliseconds(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    let result = '';
    if (minutes > 0) {
        result += `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    if (seconds > 0) {
        if (result) {
            result += ' and ';
        }
        result += `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }

    return result;
}

export function firstLetterUppercase(word) {
    const firstLetter = word.charAt(0);
    const firstLetterCap = firstLetter.toUpperCase();
    const remainingLetters = word.slice(1);
    return firstLetterCap + remainingLetters;
}

export function isInteger(value) {
    return /^\d+$/.test(value);
}

export function toTitleCase(str) {
    return str
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
