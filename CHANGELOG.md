### v0.06 (2025-12-22)
- UPDATE: minor tweak to default icon sizing for /bookmarks
- Updated axios v1.12.2 => 1.13.2 (HTTP request client)
- Updated dotenv v17.2.2 => 17.2.3 (environment variable loader)
- Updated express v5.1.0 => 5.2.1 (web server framework)
- Updated jsonwebtoken v9.0.2 => 9.0.3 (JWT authentication)
- Updated nodemon v3.1.10 => 3.1.11 (server auto-restart tool)
- Updated prettier v3.6.2 => 3.7.4 (code formatter)
- Updated node-schedule v2.0.0 => 2.1.1 (task scheduler)
- Updated ws v8.2.3 => 8.18.3 (WebSocket communication)
- Updated esbuild v0.25.9 => 0.27.2 (fast JS bundler)
- Updated vite v7.1.4 => 7.3.0 (frontend build tool)
- Updated react v19.1.1 => 19.2.3 (UI library)
- Updated react-dom v19.1.1 => 19.2.3 (React web rendering)
- Updated react-router-dom v7.8.2 => 7.11.0 (client-side routing)
- Updated skycons-ts v0.2.0 => 1.0.0 (animated weather icons)
- Updated typescript v5.9.2 => 5.9.3 (static type checking)
- Updated @vitejs/plugin-react v5.0.2 => 5.1.2 (React support for Vite)
- Updated vite-tsconfig-paths v5.1.4 => 6.0.3 (TypeScript path mapping)
- Updated @types/node v24.3.1 => 24.5.0 (Node.js type definitions)
- Updated @types/react v19.1.12 => 19.1.13 (React type definitions)
- Updated @types/react-beautiful-dnd v13.1.2 => 13.1.8 (Drag-and-drop type definitions)

### v0.05 (2025-12-19)
- Weather forecast when clicking on widget from homepage of flame
- Updated settings to include weather forecast options
- FIX: resolved bug where edit UI did not update when reordering applications within a category

### v0.04 (2025-09-14)
- Updated prettier v2.8.8 => 3.6.2
- Updated skycons-ts v0.2.0 => 1.0.0 (animated weather icons)
- Updated weather logic => node-fetch package => axios (sec/vulnerability reasons)
- Updated weather cache logic moved to socket connection (centralized caching)
- Updated umzug v2.3.0 => 3.8.2)
- Changed UI => display icon name versus react ref => 'settings > interface > category icons'

### v0.03 (2025-09-13)
- FIX: update db migration scripts to include support for older structures (categories.section)
- FIX: apply npm security updates for Axios + Vite
- FIX: Dockerfile build files no longer need '--legacy-peer-deps' with recent updates
- Updated 'Settings => About => Updates' logic to be ridiculously overkill and customizable
- Updated 'Settings' menu including 'CSS' again by request => prev dev had moved to external file approach

### v0.02 (2025-09-08)
- Application categories can collapse
- Collapsible app cats can be configured settings > interface > categories
- FIX: bugs introduced by collapse Settings => state synchronization between pages
- FIX: restore 'CSS' menu option in Settings
- Updated nodemon 2.0.14 => 3.1.10 (security/vulnerability)
- Updated @types/node 16.11.6 => 24.3.1 (security/vulnerability)
- Updated redux-devtools-extension (requires Redux 3) => @redux-devtools/extension (Redux 5 and beyond)
- Updated codebase to remove extinct react-beautiful-dnd for @dnd-kit (security/vulnerability)

### v0.01 (2025-09-06)
- Fixed secure route blocking logging in via settings
- Fixed hardcoded JWT key (issue from orig repo: pawelmalak#465)
- Updated mdi icons to newest version 7.4.xx
- Complete security overhaul since 2023 update on original repo
