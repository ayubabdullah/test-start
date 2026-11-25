/**
 * Quest business logic — the single source of truth.
 *
 * Both server functions (used by the UI) and server routes (the public
 * HTTP API) call into this module, so the SSR loader never has to
 * fetch its own /api endpoint.
 */
import { randomUUID } from 'node:crypto'
import {
	DIFFICULTIES,
	type NewQuestInput,
	type Quest,
	type QuestSearch,
} from '#/lib/quests'
import { Xp } from '#/lib/xp'
import { readDb, writeDb } from './db.server'

export function questXp(quest: Quest) {
	return DIFFICULTIES[quest.difficulty].xp
}

export async function listQuestsFor(owner: string, search: QuestSearch = {}) {
	const { quests } = await readDb()
	const status = search.status ?? 'all'
	const sort = search.sort ?? 'newest'
	const q = search.q?.toLowerCase()

	return quests
		.filter((quest) => quest.owner === owner)
		.filter((quest) =>
			status === 'all'
				? true
				: status === 'done'
					? quest.completedAt !== null
					: quest.completedAt === null,
		)
		.filter((quest) =>
			q
				? quest.title.toLowerCase().includes(q) ||
					quest.notes.toLowerCase().includes(q)
				: true,
		)
		.sort((a, b) => {
			if (sort === 'xp') return questXp(b) - questXp(a)
			const diff = a.createdAt.localeCompare(b.createdAt)
			return sort === 'oldest' ? diff : -diff
		})
}

export async function findQuest(owner: string, id: string) {
	const { quests } = await readDb()
	return quests.find((quest) => quest.id === id && quest.owner === owner)
}

export async function addQuest(owner: string, input: NewQuestInput) {
	const quest: Quest = {
		id: randomUUID().slice(0, 8),
		owner,
		...input,
		createdAt: new Date().toISOString(),
		completedAt: null,
	}
	await writeDb((data) => {
		data.quests.push(quest)
	})
	return quest
}

export async function toggleQuest(owner: string, id: string) {
	return writeDb((data) => {
		const quest = data.quests.find((q) => q.id === id && q.owner === owner)
		if (!quest) return null
		quest.completedAt = quest.completedAt ? null : new Date().toISOString()
		return { ...quest }
	})
}

export async function removeQuest(owner: string, id: string) {
	return writeDb((data) => {
		const before = data.quests.length
		data.quests = data.quests.filter(
			(q) => !(q.id === id && q.owner === owner),
		)
		return data.quests.length < before
	})
}

export async function xpFor(owner: string) {
	const { quests } = await readDb()
	const points = quests
		.filter((q) => q.owner === owner && q.completedAt)
		.reduce((sum, q) => sum + questXp(q), 0)
	return new Xp(points)
}

export async function leaderboard(limit = 10) {
	const { adventurers, quests } = await readDb()
	const totals = new Map<string, number>()
	for (const { name } of Object.values(adventurers)) totals.set(name, 0)
	for (const quest of quests) {
		if (!quest.completedAt) continue
		totals.set(quest.owner, (totals.get(quest.owner) ?? 0) + questXp(quest))
	}
	return [...totals.entries()]
		.map(([name, points]) => ({ name, xp: new Xp(points) }))
		.sort((a, b) => b.xp.points - a.xp.points)
		.slice(0, limit)
}

export async function globalStats() {
	const { adventurers, quests } = await readDb()
	const completed = quests.filter((q) => q.completedAt)
	return {
		adventurers: Object.keys(adventurers).length,
		questsCreated: quests.length,
		questsCompleted: completed.length,
		xpEarned: completed.reduce((sum, q) => sum + questXp(q), 0),
		epicSlain: completed.filter((q) => q.difficulty === 'epic').length,
	}
}

/** XP earned per day for the last `days` days (oldest first). */
export async function dailyXp(owner: string, days = 14) {
	const { quests } = await readDb()
	const buckets = new Map<string, number>()
	const today = new Date()
	for (let i = days - 1; i >= 0; i--) {
		const d = new Date(today)
		d.setDate(today.getDate() - i)
		buckets.set(d.toISOString().slice(0, 10), 0)
	}
	for (const quest of quests) {
		if (quest.owner !== owner || !quest.completedAt) continue
		const day = quest.completedAt.slice(0, 10)
		if (buckets.has(day)) {
			buckets.set(day, (buckets.get(day) ?? 0) + questXp(quest))
		}
	}
	return [...buckets.entries()].map(([day, xp]) => ({ day, xp }))
}

export function toCsv(quests: Array<Quest>) {
	const quote = (value: string) => `"${value.replaceAll('"', '""')}"`
	const rows = quests.map((q) =>
		[
			q.id,
			quote(q.title),
			q.difficulty,
			String(questXp(q)),
			q.createdAt,
			q.completedAt ?? '',
			quote(q.notes),
		].join(','),
	)
	return ['id,title,difficulty,xp,created_at,completed_at,notes', ...rows].join(
		'\n',
	)
}
