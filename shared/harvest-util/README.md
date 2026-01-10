# @local-agent/harvest-util

> Shared harvest utilities for ROMA + WidgeTDC integration

## Installation

```bash
# From LocalAgentWhybridSkills root
npm install ./shared/harvest-util
```

## Features

- **Auth Utilities**: `getCredentials()`, `hasValidCredentials()`
- **Rate Limiting**: `createRateLimiter()`
- **Data Extraction**: `extractEmails()`, `extractUrls()`, `extractPhones()`, `extractKeywords()`
- **Event Utilities**: `createEventEmitter()`
- **Helpers**: `sleep()`, `withRetry()`, `batchExecute()`, `hashContent()`

## Usage

```typescript
import { 
  getCredentials, 
  createRateLimiter, 
  extractEmails,
  hashContent 
} from '@local-agent/harvest-util';

// Check credentials
const creds = getCredentials('SHOWPAD');
console.log(creds); // { apiKey: '...', clientId: '...', ... }

// Create rate limiter
const limiter = createRateLimiter({ maxRequests: 100, windowMs: 60000 });
const canProceed = limiter.check();

// Extract data
const emails = extractEmails('Contact us at test@example.com');
console.log(emails); // ['test@example.com']

// Hash content
const hash = hashContent('some content');
```

## Skill Registry

```typescript
import { 
  getSkillById, 
  getSkillsByCategory,
  formatSkillsForRoma 
} from '@local-agent/harvest-util/skill-registry';

// Get all web harvest skills
const webSkills = getSkillsByCategory('web');

// Format for ROMA planning
const romaContext = formatSkillsForRoma();
```

## ROMA Bridge

```typescript
import { RomaHarvestBridge } from '@local-agent/harvest-util/roma-bridge';

const bridge = new RomaHarvestBridge(romaEngine, mcpClient, cache);

// Plan a harvest mission
const plan = await bridge.planHarvest('Analyze showpad.com for security');

// Execute the plan
const result = await bridge.executeHarvest(plan);
```

## License

MIT
