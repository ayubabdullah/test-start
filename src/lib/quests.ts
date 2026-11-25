/**
 * Shared, client-safe quest types and validators.
 * Imported by server functions, server routes and UI alike.
 */

export const DIFFICULTIES = {
	easy: { label: 'Easy', xp: 10, emoji: '🌱' },
	medium: { label: 'Medium', xp: 25, emoji: '⚔️' },
	epic: { label: 'Epic', xp: 100, emoji: '🐉' },
} as const

export type Difficulty = keyof typeof DIFFICULTIES
export const DIFFICULTY_KEYS = ['easy', 'medium', 'epic'] as const satisfies ReadonlyArray<Difficulty>

export type Quest = {
	id: string
	owner: string
	title: string
	notes: string
	difficulty: Difficulty
	createdAt: string
	completedAt: string | null
}

export const STATUS_FILTERS = ['all', 'active', 'done'] as const
export type StatusFilter = (typeof STATUS_FILTERS)[number]

export const SORTS = ['newest', 'oldest', 'xp'] as const
export type Sort = (typeof SORTS)[number]

export type QuestSearch = {
	status?: StatusFilter
	sort?: Sort
	q?: string
}

function isDifficulty(value: unknown): value is Difficulty {
	return DIFFICULTY_KEYS.some((key) => key === value)
}

function pick<T extends string>(
	value: unknown,
	allowed: ReadonlyArray<T>,
): T | undefined {
	return allowed.find((item) => item === value)
}

/** Used by `validateSearch` on /quests and by the listQuests server fn. */
export function parseQuestSearch(input: Record<string, unknown>): QuestSearch {
	const q = typeof input.q === 'string' ? input.q.slice(0, 80) : undefined
	return {
		status: pick(input.status, STATUS_FILTERS),
		sort: pick(input.sort, SORTS),
		q: q || undefined,
	}
}

export type NewQuestInput = {
	title: string
	notes: string
	difficulty: Difficulty
}

/** Validates both FormData (progressive forms) and JSON (API clients). */
export function parseNewQuest(input: unknown): NewQuestInput {
	const get = (key: string): unknown => {
		if (input instanceof FormData) return input.get(key)
		if (typeof input === 'object' && input !== null) {
			return Reflect.get(input, key)
		}
		return undefined
	}

	const title = String(get('title') ?? '').trim()
	const notes = String(get('notes') ?? '').trim()
	const difficulty = get('difficulty')

	if (title.length < 3) throw new Error('A quest title needs at least 3 characters.')
	if (title.length > 80) throw new Error('Keep the quest title under 80 characters.')
	if (notes.length > 500) throw new Error('Notes are limited to 500 characters.')
	if (!isDifficulty(difficulty)) throw new Error('Pick a difficulty: easy, medium or epic.')

	return { title, notes, difficulty }
}

export function parseQuestId(input: unknown): { id: string } {
	if (
		typeof input === 'object' &&
		input !== null &&
		'id' in input &&
		typeof input.id === 'string' &&
		/^[a-z0-9-]{1,40}$/.test(input.id)
	) {
		return { id: input.id }
	}
	throw new Error('Invalid quest id')
}
