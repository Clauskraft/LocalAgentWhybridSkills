# SCA-01 Mobile App

📱 Android/iOS mobile client for SCA-01 Cloud API.

Built with **Expo** (React Native) for cross-platform support.

## Features

- 🔐 **Secure Login** - JWT authentication with secure token storage
- 💬 **Chat Sessions** - Create, manage, and chat with AI
- 🔄 **Cloud Sync** - All data synced to Railway cloud backend
- 🌙 **Dark Theme** - Beautiful dark UI matching desktop app

## Requirements

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- For Android: Android SDK or Expo Go app
- For iOS: macOS with Xcode or Expo Go app

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android (requires Android SDK)
npm run android

# Run on iOS (requires macOS + Xcode)
npm run ios

# Run in browser
npm run web
```

## Using Expo Go (Easiest)

1. Download **Expo Go** app on your phone
2. Run `npm start`
3. Scan the QR code with your phone

## Project Structure

```
sca-01-mobile/
├── App.tsx                    # Main app with navigation
├── src/
│   ├── api/
│   │   └── client.ts          # Railway API client
│   └── screens/
│       ├── LoginScreen.tsx    # Login/Register
│       ├── SessionsScreen.tsx # Session list
│       └── ChatScreen.tsx     # Chat interface
├── assets/                    # App icons and splash
├── app.json                   # Expo configuration
└── package.json
```

## Configuration

The app connects to the Railway cloud backend by default:

```typescript
const API_BASE_URL = "https://sca-01-phase3-production.up.railway.app";
```

To use a local backend during development, update `src/api/client.ts`:

```typescript
const API_BASE_URL = "http://YOUR_LOCAL_IP:8787";
```

## Building for Production

### Android APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build APK
eas build -p android --profile preview
```

### Android App Bundle (Play Store)

```bash
eas build -p android --profile production
```

## Security

- Tokens stored securely using `expo-secure-store`
- Automatic token refresh
- HTTPS communication with Railway backend

## API Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Check server status |
| `/auth/login` | POST | User login |
| `/auth/register` | POST | User registration |
| `/auth/refresh` | POST | Refresh access token |
| `/api/sessions` | GET | List sessions |
| `/api/sessions` | POST | Create session |
| `/api/sessions/:id` | DELETE | Delete session |
| `/api/sessions/:id/messages` | GET | Get messages |
| `/api/sessions/:id/messages` | POST | Send message |

## License

Private - SCA-01 Project

