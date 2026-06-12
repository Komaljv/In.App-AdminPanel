# In.APP Admin Panel

A production-grade Next.js admin dashboard built with the App Router, TypeScript, and a fully token-driven design system.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict mode) |
| Styling | CSS Modules + CSS Custom Properties (design tokens) |
| Icons | Lucide React |
| Linting | ESLint (Next.js config) |
| Formatting | Prettier |

---

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout (theme, metadata)
│   ├── page.tsx                  # Root redirect → /login
│   ├── globals.css               # Design token definitions + global styles
│   │
│   ├── login/                    # Public login page
│   │   ├── page.tsx
│   │   └── login.module.css
│   │
│   ├── accept-invite/[token]/    # Public invite acceptance flow
│   │   ├── page.tsx
│   │   └── page.module.css
│   │
│   └── dashboard/                # Protected dashboard (auth-guarded layout)
│       ├── layout.tsx            # Dashboard shell + auth guard
│       ├── page.tsx              # Dashboard home (stats + activity)
│       ├── page.module.css
│       ├── users/                # Users management
│       ├── invitations/          # Invitation management
│       └── settings/             # App settings
│
├── components/
│   ├── ui/                       # Reusable, design-system UI primitives
│   │   ├── index.ts              # Barrel export: import { Button, Badge } from '@/components/ui'
│   │   ├── Button/               # Button (primary | secondary | outline | ghost | danger)
│   │   ├── Badge/                # Badge (success | warning | danger | info | neutral)
│   │   ├── Input/                # Accessible input with label, error, icon
│   │   ├── Card/                 # Card with CardHeader / CardBody / CardFooter
│   │   └── Table/                # Generic typed table with skeleton loading
│   │
│   ├── sidebar/                  # App sidebar (dark branded)
│   ├── invite-modal/             # Invite user modal
│   └── confirm-dialog/           # Confirmation dialog
│
├── config/
│   └── app.config.ts             # All env vars, routes, API endpoints, constants
│
├── hooks/
│   ├── index.ts                  # Barrel export
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   └── useClickOutside.ts
│
├── lib/
│   ├── api.ts                    # Typed API client (uses APP_CONFIG.apiUrl)
│   ├── auth-context.tsx          # Auth state + useAuth hook
│   ├── toast-context.tsx         # Toast notifications + useToast hook
│   └── utils.ts                  # Pure utility helpers (cx, formatDate, etc.)
│
└── types/
    └── index.ts                  # All global TypeScript types (single source of truth)
```

---

## Design System

All colors are defined as **CSS custom properties** in `src/app/globals.css`. No component ever uses a hardcoded hex value.

### Semantic Token Categories

| Token prefix | Purpose |
|---|---|
| `--color-primary` | Brand CTA (golden yellow) |
| `--color-accent` | Brand dark (sidebar blue) |
| `--color-bg` / `--color-surface` | Page & card backgrounds |
| `--color-text-*` | Text hierarchy |
| `--color-border` | Borders & dividers |
| `--color-success/warning/danger/info` | Status colors |
| `--color-sidebar-*` | Sidebar-specific (dark surface) |
| `--space-*` | 8px spacing scale |
| `--shadow-*` | Elevation scale |
| `--radius-*` | Border radius scale |
| `--text-*` | Typography scale |

### Dark Mode

Toggle dark mode by setting `data-theme="dark"` on the `<html>` element:

```ts
document.documentElement.setAttribute('data-theme', 'dark');
```

All tokens update automatically — no component changes needed.

---

## Environment Variables

Copy `.env.example` → `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_APP_URL` | Frontend app URL |
| `NEXT_PUBLIC_APP_NAME` | App display name |
| `NEXT_PUBLIC_AUTH_STORAGE_KEY` | localStorage key for auth session |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Conventions

- **No hardcoded hex colors** in components — use CSS variables only
- **No inline `style=` color props** — use CSS modules with token references
- **Import UI components** from `@/components/ui` (barrel)
- **Import types** from `@/types`
- **Import utilities** from `@/lib/utils`
- **Import hooks** from `@/hooks`
- **Import config** from `@/config/app.config`

---

## Badge Variants

| Status | Variant |
|---|---|
| Active / Accepted | `success` |
| Pending | `warning` |
| Expired | `neutral` |
| Revoked / Inactive | `danger` |

---

## Button Variants

| Variant | Use case |
|---|---|
| `primary` | Primary CTA (Invite User, Save) |
| `secondary` | Secondary brand action |
| `outline` | Default/cancel actions |
| `ghost` | Icon buttons, subtle actions |
| `danger` | Destructive actions (Delete, Revoke) |
| `warning` | Cautionary actions |

