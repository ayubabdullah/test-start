import { Link, useRouteContext } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { signOut } from '#/functions/auth.functions'
import ThemeToggle from './ThemeToggle'

const NAV = [
	{ to: '/', label: 'Tavern' },
	{ to: '/quests', label: 'Quest Log' },
	{ to: '/oracle', label: 'Oracle' },
	{ to: '/stats', label: 'Stats' },
	{ to: '/about', label: 'Feature Map' },
] as const

export default function Header() {
	// strict: false lets a shared component read context from any route.
	const user = useRouteContext({ strict: false, select: (c) => c.user })
	// useServerFn is required here: signOut throws a redirect.
	const signOutFn = useServerFn(signOut)

	return (
		<header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
			<nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-4">
				<h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
					<Link
						to="/"
						className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
					>
						<span aria-hidden>⚔️</span>
						QuestBoard
					</Link>
				</h2>

				<div className="order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-1 pb-1 text-sm font-semibold sm:order-none sm:w-auto sm:flex-nowrap sm:pb-0">
					{NAV.map((item) => (
						<Link
							key={item.to}
							to={item.to}
							className="nav-link"
							activeOptions={{ exact: item.to === '/' }}
							activeProps={{ className: 'nav-link is-active' }}
						>
							{item.label}
						</Link>
					))}
				</div>

				<div className="ml-auto flex items-center gap-1.5 sm:gap-2">
					{user ? (
						<>
							<span className="demo-pill hidden sm:inline-flex">
								🛡️ {user.name}
							</span>
							<button
								type="button"
								className="demo-button demo-button-secondary !px-3 !py-2"
								onClick={() => signOutFn()}
							>
								Leave
							</button>
						</>
					) : (
						<Link to="/login" className="demo-button !px-3 !py-2">
							Sign in
						</Link>
					)}
					<ThemeToggle />
				</div>
			</nav>
		</header>
	)
}
