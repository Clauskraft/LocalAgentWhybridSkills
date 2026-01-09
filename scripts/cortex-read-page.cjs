const https = require('https');
const fs = require('fs');
const path = require('path');

// Try to load from local .env
try {
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf8').split('\n');
        lines.forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim();
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
    }
} catch (e) { }

// Try to load from config/integrations.json
let apiKey = process.env.NOTION_API_KEY; // OR NOTION_API_TOKEN
if (!apiKey) apiKey = process.env.NOTION_API_TOKEN;

try {
    const configPath = path.join(__dirname, '../config/integrations.json');
    if (fs.existsSync(configPath) && !apiKey) {
        const conf = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (conf.notion && conf.notion.apiKey) {
            apiKey = conf.notion.apiKey;
        }
    }
} catch (e) { }

if (!apiKey) {
    console.error("ERROR: NOTION_API_KEY / NOTION_API_TOKEN not found.");
    process.exit(1);
}

const pageId = process.argv[2];
if (!pageId) {
    console.error("Usage: node cortex-read-page.cjs <PAGE_ID>");
    process.exit(1);
}

console.log(`Reading Page Content: ${pageId}...`);

const optionsProperties = {
    hostname: 'api.notion.com',
    path: `/v1/pages/${pageId}`,
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
    }
};

const reqProp = https.request(optionsProperties, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        if (res.statusCode === 200) {
            const page = JSON.parse(data);
            console.log(`\nPage Metadata:`);
            console.log(`URL: ${page.url}`);
            if (page.properties) {
                console.log(`Properties: ${Object.keys(page.properties).join(', ')}`);
                // Dump specific text properties if they look relevant
                /*
                Object.values(page.properties).forEach(prop => {
                   if(prop.type === 'rich_text') console.log(`[Prop]: ${prop.rich_text.map(t=>t.plain_text).join('')}`);
                });
                */
            }
        } else {
            console.log(`Failed to fetch page metadata: ${res.statusCode}`);
        }

        // Now fetch blocks
        fetchBlocks();
    });
});
reqProp.end();

function fetchBlocks() {
    const options = {
        hostname: 'api.notion.com',
        path: `/v1/blocks/${pageId}/children?page_size=100`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            if (res.statusCode !== 200) {
                console.error(`API Error (Blocks): ${res.statusCode} - ${res.statusMessage}`);
                return;
            }
            const json = JSON.parse(data);
            if (json.results.length === 0) {
                console.log("(No content blocks found)");
                return;
            }

            json.results.forEach(block => {
                const type = block.type;
                const content = block[type];

                if (content && content.rich_text && content.rich_text.length > 0) {
                    const text = content.rich_text.map(t => t.plain_text).join('');

                    if (type === 'heading_1') console.log(`\n# ${text}`);
                    else if (type === 'heading_2') console.log(`\n## ${text}`);
                    else if (type === 'heading_3') console.log(`\n### ${text}`);
                    else if (type === 'bulleted_list_item') console.log(`- ${text}`);
                    else if (type === 'numbered_list_item') console.log(`1. ${text}`);
                    else if (type === 'code') console.log(`\n\`\`\`${content.language || ''}\n${text}\n\`\`\``);
                    else if (type === 'paragraph') console.log(`\n${text}`);
                    else console.log(`[${type}]: ${text}`);
                } else {
                    if (type === 'child_page') console.log(`[Child Page]: ${block.child_page.title}`);
                    else console.log(`[Block: ${type}] (No text content)`);
                }
            });
        });
    });

    req.on('error', (e) => {
        console.error(`Network Error: ${e.message}`);
    });

    req.end();
}
