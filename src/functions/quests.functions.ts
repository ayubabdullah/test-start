import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import {
	DIFFICULTIES,
	parseNewQuest,
	parseQuestId,
	parseQuestSearch,
	type QuestSearch,
} from '#/lib/quests'
import { requireUser } from '#/middleware/auth'
import {
	addQuest,
	dailyXp,
	findQuest,
	globalStats,
	leaderboard,
	listQuestsFor,
	removeQuest,
	toggleQuest,
	xpFor,
} from '#/server/quests.server'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ─── Public reads ────────────────────────────────────────────────────────

/** Same for every visitor, so a short shared cache is safe. */
export const getLeaderboard = createServerFn({ method: 'GET' }).handler(
	async () => {
		setResponseHeader('Cache-Control', 'public, max-age=10')
		// Returns `Xp` class instances — revived on the client by the
		// serialization adapter registered in src/start.ts.
		return leaderboard()
	},
)

/** Deliberately slow so the home page can stream it in with <Await>. */
export const getGlobalStats = createServerFn({ method: 'GET' }).handler(
	async () => {
		await sleep(1200)
		return globalStats()
	},
)

// ─── Private reads (auth enforced by requireUser middleware) ─────────────

export const listQuests = createServerFn({ method: 'GET' })
	.middleware([requireUser])
	.validator((search: QuestSearch) => parseQuestSearch(search))
	.handler(async ({ data, context }) => {
		setResponseHeader('Cache-Control', 'private, no-store')
		const [quests, xp] = await Promise.all([
			listQuestsFor(context.user, data),
			xpFor(context.user),
		])
		return { quests, xp }
	})

export const getQuest = createServerFn({ method: 'GET' })
	.middleware([requireUser])
	.validator((input: { id: string }) => parseQuestId(input))
	.handler(async ({ data, context }) => {
		const quest = await findQuest(context.user, data.id)
		// Rendered by the route's notFoundComponent.
		if (!quest) throw notFound()
		return quest
	})

export const getMyStats = createServerFn({ method: 'GET' })
	.middleware([requireUser])
	.handler(async ({ context }) => {
		const [daily, xp, quests] = await Promise.all([
			dailyXp(context.user),
			xpFor(context.user),
			listQuestsFor(context.user),
		])
		const byDifficulty = Object.keys(DIFFICULTIES).map((difficulty) => ({
			difficulty,
			done: quests.filter(
				(q) => q.difficulty === difficulty && q.completedAt,
			).length,
			total: quests.filter((q) => q.difficulty === difficulty).length,
		}))
		return { daily, xp, byDifficulty }
	})

// ─── Mutations ───────────────────────────────────────────────────────────

/** Takes FormData straight from the <form>. */
export const createQuest = createServerFn({ method: 'POST' })
	.middleware([requireUser])
	.validator((data: FormData) => parseNewQuest(data))
	.handler(({ data, context }) => addQuest(context.user, data))

export const toggleQuestDone = createServerFn({ method: 'POST' })
	.middleware([requireUser])
	.validator((input: { id: string }) => parseQuestId(input))
	.handler(async ({ data, context }) => {
		const before = await xpFor(context.user)
		const quest = await toggleQuest(context.user, data.id)
		if (!quest) throw notFound()
		const after = await xpFor(context.user)
		return { quest, xp: after, leveledUp: after.level > before.level }
	})

export const deleteQuest = createServerFn({ method: 'POST' })
	.middleware([requireUser])
	.validator((input: { id: string }) => parseQuestId(input))
	.handler(async ({ data, context }) => {
		const removed = await removeQuest(context.user, data.id)
		if (!removed) throw notFound()
		return { removed }
	})

// ─── Streaming ───────────────────────────────────────────────────────────

const OPENINGS = [
	'The mists part, {name}…',
	'The Oracle stirs from its slumber, {name}.',
	'Ah, {name}. The runes have been expecting you.',
]
const VERDICTS = [
	'Begin with "{quest}". Small steps topple dragons.',
	'"{quest}" hides more treasure than you think. Strike today.',
	'Leave "{quest}" for the morrow; rest is also a quest.',
	'Two easy quests before "{quest}" will sharpen your blade.',
]
const CLOSINGS = [
	'Level {next} awaits — only {left} XP stand in your way.',
	'Your legend grows. {left} XP until level {next}.',
	'The bards are tuning their lutes. {left} XP to level {next}.',
]

function hash(text: string) {
	let h = 0
	for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0
	return h
}

/**
 * An async-generator server function: each `yield` is streamed to the
 * browser as it happens, and the client consumes it with `for await`.
 */
export const consultOracle = createServerFn({ method: 'POST' })
	.middleware([requireUser])
	.validator((input: { question: string }) => {
		const question = String(input.question ?? '').trim().slice(0, 200)
		if (!question) throw new Error('Ask the Oracle a question first.')
		return { question }
	})
	.handler(async function* ({ data, context }) {
		const [active, xp] = await Promise.all([
			listQuestsFor(context.user, { status: 'active', sort: 'xp' }),
			xpFor(context.user),
		])
		const seed = hash(data.question + new Date().toDateString())
		const quest = active[seed % Math.max(active.length, 1)]?.title
		const fill = (s: string) =>
			s
				.replace('{name}', context.user)
				.replace('{quest}', quest ?? 'your first quest')
				.replace('{next}', String(xp.level + 1))
				.replace('{left}', String(xp.toNextLevel))

		const prophecy = [
			fill(OPENINGS[seed % OPENINGS.length]),
			`You ask: "${data.question}"`,
			active.length
				? fill(VERDICTS[seed % VERDICTS.length])
				: 'Your quest log is empty. The Oracle cannot read a blank page — write a quest!',
			fill(CLOSINGS[seed % CLOSINGS.length]),
		].join('\n\n')

		for (const word of prophecy.split(/(\s+)/)) {
			await sleep(word.trim() ? 45 : 0)
			yield word
		}
	})
