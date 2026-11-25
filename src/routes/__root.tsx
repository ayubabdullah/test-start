import { TanStackDevtools } from '@tanstack/react-devtools'
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
	useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { NotFound } from '#/components/NotFound'
import { getSessionUser } from '#/functions/auth.functions'
import { renderedOn } from '#/lib/env'
import Footer from '../components/Footer'
import Header from '../components/Header'

import appCss from '../styles.css?url'

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

export type RouterContext = {
	appName: string
	user: { name: string } | null
}

export const Route = createRootRouteWithContext<RouterContext>()({
	// Runs on every navigation (server during SSR, browser afterwards).
	// Whatever it returns is merged into the context of every child route.
	beforeLoad: async () => ({ user: await getSessionUser() }),
	// Isomorphic loader: tells the footer where it last executed.
	loader: () => ({ loaderRanOn: renderedOn() }),
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ title: 'QuestBoard · turn your to-dos into quests' },
			{
				name: 'description',
				content:
					'A gamified quest log built to tour every TanStack Start feature.',
			},
		],
		links: [
			{ rel: 'stylesheet', href: appCss },
			{
				rel: 'icon',
				href: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⚔️</text></svg>',
			},
		],
	}),
	notFoundComponent: () => <NotFound />,
	shellComponent: RootDocument,
})

function PendingBar() {
	const pending = useRouterState({ select: (s) => s.status === 'pending' })
	return (
		<div
			aria-hidden
			className={`fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-[var(--lagoon)] transition-transform duration-500 ${pending ? 'scale-x-75' : 'scale-x-0'}`}
		/>
	)
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
				<HeadContent />
			</head>
			<body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
				<PendingBar />
				<Header />
				{children}
				<Footer />
				<TanStackDevtools
					config={{ position: 'bottom-right' }}
					plugins={[
						{
							name: 'Tanstack Router',
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	)
}
