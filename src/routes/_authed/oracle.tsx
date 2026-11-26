import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useRef, useState } from 'react'
import { getRuntimeInfo } from '#/functions/meta.functions'
import { consultOracle } from '#/functions/quests.functions'

export const Route = createFileRoute('/_authed/oracle')({
	loader: () => getRuntimeInfo(),
	// Runtime info never changes while you're on the page; keep it 1 minute.
	staleTime: 60_000,
	head: () => ({ meta: [{ title: 'The Oracle · QuestBoard' }] }),
	component: Oracle,
})

const SUGGESTIONS = [
	'What should I do first today?',
	'Am I ready to face the dragon?',
	'Will I ever reach inbox zero?',
]

function Oracle() {
	const runtime = Route.useLoaderData()
	const consult = useServerFn(consultOracle)
	const [question, setQuestion] = useState('')
	const [answer, setAnswer] = useState('')
	const [state, setState] = useState<'idle' | 'streaming' | 'error'>('idle')
	const runId = useRef(0)

	async function ask(q: string) {
		const id = ++runId.current
		setQuestion(q)
		setAnswer('')
		setState('streaming')
		try {
			// The server fn is an async generator: chunks arrive as they're yielded.
			for await (const chunk of await consult({ data: { question: q } })) {
				if (id !== runId.current) return // a newer question took over
				setAnswer((prev) => prev + chunk)
			}
			setState('idle')
		} catch (err) {
			setAnswer(err instanceof Error ? err.message : 'The Oracle is silent.')
			setState('error')
		}
	}

	return (
		<main className="page-wrap px-4 py-10">
			<section className="island-shell mx-auto max-w-2xl rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">🔮 The Oracle</p>
				<h1 className="display-title mb-2 text-3xl font-bold">Ask, and it shall stream</h1>
				<p className="demo-muted mb-6 text-sm">
					Its prophecy reads your open quests and arrives word by word from a
					streaming server function.
				</p>
				<form
					className="flex flex-col gap-3 sm:flex-row"
					onSubmit={(e) => {
						e.preventDefault()
						if (question.trim()) ask(question.trim())
					}}
				>
					<input
						className="demo-input flex-1"
						value={question}
						maxLength={200}
						onChange={(e) => setQuestion(e.target.value)}
						placeholder="What troubles you, adventurer?"
					/>
					<button type="submit" className="demo-button" disabled={state === 'streaming'}>
						{state === 'streaming' ? 'Divining…' : 'Consult'}
					</button>
				</form>
				<div className="mt-3 flex flex-wrap gap-2">
					{SUGGESTIONS.map((s) => (
						<button
							key={s}
							type="button"
							className="demo-pill cursor-pointer"
							onClick={() => ask(s)}
						>
							{s}
						</button>
					))}
				</div>

				{(answer || state === 'streaming') && (
					<div
						className={`mt-6 whitespace-pre-wrap rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-5 font-serif text-lg leading-8 ${state === 'error' ? 'text-red-600' : ''}`}
						aria-live="polite"
					>
						{answer}
						{state === 'streaming' && <span className="qb-caret">▍</span>}
					</div>
				)}
			</section>

			<section className="island-shell mx-auto mt-6 max-w-2xl rounded-2xl p-5 text-sm">
				<p className="island-kicker mb-2">The Oracle's lair (server-only data via RPC)</p>
				<ul className="demo-muted m-0 grid gap-1 pl-5">
					<li>Runtime: {runtime.runtime} on {runtime.platform}</li>
					<li>Server uptime: {runtime.uptimeSeconds}s</li>
					<li>Your timezone (sent via middleware sendContext): {runtime.clientTz}</li>
					<li>Quests are stored in: {runtime.database}</li>
				</ul>
			</section>
		</main>
	)
}
