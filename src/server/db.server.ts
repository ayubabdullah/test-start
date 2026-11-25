/**
 * Tiny JSON-file "database".
 *
 * The `.server.ts` suffix opts this file into Start's import protection:
 * importing it from client code is an error in production builds, so
 * `node:fs` can never leak into the browser bundle.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Quest } from '#/lib/quests'

export type Adventurer = {
	name: string
	/** scrypt hash of the passphrase, `salt:hash` hex */
	passphrase: string
	joinedAt: string
}

type Data = {
	adventurers: Record<string, Adventurer>
	quests: Array<Quest>
}

// Read per call (never at module scope) so it works on edge runtimes too.
function dataFile() {
	return (
		process.env.QUESTBOARD_DATA_FILE ??
		path.join(process.cwd(), '.data', 'questboard.json')
	)
}

// Survive dev-server hot reloads by parking the cache on globalThis.
const globalCache = globalThis as typeof globalThis & {
	__questboard?: Promise<Data>
	__questboardWrite?: Promise<unknown>
}

async function load(): Promise<Data> {
	try {
		return JSON.parse(await readFile(dataFile(), 'utf8'))
	} catch {
		return { adventurers: {}, quests: [] }
	}
}

export async function readDb(): Promise<Data> {
	globalCache.__questboard ??= load()
	return globalCache.__questboard
}

/** Serialises writes so concurrent mutations never clobber each other. */
export async function writeDb<T>(mutate: (data: Data) => T): Promise<T> {
	const run = async () => {
		const data = await readDb()
		const result = mutate(data)
		const file = dataFile()
		await mkdir(path.dirname(file), { recursive: true })
		const tmp = `${file}.tmp`
		await writeFile(tmp, JSON.stringify(data, null, 2))
		await rename(tmp, file)
		return result
	}
	const next = (globalCache.__questboardWrite ?? Promise.resolve()).then(
		run,
		run,
	)
	globalCache.__questboardWrite = next.catch(() => {})
	return next
}
