# Scout Leader App

Mobile app for troop leaders — offline-first attendance and activity management, synced to Scout Manager.

## For Troop Leaders: Installing the App

### iOS (TestFlight)

1. Install [TestFlight](https://apps.apple.com/app/testflight/id899247664) from the App Store.
2. Open the TestFlight invite link shared by your troop administrator.
3. Tap **Accept** → **Install**.
4. The app appears on your home screen as **Scout Leader**.

### Android (APK Sideload)

1. On your Android device, go to **Settings → Apps → Special app access → Install unknown apps**.
2. Allow installs from your browser or file manager.
3. Download the `.apk` file shared by your troop administrator.
4. Open the downloaded file and tap **Install**.
5. The app appears in your app drawer as **Scout Leader**.

---

## For Developers

### Prerequisites

- Node.js 20+
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g expo-cli`
- [EAS CLI](https://docs.expo.dev/eas/): `npm install -g eas-cli`
- An [Expo account](https://expo.dev/signup) with access to the `scout-leader-app` project

### Setup

```bash
npm install
```

### Run locally

```bash
npm start          # Expo Go (quick dev)
npm run ios        # iOS simulator
npm run android    # Android emulator
```

### CI (GitHub Actions)

Every pull request runs:

| Check | Command |
|---|---|
| Lint | `npm run lint` |
| Type check | `npm run type-check` |
| Tests | `npm test` |

### Build & Distribution (EAS Build)

Builds run automatically on every push to `main` using the `preview` profile, producing:

- **iOS**: ad-hoc IPA delivered to TestFlight internal testers
- **Android**: APK available for direct download/sideload

To trigger a build manually:

```bash
# Preview (internal testing)
eas build --platform all --profile preview

# Production (App Store / Google Play)
eas build --platform all --profile production
```

#### Required GitHub Secrets

| Secret | Description |
|---|---|
| `EXPO_TOKEN` | Personal access token from [expo.dev/accounts/\[account\]/settings/access-tokens](https://expo.dev/accounts) |

#### Required EAS / Apple / Google credentials

- Apple Developer account with App ID `net.beulke.scoutleader` registered
- iOS distribution certificate and provisioning profile (managed by EAS Credentials)
- Google Play service account JSON (for `production` submit only)

Configure credentials interactively:

```bash
eas credentials
```

### Project structure

```
app/          Expo Router screens
src/
  api/        Scout Manager API client & sync protocol
  auth/       Token storage
  db/         SQLite schema and DAOs
  sync/       Offline-first sync engine (push/pull/backoff)
  components/ Shared UI components
```
