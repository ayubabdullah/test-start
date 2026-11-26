# ⚔️ QuestBoard

A gamified quest log built with TanStack Start. Post your to-dos as quests,
earn XP when you finish them, level up, climb the leaderboard and ask the
streaming Oracle what to do next. It is also a field guide: the **Feature Map**
page (`/about`) lists each TanStack Start feature and the file that uses it.

| Page | What it shows |
| --- | --- |
| `/` Tavern | Leaderboard + global stats streamed in with `<Await>` |
| `/login` | Supabase Auth sign in / sign up (email + password, adventurer name) |
| `/quests` | Your quest log with validated search params (`?status=&sort=&q=`) |
| `/quests/new`, `/quests/$questId` | FormData server fns, `useBlocker`, `notFound()`, dynamic `<title>` |
| `/oracle` | Async-generator server function streamed word by word |
| `/stats` | `ssr: 'data-only'` page drawing a canvas chart |
| `/about` | Feature Map, prerendered to static HTML at build time |

### REST API (server routes)

```text
GET    /api/leaderboard
GET    /api/quests?status=all|active|done&sort=newest|oldest|xp&q=
POST   /api/quests            { "title", "notes", "difficulty": "easy|medium|epic" }
GET    /api/quests/:questId
PATCH  /api/quests/:questId   (toggle done)
DELETE /api/quests/:questId
GET    /api/quests.csv        (download)
```

Private endpoints use the Supabase session cookie. Mutations are CSRF-protected,
so non-browser clients must send a matching `Origin` header.

### Database & auth: Supabase

Data lives in Postgres via [Supabase](https://supabase.com), wired the way
Supabase's TanStack Start guide recommends:

- `@supabase/ssr`'s `createServerClient` stores the Auth session in cookies
  through Start's `getCookies` / `setCookie` (`src/server/supabase.server.ts`).
  All Supabase calls happen inside server functions or server routes, so no
  key is ever shipped to the browser.
- Every protected server function verifies the JWT with
  `supabase.auth.getClaims()` (`src/middleware/auth.ts`). Route `beforeLoad`
  guards are for UX only.
- Row Level Security in `supabase/migrations/` makes each adventurer's quests
  private at the database level. The leaderboard and global stats come from
  `security definer` SQL functions that return aggregates only.

**Local development** (needs Docker and the
[Supabase CLI](https://supabase.com/docs/guides/local-development)):

```bash
bun run db:start
```

```bash
cp .env.example .env.local
```

Then paste `API_URL` and `PUBLISHABLE_KEY` from `supabase status -o env`
into `.env.local`. Local auth skips email confirmation; sent emails show up in
Mailpit at http://127.0.0.1:54324 and the database in Studio at
http://127.0.0.1:54323.

- `bun run db:reset` re-applies migrations to a fresh local database.
- `bun run db:types` regenerates `src/lib/database.types.ts` after a schema change.

**Hosted Supabase:** create a project, run `supabase link` and
`supabase db push`, set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in your
host's environment, and add `https://<your-domain>/auth/confirm` to
Auth → URL Configuration → Redirect URLs (email confirmation is on by default
for hosted projects).

---

Welcome to your new TanStack Start app!

# Getting Started

To run this application:

```bash
bun install
bun --bun run dev
```

# Building For Production

To build this application for production:

```bash
bun --bun run build
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/routes/demo/`
2. Replace the Tailwind import in `src/styles.css` with your own styles
3. Remove `pluginTailwindcss()` from the plugins array in `rsbuild.config.ts`
4. Remove `@rsbuild/plugin-tailwindcss` and `tailwindcss` from `package.json`

## Linting & Formatting

This project uses [Biome](https://biomejs.dev/) for linting and formatting. The following scripts are available:


```bash
bun --bun run lint
bun --bun run format
bun --bun run check
```



## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from "@tanstack/react-router";
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('')
  
  useEffect(() => {
    getServerTime().then(setTime)
  }, [])
  
  return <div>Server time: {time}</div>
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
})
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).


# Demo files

Files prefixed with `demo` can be safely deleted. They are there to provide a starting point for you to play around with the features you've installed.


# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).
