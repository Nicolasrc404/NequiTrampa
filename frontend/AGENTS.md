This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

This app uses Expo SDK 58 (`~58.0.19`), React Native 0.88, React 19.3 and TypeScript 6.

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

This project uses npm (`package-lock.json`); there is no `bun.lock`.

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

There is no lint script or ESLint configuration in this app. Do not add lint tooling without explicit approval. Run typecheck before declaring any task done.

## Navigation

- The app entry is `index.ts`, which calls `registerRootComponent(App)`.
- `App.tsx` owns navigation: it stores the active `MovementsState` and the selected movement, then renders one of `Movements01Screen`–`Movements08Screen`.
- `DevStateBar` is the current development switcher for previewing states.
- Screens live in `src/screens/movements/`.
- Expo Router and React Navigation are NOT installed. Do not add them or migrate navigation without explicit approval.

## Project structure

- `App.tsx` — root component and current state-based navigation.
- `src/screens/movements/` — the eight implemented screens.
- `src/components/common/` — shared UI components.
- `src/components/movements/` — movement-specific UI components.
- `src/data/demoMovements.ts` — clearly identified DEMO data.
- `src/theme/colors.ts` — current source of design tokens.
- `src/types/movements.ts` — shared types.

## Styling

- Use React Native primitives (`View`, `Text`, `Pressable`, `TextInput`, `ScrollView`, `FlatList`) and `StyleSheet`.
- Import colors from `src/theme/colors.ts`; keep it as the single token source. Do not create a parallel `src/theme.ts`.
- Do not copy Stitch HTML directly as JSX.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
