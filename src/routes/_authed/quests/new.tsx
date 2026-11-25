import { createFileRoute, useBlocker, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { createQuest } from '#/functions/quests.functions'
import { DIFFICULTIES, DIFFICULTY_KEYS, type Difficulty } from '#/lib/quests'

export const Route = createFileRoute('/_authed/quests/new')({
	head: () => ({ meta: [{ title: 'New quest · QuestBoard' }] }),
	component: NewQuest,
})

function NewQuest() {
	const navigate = useNavigate()
	const create = useServerFn(createQuest)
	const [dirty, setDirty] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)
	const [difficulty, setDifficulty] = useState<Difficulty>('medium')

	// Navigation blocking: warn before throwing away a half-written quest
	// (covers in-app links AND tab close / reload).
	useBlocker({
		shouldBlockFn: () =>
			dirty && !window.confirm('Discard this unfinished quest scroll?'),
		enableBeforeUnload: dirty,
	})

	return (
		<main className="page-wrap px-4 py-10">
			<section className="island-shell mx-auto max-w-2xl rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">The Quest Board</p>
				<h1 className="display-title mb-6 text-3xl font-bold">Post a new quest</h1>
				<form
					className="grid gap-5"
					onChange={() => setDirty(true)}
					onSubmit={async (event) => {
						event.preventDefault()
						setBusy(true)
						setError(null)
						try {
							const quest = await create({ data: new FormData(event.currentTarget) })
							setDirty(false)
							await navigate({
								to: '/quests/$questId',
								params: { questId: quest.id },
								ignoreBlocker: true,
							})
						} catch (err) {
							setError(err instanceof Error ? err.message : 'Could not post quest')
						} finally {
							setBusy(false)
						}
					}}
				>
					<label className="grid gap-1 text-sm font-semibold">
						Quest title
						<input
							name="title"
							required
							minLength={3}
							maxLength={80}
							className="demo-input"
							placeholder="Slay the inbox hydra"
						/>
					</label>
					<label className="grid gap-1 text-sm font-semibold">
						Notes <span className="demo-muted font-normal">(optional)</span>
						<textarea
							name="notes"
							maxLength={500}
							rows={4}
							className="demo-textarea"
							placeholder="Each email you answer, two more appear…"
						/>
					</label>
					<fieldset className="m-0 grid gap-2 border-0 p-0">
						<legend className="mb-2 text-sm font-semibold">Difficulty</legend>
						<div className="grid gap-3 sm:grid-cols-3">
							{DIFFICULTY_KEYS.map((key) => (
								<label
									key={key}
									className="demo-list-item flex cursor-pointer items-center gap-3"
									style={{
										outline: difficulty === key ? '2px solid var(--lagoon)' : undefined,
									}}
								>
									<input
										type="radio"
										name="difficulty"
										value={key}
										checked={difficulty === key}
										onChange={() => setDifficulty(key)}
										className="sr-only"
									/>
									<span className="text-2xl">{DIFFICULTIES[key].emoji}</span>
									<span>
										<strong className="block">{DIFFICULTIES[key].label}</strong>
										<span className="demo-muted text-sm">{DIFFICULTIES[key].xp} XP</span>
									</span>
								</label>
							))}
						</div>
					</fieldset>
					{error && <p className="demo-alert demo-alert-danger m-0">{error}</p>}
					<div className="flex gap-3">
						<button type="submit" className="demo-button" disabled={busy}>
							{busy ? 'Pinning to the board…' : 'Post quest'}
						</button>
					</div>
				</form>
			</section>
		</main>
	)
}
