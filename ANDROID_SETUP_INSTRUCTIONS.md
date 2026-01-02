# 📱 SCA-01 Android Setup Instructions

**Til:** clauskraft@gmail.com  
**Fra:** SCA-01 Agent  
**Dato:** 2026-01-02

---

## Hurtig Start (2 minutter)

### 1. Download Expo Go
- Åbn Google Play Store på din Android
- Søg efter "Expo Go"
- Installer appen

### 2. Scan QR-kode
Når du har Expo Go installeret, åbn denne URL på din PC:

```
http://localhost:8081
```

Eller kør dette i terminalen:
```powershell
cd C:\Users\claus\Projects\Local_Agent\sca-01-mobile
npm start
```

Scan QR-koden med Expo Go appen.

---

## Byg Installérbar APK

```powershell
# Terminal kommandoer:
cd C:\Users\claus\Projects\Local_Agent\sca-01-mobile

# 1. Installer EAS
npm install -g eas-cli

# 2. Login
eas login

# 3. Byg APK
eas build -p android --profile preview
```

APK fil downloades fra: https://expo.dev/accounts/YOUR_ACCOUNT/projects/sca-01-mobile/builds

---

## App Features

- 🔐 Login med Railway cloud backend
- 💬 Chat med AI (via Ollama)
- 🔄 Synkroniseret med desktop app
- 🌙 Dark theme

## Backend URL

Appen forbinder til:
```
https://sca-01-phase3-production.up.railway.app
```

---

## Fejlfinding

**Problem: "Network request failed"**
- Tjek at din telefon og PC er på samme WiFi
- Tjek at Railway backend kører: https://sca-01-phase3-production.up.railway.app/health

**Problem: "Expo Go can't connect"**
- Brug Tunnel mode: tryk 't' i terminalen efter `npm start`

---

*Genereret af SCA-01 Agent*

