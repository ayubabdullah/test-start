import {
	createFileRoute,
	Link,
	useNavigate,
	useRouter,
} from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { NotFound } from '#/components/NotFound'
import {
	deleteQuest,
	getQuest,
	toggleQuestDone,
} from '#/functions/quests.functions'
import { celebrate } from '#/lib/env'
import { DIFFICULTIES } from '#/lib/quests'

export const Route = createFileRoute('/_authed/quests/$questId')({
	// `params.questId` is typed from the filename.
	loader: ({ params }) => getQuest({ data: { id: params.questId } }),
	// Dynamic <title> from loader data.
	head: ({ loaderData }) => ({
		meta: [{ title: `${loaderData?.title ?? 'Quest'} · QuestBoard` }],
	}),
	// Shown when the server fn throws notFound().
	notFoundComponent: () => (
		<NotFound>
			This quest scroll has crumbled to dust — or it belongs to someone else.
		</NotFound>
	),
	component: QuestDetail,
})

function QuestDetail() {
	const quest = Route.useLoaderData()
	const router = useRouter()
	const navigate = useNavigate()
	const toggle = useServerFn(toggleQuestDone)
	const remove = useServerFn(deleteQuest)
	const [busy, setBusy] = useState(false)
	const meta = DIFFICULTIES[quest.difficulty]
	const done = quest.completedAt !== null

	return (
		<main className="page-wrap px-4 py-10">
			<Link to="/quests" className="text-sm font-semibold">
				← Back to quest log
			</Link>
			<article className="island-shell mt-4 rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">
					{meta.emoji} {meta.label} quest · {meta.xp} XP
				</p>
				<h1 className={`display-title mb-3 text-3xl font-bold sm:text-4xl ${done ? 'line-through opacity-70' : ''}`}>
					{quest.title}
				</h1>
				{quest.notes ? (
					<p className="whitespace-pre-wrap text-[var(--sea-ink-soft)]">{quest.notes}</p>
				) : (
					<p className="demo-muted italic">No notes. A mysterious quest indeed.</p>
				)}
				<dl className="demo-muted mt-6 grid gap-1 text-sm sm:grid-cols-2">
					<div>
						<dt className="inline font-semibold">Posted: </dt>
						<dd className="inline">{new Date(quest.createdAt).toLocaleString()}</dd>
					</div>
					<div>
						<dt className="inline font-semibold">Completed: </dt>
						<dd className="inline">
							{quest.completedAt ? new Date(quest.completedAt).toLocaleString() : 'not yet'}
						</dd>
					</div>
				</dl>
				<div className="mt-6 flex flex-wrap gap-3">
					<button
						type="button"
						className="demo-button"
						disabled={busy}
						onClick={async () => {
							setBusy(true)
							try {
								const result = await toggle({ data: { id: quest.id } })
								if (result.quest.completedAt) {
									celebrate(result.leveledUp ? '🎉🏆⭐👑' : '✨⭐')
								}
								await router.invalidate({ sync: true })
							} finally {
								setBusy(false)
							}
						}}
					>
						{done ? 'Reopen quest' : `Complete (+${meta.xp} XP)`}
					</button>
					<button
						type="button"
						className="demo-button demo-button-danger"
						disabled={busy}
						onClick={async () => {
							if (!window.confirm('Abandon this quest forever?')) return
							setBusy(true)
							await remove({ data: { id: quest.id } })
							await navigate({ to: '/quests' })
						}}
					>
						Abandon
					</button>
				</div>
			</article>
		</main>
	)
}
