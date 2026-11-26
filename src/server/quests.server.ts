/**
 * Quest business logic — the single source of truth.
 *
 * Every function takes the request-scoped Supabase client. Queries run as
 * the signed-in user, so Postgres Row Level Security (see
 * supabase/migrations) guarantees users only ever touch their own rows.
 *
 * Both server functions (UI) and server routes (REST API) call into this
 * module, so the SSR loader never has to fetch its own /api endpoint.
 */
import {
	DIFFICULTIES,
	type NewQuestInput,
	type Quest,
	type QuestSearch,
} from '#/lib/quests'
import { Xp } from '#/lib/xp'
import type { Supabase } from './supabase.server'

const QUEST_COLUMNS = 'id, title, notes, difficulty, created_at, completed_at'

type QuestRow = {
	id: string
	title: string
	notes: string
	difficulty: Quest['difficulty']
	created_at: string
	completed_at: string | null
}

function toQuest(row: QuestRow): Quest {
	return {
		id: row.id,
		title: row.title,
		notes: row.notes,
		difficulty: row.difficulty,
		createdAt: row.created_at,
		completedAt: row.completed_at,
	}
}

/** Surface Postgres/PostgREST errors as plain Errors (no internals leaked). */
function fail(context: string, error: { message: string }): never {
	console.error(`[questboard] ${context}:`, error.message)
	throw new Error(`Could not ${context}. Please try again.`)
}

export function questXp(quest: Pick<Quest, 'difficulty'>) {
	return DIFFICULTIES[quest.difficulty].xp
}

export async function listQuests(supabase: Supabase, search: QuestSearch = {}) {
	let query = supabase.from('quests').select(QUEST_COLUMNS)

	if (search.status === 'done') query = query.not('completed_at', 'is', null)
	if (search.status === 'active') query = query.is('completed_at', null)

	// Keep only safe characters: the value is embedded in a PostgREST filter.
	const q = search.q?.replace(/[^\p{L}\p{N} '-]/gu, '').trim()
	if (q) query = query.or(`title.ilike.%${q}%,notes.ilike.%${q}%`)

	const sort = search.sort ?? 'newest'
	// The enum is declared easy < medium < epic, so it sorts by XP.
	if (sort === 'xp') query = query.order('difficulty', { ascending: false })
	query = query.order('created_at', { ascending: sort === 'oldest' })

	const { data, error } = await query
	if (error) fail('load your quests', error)
	return data.map(toQuest)
}

export async function findQuest(supabase: Supabase, id: string) {
	const { data, error } = await supabase
		.from('quests')
		.select(QUEST_COLUMNS)
		.eq('id', id)
		.maybeSingle()
	// An invalid uuid is just "not found" for our purposes.
	if (error && error.code !== '22P02') fail('load that quest', error)
	return data ? toQuest(data) : null
}

export async function addQuest(supabase: Supabase, input: NewQuestInput) {
	// owner_id defaults to auth.uid() in the database.
	const { data, error } = await supabase
		.from('quests')
		.insert(input)
		.select(QUEST_COLUMNS)
		.single()
	if (error) fail('save the quest', error)
	return toQuest(data)
}

export async function toggleQuest(supabase: Supabase, id: string) {
	const current = await findQuest(supabase, id)
	if (!current) return null
	const { data, error } = await supabase
		.from('quests')
		.update({
			completed_at: current.completedAt ? null : new Date().toISOString(),
		})
		.eq('id', id)
		.select(QUEST_COLUMNS)
		.maybeSingle()
	if (error) fail('update the quest', error)
	return data ? toQuest(data) : null
}

export async function removeQuest(supabase: Supabase, id: string) {
	const { data, error } = await supabase
		.from('quests')
		.delete()
		.eq('id', id)
		.select('id')
	if (error && error.code !== '22P02') fail('delete the quest', error)
	return (data?.length ?? 0) > 0
}

export async function myXp(supabase: Supabase) {
	const { data, error } = await supabase
		.from('quests')
		.select('difficulty')
		.not('completed_at', 'is', null)
	if (error) fail('count your XP', error)
	return new Xp(data.reduce((sum, q) => sum + questXp(q), 0))
}

export async function myDisplayName(supabase: Supabase, userId: string) {
	const { data, error } = await supabase
		.from('profiles')
		.select('display_name')
		.eq('id', userId)
		.maybeSingle()
	if (error) fail('load your profile', error)
	return data?.display_name ?? null
}

// ─── Public aggregates (SECURITY DEFINER functions) ─────────────────────

export async function leaderboard(supabase: Supabase, limit = 10) {
	const { data, error } = await supabase.rpc('leaderboard', { max_rows: limit })
	if (error) fail('load the leaderboard', error)
	return data.map((row) => ({ name: row.display_name, xp: new Xp(row.xp) }))
}

export async function globalStats(supabase: Supabase) {
	const { data, error } = await supabase.rpc('global_stats').single()
	if (error) fail('load the stats', error)
	return {
		adventurers: data.adventurers,
		questsCreated: data.quests_created,
		questsCompleted: data.quests_completed,
		xpEarned: data.xp_earned,
		epicSlain: data.epic_slain,
	}
}

/** XP earned per day for the last `days` days (oldest first). */
export async function dailyXp(supabase: Supabase, days = 14) {
	// Work in UTC so bucket keys match the UTC timestamps Postgres returns.
	const start = new Date()
	start.setUTCHours(0, 0, 0, 0)
	start.setUTCDate(start.getUTCDate() - (days - 1))

	const { data, error } = await supabase
		.from('quests')
		.select('difficulty, completed_at')
		.gte('completed_at', start.toISOString())
	if (error) fail('load your chronicle', error)

	const buckets = new Map<string, number>()
	for (let i = 0; i < days; i++) {
		const d = new Date(start)
		d.setUTCDate(start.getUTCDate() + i)
		buckets.set(d.toISOString().slice(0, 10), 0)
	}
	for (const quest of data) {
		const day = quest.completed_at?.slice(0, 10)
		if (day && buckets.has(day)) {
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
