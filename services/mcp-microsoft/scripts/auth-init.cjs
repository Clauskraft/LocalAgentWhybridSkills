
const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, '../build/index.js');
const server = spawn('node', [serverPath], {
    env: process.env,
    cwd: path.join(__dirname, '..')
});

let buffer = '';

server.stdout.on('data', (data) => {
    const msg = data.toString();
    console.log('[MCP stdout]', msg);

    // Simple logic to proceed after initialization
    if (msg.includes('"id":1')) {
        // Init response received, send initialized notification
        server.stdin.write(JSON.stringify({
            jsonrpc: "2.0",
            method: "notifications/initialized"
        }) + '\n');

        // Call login_status
        setTimeout(() => {
            console.log('Sending login_status request...');
            server.stdin.write(JSON.stringify({
                jsonrpc: "2.0",
                id: 2,
                method: "tools/call",
                params: {
                    name: "login_status",
                    arguments: {}
                }
            }) + '\n');
        }, 500);
    }
});

server.stderr.on('data', (data) => {
    const msg = data.toString();
    console.error('[MCP stderr]', msg);

    // Capture Device Code
    // Pattern: "To sign in, use a web browser to open the page https://microsoft.com/devicelogin and enter the code A1B2C3D4E to authenticate."
    const match = msg.match(/enter the code ([A-Z0-9]+) to authenticate/);
    if (match) {
        const userCode = match[1];
        console.log('\n!!! ACTION REQUIRED !!!');
        console.log('USER CODE:', userCode);
        console.log('URL: https://microsoft.com/devicelogin');
        console.log('Opening browser for you...');

        // Use standard 'start' command on windows to open url
        require('child_process').exec('start https://microsoft.com/devicelogin');
    }
});

// Send Initialize
const initMsg = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "auth-script", version: "1.0" }
    }
};

server.stdin.write(JSON.stringify(initMsg) + '\n');
