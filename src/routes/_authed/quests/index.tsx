import {
	createFileRoute,
	Link,
	useNavigate,
	useRouter,
} from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { XpBar } from '#/components/XpBar'
import { listQuests, toggleQuestDone } from '#/functions/quests.functions'
import { celebrate } from '#/lib/env'
import {
	DIFFICULTIES,
	parseQuestSearch,
	type Quest,
	SORTS,
	STATUS_FILTERS,
} from '#/lib/quests'

export const Route = createFileRoute('/_authed/quests/')({
	// /quests?status=active&sort=xp&q=dragon — parsed & typed.
	validateSearch: parseQuestSearch,
	// Search params become part of the loader's cache key.
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => listQuests({ data: deps }),
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData
					? `Quest Log (${loaderData.quests.filter((q) => !q.completedAt).length} open) · QuestBoard`
					: 'Quest Log · QuestBoard',
			},
		],
	}),
	component: QuestLog,
})

function QuestLog() {
	const { quests, xp } = Route.useLoaderData()
	const search = Route.useSearch()
	const { user } = Route.useRouteContext()

	return (
		<main className="page-wrap px-4 py-10">
			<section className="island-shell rounded-2xl p-6">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p className="island-kicker mb-1">{user.name}'s quest log</p>
						<h1 className="display-title m-0 text-3xl font-bold sm:text-4xl">
							Level {xp.level} · {xp.title}
						</h1>
						<p className="demo-muted m-0 mt-1 text-sm">
							{xp.points} XP · {xp.toNextLevel} XP to level {xp.level + 1}
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<a href="/api/quests.csv" className="demo-button demo-button-secondary" download>
							Export CSV
						</a>
						<Link to="/quests/new" className="demo-button">
							+ New quest
						</Link>
					</div>
				</div>
				<XpBar xp={xp} />
			</section>

			<section className="mt-6 flex flex-wrap items-center gap-3">
				<fieldset className="m-0 flex gap-1 border-0 p-0">
					<legend className="sr-only">Filter by status</legend>
					{STATUS_FILTERS.map((status) => (
						<Link
							key={status}
							from={Route.fullPath}
							// Functional search update keeps the other params.
							search={(prev) => ({
								...prev,
								status: status === 'all' ? undefined : status,
							})}
							className="demo-pill capitalize no-underline"
							activeOptions={{ includeSearch: false }}
							style={{
								outline:
									(search.status ?? 'all') === status
										? '2px solid var(--lagoon)'
										: undefined,
							}}
						>
							{status}
						</Link>
					))}
				</fieldset>
				<SortSelect />
				<SearchBox />
			</section>

			<section className="mt-4 grid gap-3">
				{quests.length === 0 ? (
					<div className="island-shell rounded-2xl p-8 text-center">
						<p className="text-4xl">🏕️</p>
						<p className="demo-muted">
							{search.q || search.status
								? 'No quests match these filters.'
								: 'Your quest log is empty. Every legend starts somewhere!'}
						</p>
					</div>
				) : (
					quests.map((quest) => <QuestRow key={quest.id} quest={quest} />)
				)}
			</section>
		</main>
	)
}

function SortSelect() {
	const search = Route.useSearch()
	const navigate = useNavigate({ from: Route.fullPath })
	return (
		<label className="flex items-center gap-2 text-sm font-semibold">
			Sort
			<select
				className="demo-select demo-input-fit"
				value={search.sort ?? 'newest'}
				onChange={(e) =>
					navigate({
						search: (prev) => ({
							...prev,
							sort: SORTS.find((s) => s === e.target.value),
						}),
					})
				}
			>
				{SORTS.map((sort) => (
					<option key={sort} value={sort}>
						{sort}
					</option>
				))}
			</select>
		</label>
	)
}

function SearchBox() {
	const search = Route.useSearch()
	const navigate = useNavigate({ from: Route.fullPath })
	const [value, setValue] = useState(search.q ?? '')

	// Debounce typing into the URL; `replace` avoids a history entry per key.
	useEffect(() => {
		const id = setTimeout(() => {
			if ((search.q ?? '') !== value) {
				navigate({
					search: (prev) => ({ ...prev, q: value || undefined }),
					replace: true,
				})
			}
		}, 250)
		return () => clearTimeout(id)
	}, [value, search.q, navigate])

	return (
		<input
			type="search"
			className="demo-input min-w-0 flex-1"
			placeholder="Search quests…"
			value={value}
			onChange={(e) => setValue(e.target.value)}
		/>
	)
}

function QuestRow({ quest }: { quest: Quest }) {
	const router = useRouter()
	const toggle = useServerFn(toggleQuestDone)
	const [busy, setBusy] = useState(false)
	const meta = DIFFICULTIES[quest.difficulty]
	const done = quest.completedAt !== null

	return (
		<article className="demo-list-item flex items-center gap-4">
			<button
				type="button"
				aria-label={done ? 'Mark as not done' : 'Complete quest'}
				disabled={busy}
				className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface-strong)] text-lg transition hover:scale-110"
				onClick={async () => {
					setBusy(true)
					try {
						const result = await toggle({ data: { id: quest.id } })
						if (result.quest.completedAt) {
							celebrate(result.leveledUp ? '🎉🏆⭐👑' : '✨⭐')
						}
						// Re-run the loader so the list and XP come from the server.
						await router.invalidate({ sync: true })
					} finally {
						setBusy(false)
					}
				}}
			>
				{done ? '✅' : '⬜'}
			</button>
			<div className="min-w-0 flex-1">
				<Link
					to="/quests/$questId"
					params={{ questId: quest.id }}
					className={`font-semibold no-underline ${done ? 'line-through opacity-60' : ''}`}
				>
					{quest.title}
				</Link>
				{quest.notes && (
					<p className="demo-muted m-0 truncate text-sm">{quest.notes}</p>
				)}
			</div>
			<span className="demo-pill shrink-0" title={`${meta.label} quest`}>
				{meta.emoji} {meta.xp} XP
			</span>
		</article>
	)
}
