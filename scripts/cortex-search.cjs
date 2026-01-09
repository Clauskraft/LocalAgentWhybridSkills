const https = require('https');
const fs = require('fs');
const path = require('path');

// Try to load from local .env if available (simple parser)
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
let apiKey = process.env.NOTION_API_KEY;
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
    console.error("ERROR: NOTION_API_KEY not found in environment or integrations.json");
    console.error("Please add it to .env or config/integrations.json");
    process.exit(1);
}

const query = process.argv[2] || "";

console.log(`Executing CORTEX Search (Broad Query) for: "${query}"...`);

const options = {
    hostname: 'api.notion.com',
    path: '/v1/search',
    method: 'POST',
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
            console.error(`API Error: ${res.statusCode} - ${res.statusMessage}`);
            console.error(data);
            return;
        }
        const json = JSON.parse(data);
        console.log(`\nSuccess! Found ${json.results.length} relevant items in CORTEX.`);

        json.results.slice(0, 10).forEach(r => {
            let title = "Untitled";
            let type = r.object;

            if (r.properties) {
                // Try common title properties
                const titleProp = r.properties.Name || r.properties.Title || r.properties.Task || r.properties.Page;
                if (titleProp && titleProp.title && titleProp.title.length > 0) {
                    title = titleProp.title.map(t => t.plain_text).join('');
                }
            }

            // Icon
            const icon = r.icon?.emoji || "📄";

            console.log(`${icon} [${type}] ${title} \n   Link: ${r.url}`);
        });
    });
});

req.on('error', (e) => {
    console.error(`Network Error: ${e.message}`);
});

req.write(JSON.stringify({
    query: query,
    page_size: 10,
    sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
    }
}));
req.end();
