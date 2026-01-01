# SCA-01 Mobile App Architecture

> **Version:** 1.0  
> **Status:** PROPOSED  
> **Platform:** Android (primary), iOS (optional)  
> **Framework:** Expo (React Native)

## 1. Executive Summary

SCA-01 Mobile giver adgang til AI-agenten fra Android (og iOS). 
Appen synkroniserer via Railway API og giver en **chat-fokuseret** oplevelse.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SCA-01 FULL PLATFORM STACK                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   DESKTOP              MOBILE               WEB                      │
│   ┌─────────┐         ┌─────────┐         ┌─────────┐               │
│   │ Electron│         │  Expo   │         │  React  │               │
│   │ Win/Mac │         │ Android │         │   PWA   │               │
│   │         │         │  (iOS)  │         │         │               │
│   └────┬────┘         └────┬────┘         └────┬────┘               │
│        │                   │                   │                     │
│   FULL ACCESS          LIMITED              LIMITED                  │
│   • Shell              • Chat only          • Chat only             │
│   • Files              • View history       • View history          │
│   • Browser            • Voice input        • No native             │
│   • System             • Notifications      │                       │
│        │                   │                   │                     │
│        └───────────────────┼───────────────────┘                     │
│                            │                                         │
│                    ┌───────▼───────┐                                │
│                    │ 🚂 RAILWAY    │                                │
│                    │    (EU)       │                                │
│                    │ ┌───────────┐ │                                │
│                    │ │ Fastify   │ │                                │
│                    │ │ PostgreSQL│ │                                │
│                    │ └───────────┘ │                                │
│                    └───────────────┘                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Choice: Expo (React Native)

| Aspect | Details |
|--------|---------|
| **Framework** | Expo SDK 52+ |
| **Language** | TypeScript (deler med desktop) |
| **UI** | React Native + NativeWind (Tailwind) |
| **State** | Zustand / TanStack Query |
| **Navigation** | Expo Router |
| **Auth** | Expo SecureStore + Biometrics |

### Hvorfor Expo?

| Fordel | Beskrivelse |
|--------|-------------|
| ✅ TypeScript | Samme sprog som desktop |
| ✅ Delt kode | API client, types, utils |
| ✅ EAS Build | Cloud builds, ingen Android Studio |
| ✅ OTA Updates | Opdater uden app store |
| ✅ Expo Go | Test på device under dev |

### Alternativer (ikke valgt)

| Option | Hvorfor ikke |
|--------|--------------|
| Flutter | Dart, ikke TypeScript |
| PWA | Mangler push, biometrics |
| Capacitor | Performance overhead |
| Native Kotlin | Kan ikke dele kode |

---

## 3. Mobile App Features

### 3.1 Core Features (MVP)

| Feature | Beskrivelse | Priority |
|---------|-------------|----------|
| **Chat** | Send/modtag beskeder | P0 |
| **History** | Se tidligere samtaler | P0 |
| **Auth** | Login med email/biometrics | P0 |
| **Sync** | Real-time med Railway | P0 |
| **Offline** | Cache seneste samtaler | P1 |

### 3.2 Enhanced Features (v2)

| Feature | Beskrivelse | Priority |
|---------|-------------|----------|
| **Voice** | Tale-til-tekst input | P1 |
| **Push** | Notifikationer | P1 |
| **Widgets** | Home screen widgets | P2 |
| **Wear OS** | Smartwatch support | P3 |
| **Share** | Del fra andre apps | P2 |

### 3.3 NOT Supported on Mobile

| Feature | Reason |
|---------|--------|
| Shell execution | Security risk |
| File system access | Limited + risky |
| Browser automation | Not applicable |
| MCP tool servers | Desktop only |
| System info | Limited API |

---

## 4. App Architecture

### 4.1 Folder Structure

```
sca-01-mobile/
├── app/                    # Expo Router pages
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── index.tsx       # Chat list
│   │   ├── chat/[id].tsx   # Chat view
│   │   └── settings.tsx
│   └── _layout.tsx
├── components/
│   ├── ChatBubble.tsx
│   ├── ChatInput.tsx
│   ├── MessageList.tsx
│   └── ...
├── hooks/
│   ├── useAuth.ts
│   ├── useChat.ts
│   └── useSync.ts
├── lib/
│   ├── api.ts              # Railway API client
│   ├── storage.ts          # Secure storage
│   └── notifications.ts
├── store/
│   ├── authStore.ts
│   └── chatStore.ts
├── app.json
├── package.json
└── tsconfig.json
```

### 4.2 Shared Code (Monorepo)

```
sca-01/
├── packages/
│   └── shared/             # Delt mellem alle apps
│       ├── src/
│       │   ├── types/      # TypeScript interfaces
│       │   ├── api/        # API client
│       │   ├── utils/      # Helpers
│       │   └── constants/
│       └── package.json
├── apps/
│   ├── desktop/            # Electron app (Phase 2)
│   ├── mobile/             # Expo app (Phase 4)
│   ├── web/                # React PWA (optional)
│   └── server/             # Railway backend (Phase 3)
└── package.json            # Workspace root
```

### 4.3 API Communication

```typescript
// packages/shared/src/api/client.ts
export class SCA01Client {
  constructor(private baseUrl: string, private token: string) {}

  // Auth
  async login(email: string, password: string): Promise<AuthResponse>
  async register(email: string, password: string): Promise<AuthResponse>
  async refreshToken(): Promise<string>

  // Sessions
  async getSessions(): Promise<Session[]>
  async getSession(id: string): Promise<Session>
  async createSession(title: string): Promise<Session>
  async deleteSession(id: string): Promise<void>

  // Messages
  async sendMessage(sessionId: string, content: string): Promise<Message>
  async getMessages(sessionId: string): Promise<Message[]>

  // Chat (streaming)
  async chat(sessionId: string, message: string): AsyncGenerator<ChatChunk>
}
```

---

## 5. Mobile UI Design

### 5.1 Screens

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE SCREENS                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   LOGIN     │  │   CHATS     │  │    CHAT     │          │
│  │             │  │             │  │             │          │
│  │  ┌───────┐  │  │  ┌───────┐  │  │  ┌───────┐  │          │
│  │  │ Logo  │  │  │  │Session│  │  │  │Message│  │          │
│  │  └───────┘  │  │  │ List  │  │  │  │ List  │  │          │
│  │             │  │  │       │  │  │  │       │  │          │
│  │  Email      │  │  │ ────  │  │  │  │ 👤    │  │          │
│  │  ────────   │  │  │ ────  │  │  │  │ ⚡    │  │          │
│  │  Password   │  │  │ ────  │  │  │  │ 👤    │  │          │
│  │  ────────   │  │  │       │  │  │  └───────┘  │          │
│  │             │  │  └───────┘  │  │             │          │
│  │  [Login]    │  │             │  │  ┌───────┐  │          │
│  │  [Biometric]│  │  [+ New]    │  │  │ Input │  │          │
│  │             │  │             │  │  └───────┘  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Design System

| Element | Style |
|---------|-------|
| **Colors** | Dark theme (match desktop) |
| **Font** | Inter / System |
| **Spacing** | 4px grid |
| **Radius** | 12px cards, 8px buttons |
| **Animation** | React Native Reanimated |

---

## 6. Security

### 6.1 Auth Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTH FLOW                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User opens app                                          │
│     │                                                        │
│     ▼                                                        │
│  2. Check SecureStore for refresh token                     │
│     │                                                        │
│     ├── Found → Validate with Railway                       │
│     │   │                                                    │
│     │   ├── Valid → Get new access token → Home             │
│     │   └── Invalid → Login screen                          │
│     │                                                        │
│     └── Not found → Login screen                            │
│                                                              │
│  3. Login options:                                          │
│     • Email + Password                                      │
│     • Biometric (if previously logged in)                   │
│     • (Future: SSO, passkeys)                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Token Storage

```typescript
// Expo SecureStore - encrypted on device
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('refresh_token', token);
await SecureStore.setItemAsync('access_token', accessToken);

// Biometric protection
import * as LocalAuthentication from 'expo-local-authentication';

const result = await LocalAuthentication.authenticateAsync({
  promptMessage: 'Log ind med fingeraftryk',
  fallbackLabel: 'Brug kodeord'
});
```

---

## 7. Implementation Plan

### Phase 4: Mobile App (3 Sprints)

#### Sprint 1: Foundation (Week 1)
- [ ] Setup Expo project
- [ ] Configure TypeScript + ESLint
- [ ] Setup monorepo with shared package
- [ ] Implement auth screens
- [ ] Basic navigation

**Deliverables:**
- `sca-01-mobile/` project
- `packages/shared/` extraction
- Login/Register screens

#### Sprint 2: Core Features (Week 2)
- [ ] Chat list screen
- [ ] Chat view with messages
- [ ] Send message to Railway
- [ ] Receive streaming response
- [ ] Offline cache with SQLite

**Deliverables:**
- Full chat functionality
- Offline support
- Message persistence

#### Sprint 3: Polish (Week 3)
- [ ] Push notifications (Expo Notifications)
- [ ] Voice input (Expo Speech)
- [ ] Biometric auth
- [ ] App icon + splash
- [ ] EAS Build setup
- [ ] Play Store listing

**Deliverables:**
- Production-ready app
- Play Store deployment
- APK for sideloading

---

## 8. Build & Distribution

### 8.1 Development

```bash
# Install
cd sca-01-mobile
npm install

# Run on device (Expo Go)
npx expo start

# Run on Android emulator
npx expo run:android
```

### 8.2 Production Build

```bash
# Setup EAS
npx eas-cli login
npx eas build:configure

# Build APK (for sideloading)
npx eas build --platform android --profile preview

# Build AAB (for Play Store)
npx eas build --platform android --profile production
```

### 8.3 Distribution Options

| Method | Pros | Cons |
|--------|------|------|
| **Play Store** | Official, auto-update | Review process |
| **APK sideload** | Instant, no review | Manual install |
| **EAS Update** | OTA updates | Only JS changes |

---

## 9. Cost Estimate

| Item | Cost |
|------|------|
| Expo EAS | Free (hobby) / $99/yr (pro) |
| Play Store | $25 one-time |
| Apple Dev | $99/yr (if iOS) |
| **Total (Android only)** | **$25 one-time** |

---

## 10. Timeline

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE TIMELINE                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Week 1    Week 2    Week 3    Week 4                       │
│  ──────    ──────    ──────    ──────                       │
│                                                              │
│  [Sprint 1: Foundation ]                                    │
│            [Sprint 2: Core Features    ]                    │
│                       [Sprint 3: Polish + Release]          │
│                                          │                   │
│                                          ▼                   │
│                                     🚀 LAUNCH               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Summary

| Aspect | Decision |
|--------|----------|
| **Framework** | Expo (React Native) |
| **Language** | TypeScript |
| **Backend** | Railway API (shared) |
| **Auth** | JWT + Biometrics |
| **Store** | Play Store + APK |
| **Timeline** | 3 weeks |
| **Cost** | $25 one-time |

> **Restrisiko:** Lav. Expo er mature, Railway API allerede planlagt. Ingen sensitiv data på device (kun tokens encrypted).

**Status:** PROPOSED - Awaiting Phase 3 completion

