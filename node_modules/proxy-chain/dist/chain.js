"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chain = void 0;
const tslib_1 = require("tslib");
const http_1 = tslib_1.__importDefault(require("http"));
const buffer_1 = require("buffer");
const count_target_bytes_1 = require("./utils/count_target_bytes");
const get_basic_1 = require("./utils/get_basic");
const createHttpResponse = (statusCode, message) => {
    return [
        `HTTP/1.1 ${statusCode} ${http_1.default.STATUS_CODES[statusCode] || 'Unknown Status Code'}`,
        'Connection: close',
        `Date: ${(new Date()).toUTCString()}`,
        `Content-Length: ${buffer_1.Buffer.byteLength(message)}`,
        ``,
        message,
    ].join('\r\n');
};
/**
 * Passes the traffic to upstream HTTP proxy server.
 * Client -> Apify -> Upstream -> Web
 * Client <- Apify <- Upstream <- Web
 */
const chain = ({ request, sourceSocket, head, handlerOpts, server, isPlain, }) => {
    if (head && head.length > 0) {
        throw new Error(`Unexpected data on CONNECT: ${head.length} bytes`);
    }
    const { proxyChainId } = sourceSocket;
    const { upstreamProxyUrlParsed: proxy } = handlerOpts;
    const options = {
        method: 'CONNECT',
        path: request.url,
        headers: [
            'host',
            request.url,
        ],
        localAddress: handlerOpts.localAddress,
        family: handlerOpts.ipFamily,
        lookup: handlerOpts.dnsLookup,
    };
    if (proxy.username || proxy.password) {
        options.headers.push('proxy-authorization', (0, get_basic_1.getBasicAuthorizationHeader)(proxy));
    }
    const client = http_1.default.request(proxy.origin, options);
    client.on('connect', (response, targetSocket, clientHead) => {
        (0, count_target_bytes_1.countTargetBytes)(sourceSocket, targetSocket);
        if (sourceSocket.readyState !== 'open') {
            // Sanity check, should never reach.
            targetSocket.destroy();
            return;
        }
        targetSocket.on('error', (error) => {
            server.log(proxyChainId, `Chain Destination Socket Error: ${error.stack}`);
            sourceSocket.destroy();
        });
        sourceSocket.on('error', (error) => {
            server.log(proxyChainId, `Chain Source Socket Error: ${error.stack}`);
            targetSocket.destroy();
        });
        if (response.statusCode !== 200) {
            server.log(proxyChainId, `Failed to authenticate upstream proxy: ${response.statusCode}`);
            if (isPlain) {
                sourceSocket.end();
            }
            else {
                sourceSocket.end(createHttpResponse(502, ''));
            }
            return;
        }
        if (clientHead.length > 0) {
            targetSocket.destroy(new Error(`Unexpected data on CONNECT: ${clientHead.length} bytes`));
            return;
        }
        server.emit('tunnelConnectResponded', {
            proxyChainId,
            response,
            socket: targetSocket,
            head: clientHead,
        });
        sourceSocket.write(isPlain ? '' : `HTTP/1.1 200 Connection Established\r\n\r\n`);
        sourceSocket.pipe(targetSocket);
        targetSocket.pipe(sourceSocket);
        // Once target socket closes forcibly, the source socket gets paused.
        // We need to enable flowing, otherwise the socket would remain open indefinitely.
        // Nothing would consume the data, we just want to close the socket.
        targetSocket.on('close', () => {
            sourceSocket.resume();
            if (sourceSocket.writable) {
                sourceSocket.end();
            }
        });
        // Same here.
        sourceSocket.on('close', () => {
            targetSocket.resume();
            if (targetSocket.writable) {
                targetSocket.end();
            }
        });
    });
    client.on('error', (error) => {
        server.log(proxyChainId, `Failed to connect to upstream proxy: ${error.stack}`);
        // The end socket may get connected after the client to proxy one gets disconnected.
        if (sourceSocket.readyState === 'open') {
            if (isPlain) {
                sourceSocket.end();
            }
            else {
                sourceSocket.end(createHttpResponse(502, ''));
            }
        }
    });
    sourceSocket.on('error', () => {
        client.destroy();
    });
    // In case the client ends the socket too early
    sourceSocket.on('close', () => {
        client.destroy();
    });
    client.end();
};
exports.chain = chain;
//# sourceMappingURL=chain.js.map