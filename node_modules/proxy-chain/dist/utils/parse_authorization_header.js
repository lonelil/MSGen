"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAuthorizationHeader = void 0;
const splitAt = (string, index) => {
    return [
        index === -1 ? '' : string.substring(0, index),
        index === -1 ? '' : string.substring(index + 1),
    ];
};
const parseAuthorizationHeader = (header) => {
    if (header) {
        header = header.trim();
    }
    if (!header) {
        return null;
    }
    const [type, data] = splitAt(header, header.indexOf(' '));
    if (type.toLowerCase() !== 'basic') {
        return { type, data };
    }
    const auth = Buffer.from(data, 'base64').toString();
    const [username, password] = splitAt(auth, auth.indexOf(':'));
    return {
        type,
        data,
        username,
        password,
    };
};
exports.parseAuthorizationHeader = parseAuthorizationHeader;
//# sourceMappingURL=parse_authorization_header.js.map