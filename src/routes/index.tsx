import { Await, createFileRoute, Link } from '@tanstack/react-router'
import { Suspense } from 'react'
import { XpBar } from '#/components/XpBar'
import { getGlobalStats, getLeaderboard } from '#/functions/quests.functions'

export const Route = createFileRoute('/')({
	loader: async () => ({
		// Awaited: part of the first HTML response.
		leaderboard: await getLeaderboard(),
		// NOT awaited: the page renders immediately and this promise is
		// streamed into the same response when it resolves (~1.2s).
		stats: getGlobalStats(),
	}),
	component: Tavern,
})

function Tavern() {
	const { leaderboard, stats } = Route.useLoaderData()
	const { user } = Route.useRouteContext()

	return (
		<main className="page-wrap px-4 pb-8 pt-14">
			<section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
				<div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
				<div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
				<p className="island-kicker mb-3">Welcome to the Tavern</p>
				<h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
					Turn your to-dos into quests.
				</h1>
				<p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
					Log tasks as quests, earn XP when you finish them, level up, climb
					the leaderboard and ask the Oracle what to tackle next.
				</p>
				<div className="flex flex-wrap gap-3">
					{user ? (
						<Link to="/quests" className="demo-button">
							Open your quest log, {user.name} →
						</Link>
					) : (
						<Link to="/login" className="demo-button">
							Start your adventure →
						</Link>
					)}
					<Link to="/about" className="demo-button demo-button-secondary">
						How it's built
					</Link>
				</div>
			</section>

			<section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
				<Suspense fallback={<StatSkeletons />}>
					<Await promise={stats}>
						{(s) => (
							<>
								<Stat label="Adventurers" value={s.adventurers} emoji="🧙" />
								<Stat label="Quests posted" value={s.questsCreated} emoji="📜" />
								<Stat label="Quests done" value={s.questsCompleted} emoji="✅" />
								<Stat label="XP earned" value={s.xpEarned} emoji="✨" />
								<Stat label="Dragons slain" value={s.epicSlain} emoji="🐉" />
							</>
						)}
					</Await>
				</Suspense>
			</section>

			<section className="island-shell mt-8 rounded-2xl p-6">
				<p className="island-kicker mb-1">Hall of Heroes</p>
				<h2 className="demo-section-title mb-4">Leaderboard</h2>
				{leaderboard.length === 0 ? (
					<p className="demo-muted">
						No heroes yet. Be the first to complete a quest!
					</p>
				) : (
					<ol className="m-0 grid list-none gap-3 p-0">
						{leaderboard.map(({ name, xp }, i) => (
							<li key={name} className="demo-list-item flex items-center gap-4">
								<span className="w-8 text-center text-xl">
									{['🥇', '🥈', '🥉'][i] ?? `#${i + 1}`}
								</span>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-baseline justify-between gap-2">
										<strong>{name}</strong>
										{/* xp is a real Xp instance thanks to the serialization adapter */}
										<span className="demo-muted text-sm">
											Lv {xp.level} {xp.title} · {xp.points} XP
										</span>
									</div>
									<XpBar xp={xp} />
								</div>
							</li>
						))}
					</ol>
				)}
			</section>
		</main>
	)
}

function Stat({ label, value, emoji }: { label: string; value: number; emoji: string }) {
	return (
		<article className="island-shell feature-card rise-in rounded-2xl p-5">
			<p className="m-0 text-2xl">{emoji}</p>
			<p className="m-0 mt-2 text-3xl font-bold text-[var(--sea-ink)]">{value}</p>
			<p className="m-0 text-sm text-[var(--sea-ink-soft)]">{label}</p>
		</article>
	)
}

function StatSkeletons() {
	return (
		<>
			{[0, 1, 2, 3, 4].map((i) => (
				<article
					key={i}
					className="island-shell h-[124px] animate-pulse rounded-2xl p-5 opacity-60"
				>
					<span className="sr-only">Loading stats…</span>
				</article>
			))}
		</>
	)
}
