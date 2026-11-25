import { ClientOnly, createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

type Feature = { name: string; what: string; where: Array<string> }

const FEATURES: Array<{ group: string; items: Array<Feature> }> = [
	{
		group: 'Routing',
		items: [
			{ name: 'File-based routes', what: 'Every file in src/routes is a route', where: ['src/routes/'] },
			{ name: 'Root route + context', what: 'createRootRouteWithContext, router-level DI', where: ['src/routes/__root.tsx', 'src/router.tsx'] },
			{ name: 'Pathless layout route', what: '_authed groups private pages without a URL segment', where: ['src/routes/_authed.tsx'] },
			{ name: 'Dynamic params', what: '$questId typed from the filename', where: ['src/routes/_authed/quests/$questId.tsx'] },
			{ name: 'Splat routes', what: '/api/$ catches unknown API paths', where: ['src/routes/api/$.ts'] },
			{ name: 'Escaped filenames', what: 'quests[.]csv.ts → /api/quests.csv', where: ['src/routes/api/quests[.]csv.ts'] },
			{ name: 'Validated search params', what: 'validateSearch + loaderDeps + functional search updates', where: ['src/routes/_authed/quests/index.tsx'] },
			{ name: 'Auth guard', what: 'beforeLoad + redirect() with return path', where: ['src/routes/_authed.tsx', 'src/routes/login.tsx'] },
			{ name: 'Navigation blocking', what: 'useBlocker on unsaved quest forms', where: ['src/routes/_authed/quests/new.tsx'] },
			{ name: 'Preloading', what: "defaultPreload: 'intent' — hover a link and its data loads", where: ['src/router.tsx'] },
			{ name: 'Code splitting', what: 'Automatic per-route splitting by the Start bundler plugin', where: ['rsbuild.config.ts'] },
		],
	},
	{
		group: 'Data loading',
		items: [
			{ name: 'Loaders', what: 'Isomorphic loaders calling server functions', where: ['src/routes/index.tsx'] },
			{ name: 'Deferred streaming', what: 'Unawaited promise + <Await> streams into the SSR response', where: ['src/routes/index.tsx'] },
			{ name: 'Cache control', what: 'staleTime, router.invalidate() after mutations', where: ['src/routes/_authed/oracle.tsx', 'src/routes/_authed/quests/index.tsx'] },
			{ name: 'Pending UI', what: 'pendingComponent, global pending bar via useRouterState', where: ['src/routes/_authed/stats.tsx', 'src/routes/__root.tsx'] },
			{ name: 'Errors & not-found', what: 'notFound() from server fns, notFoundComponent, default error boundary', where: ['src/routes/_authed/quests/$questId.tsx', 'src/components/DefaultCatchBoundary.tsx'] },
			{ name: 'Head / SEO', what: 'Per-route <title> and meta, dynamic from loader data', where: ['src/routes/_authed/quests/$questId.tsx'] },
		],
	},
	{
		group: 'Server functions',
		items: [
			{ name: 'GET & POST RPCs', what: 'createServerFn with validators', where: ['src/functions/quests.functions.ts'] },
			{ name: 'FormData input', what: 'Forms post FormData straight to the server', where: ['src/functions/auth.functions.ts'] },
			{ name: 'useServerFn', what: 'Wires thrown redirect() into the router', where: ['src/routes/login.tsx', 'src/components/Header.tsx'] },
			{ name: 'Streaming responses', what: 'Async-generator server fn, consumed with for await', where: ['src/routes/_authed/oracle.tsx'] },
			{ name: 'Request/response utils', what: 'getCookie/setCookie, setResponseHeaders, getRequestHeader', where: ['src/server/session.server.ts', 'src/functions/meta.functions.ts'] },
			{ name: 'Custom serialization', what: 'Xp class instances survive the network via createSerializationAdapter', where: ['src/lib/xp.ts', 'src/start.ts'] },
		],
	},
	{
		group: 'Middleware',
		items: [
			{ name: 'Global request middleware', what: 'Logger + x-questboard-time header on every request', where: ['src/start.ts'] },
			{ name: 'CSRF protection', what: 'createCsrfMiddleware on non-GET requests', where: ['src/start.ts'] },
			{ name: 'Function middleware (client + server)', what: 'sendContext both ways; powers the footer RPC badge', where: ['src/middleware/timing.ts'] },
			{ name: 'Auth middleware', what: 'Composed middleware: session → requireUser', where: ['src/middleware/auth.ts'] },
		],
	},
	{
		group: 'Server routes (REST API)',
		items: [
			{ name: 'HTTP handlers', what: 'GET/POST/PATCH/DELETE/ANY returning Response', where: ['src/routes/api/'] },
			{ name: 'Per-handler middleware', what: 'createHandlers: public OPTIONS, private GET/POST', where: ['src/routes/api/quests.ts'] },
			{ name: 'File downloads', what: 'CSV export with Content-Disposition', where: ['src/routes/api/quests[.]csv.ts'] },
			{ name: 'Shared services', what: 'API and UI call the same *.server.ts logic', where: ['src/server/quests.server.ts'] },
		],
	},
	{
		group: 'Execution model',
		items: [
			{ name: 'createIsomorphicFn', what: 'Different code per environment', where: ['src/lib/env.ts'] },
			{ name: 'createServerOnlyFn / createClientOnlyFn', what: 'Throws if called on the wrong side', where: ['src/server/runtime.ts', 'src/lib/env.ts'] },
			{ name: 'Import protection', what: '*.server.ts files + the server-only marker import', where: ['src/server/'] },
			{ name: '<ClientOnly> & useHydrated', what: 'Browser-only UI without hydration mismatches', where: ['src/routes/about.tsx', 'src/components/Footer.tsx'] },
			{ name: 'Environment variables', what: 'SESSION_SECRET read per request, never bundled', where: ['src/server/session.server.ts'] },
		],
	},
	{
		group: 'Rendering & deployment',
		items: [
			{ name: 'SSR + streaming', what: 'Default for every page', where: ['src/routes/'] },
			{ name: "Selective SSR ('data-only')", what: 'Loader on the server, canvas chart rendered in the browser', where: ['src/routes/_authed/stats.tsx'] },
			{ name: 'Static prerendering', what: 'This page is rendered to HTML at build time', where: ['rsbuild.config.ts'] },
			{ name: 'Devtools', what: 'TanStack Devtools with the Router panel', where: ['src/routes/__root.tsx'] },
		],
	},
]

export const Route = createFileRoute('/about')({
	head: () => ({
		meta: [
			{ title: 'Feature Map · QuestBoard' },
			{ name: 'description', content: 'Where every TanStack Start feature lives in QuestBoard.' },
		],
	}),
	component: About,
})

function LocalClock() {
	const [now, setNow] = useState(() => new Date())
	useEffect(() => {
		const id = setInterval(() => setNow(new Date()), 1000)
		return () => clearInterval(id)
	}, [])
	return <>{now.toLocaleTimeString()}</>
}

function About() {
	const router = useRouter()

	// In production this page is prerendered at build time, so its HTML was
	// produced with no session. Refresh route context once in the browser
	// so the header shows the signed-in adventurer.
	useEffect(() => {
		router.invalidate()
	}, [router])

	const total = FEATURES.reduce((n, g) => n + g.items.length, 0)

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Feature Map</p>
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
					{total} TanStack Start features, one quest log.
				</h1>
				<p className="m-0 max-w-3xl text-base leading-8 text-[var(--sea-ink-soft)]">
					QuestBoard is useful on its own, but it's also a field guide. Each
					row tells you which file to open to see a feature in action.
				</p>
				<p className="demo-muted mt-4 text-sm">
					Your local time is{' '}
					<ClientOnly fallback={<em>known only to your browser</em>}>
						<LocalClock />
					</ClientOnly>{' '}
					— rendered with <code>&lt;ClientOnly&gt;</code> so the static HTML
					never disagrees with the browser.
				</p>
			</section>

			{FEATURES.map((group) => (
				<section key={group.group} className="mt-8">
					<h2 className="demo-section-title mb-3">{group.group}</h2>
					<div className="demo-table-shell">
						<table className="demo-table">
							<thead>
								<tr>
									<th>Feature</th>
									<th>What it does here</th>
									<th>Where</th>
								</tr>
							</thead>
							<tbody>
								{group.items.map((f) => (
									<tr key={f.name}>
										<td className="font-semibold">{f.name}</td>
										<td>{f.what}</td>
										<td>
											{f.where.map((w) => (
												<code key={w} className="mr-1 inline-block">
													{w}
												</code>
											))}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			))}
		</main>
	)
}
