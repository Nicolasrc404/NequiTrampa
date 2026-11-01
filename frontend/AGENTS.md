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
npm run typecheck           # same as above
npm run test:unit           # compile pure modules + run node --test (no Jest)
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

`test:unit` compiles only `src/config`, `src/services`, `src/utils` and `tests/unit` via `tsconfig.test.json` (it excludes `src/services/api.ts` and `src/services/session/platform.ts`, which import Expo/React Native). Keep new testable logic pure in those folders and add `tests/unit/*.test.ts`.

There is no lint script or ESLint configuration in this app. Do not add lint tooling without explicit approval. Run typecheck and unit tests before declaring any task done.

## Navigation

- The app entry is `index.ts`, which calls `registerRootComponent(App)`.
- `App.tsx` owns client-app navigation: it stores the active `AppState`, wires services/hooks, routes loading/empty/error states, and renders every client module (movements, beneficiaries, categories, transfers, recharges, budgets, goals, cash, analytics, wallet, profile, access, configuration, projection status). New screens are added to this switch.
- `DevStateBarMulti` is the development switcher for previewing states.
- `EXPO_PUBLIC_APP_MODE=backoffice` renders `src/navigation/BackofficeApp.tsx` instead, which has its own stack (`NavContext`) and role-gated routes.
- `SessionGate` is the client login: it captures email/password and calls `sessionManager.signIn`; without a valid session the app shows no data and allows no operations. Do not add a parallel login screen or simulate authentication. The backoffice has `src/screens/auth/LoginScreen.tsx`.
- Expo Router and React Navigation are NOT installed. Do not add them or migrate navigation without explicit approval.

## Project structure

- `App.tsx` — root component and client-app state router.
- `src/screens/<module>/` — screens grouped by module (movements, beneficiaries, categories, transfers, recharges, budgets, goals, cash, analytics, wallet, access, profile, configuration, projection-status, plus backoffice modules: auth, home, users, cases, customers, operations, reversals).
- `src/components/common/` — shared UI (including `states/` loading/empty/error) and `src/components/<module>/` — module-specific UI.
- `src/services/` — pure domain clients over `HttpClient`; `src/hooks/` — React data/action hooks.
- `src/api/` — legacy HTTP compatibility layer used by the backoffice and `useAsync`; do not add new client code there.
- `src/services/session/` — session core; `src/services/session/platform.ts` wires SecureStore (native) or memory (web).
- `src/data/demo*.ts` — clearly identified DEMO data.
- `src/theme/colors.ts` — single source of design tokens.
- `src/types/` — shared module types. The `AppState` union lives in `App.tsx`.

## Styling

- Use React Native primitives (`View`, `Text`, `Pressable`, `TextInput`, `ScrollView`, `FlatList`) and `StyleSheet`.
- Import colors from `src/theme/colors.ts`; keep it as the single token source. Do not create a parallel `src/theme.ts`.
- Do not copy Stitch HTML directly as JSX.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

### INSPECCIONAR Y REUTILIZAR ANTES DE IMPLEMENTAR

Antes de implementar cualquier funcionalidad, el agente debe revisar las
implementaciones existentes, las carpetas del proyecto y los patrones
arquitectónicos aplicables. Debe reutilizar y extender la estructura actual
siempre que sea posible. Solo puede crear carpetas, servicios, hooks,
componentes o abstracciones nuevos cuando haya verificado que no existe una
alternativa adecuada. Está prohibido introducir estructuras paralelas o
duplicadas sin justificación técnica.

La separación arquitectónica oficial es:

- Hooks React: `frontend/src/hooks/`.
- Interfaces, tipos, enums y contratos de datos: `frontend/src/types/`.
- Acceso HTTP al Gateway: `frontend/src/services/` (capa nueva); `frontend/src/api/` es legado del backoffice.
- Presentación e interacción visual: `frontend/src/screens/` y `frontend/src/components/<módulo>/`.

No deben crearse `frontend/types/` ni estructuras paralelas.

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
