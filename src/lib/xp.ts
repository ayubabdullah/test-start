import { createSerializationAdapter } from '@tanstack/react-router'

/**
 * A rich value class that travels across the server ↔ client boundary.
 *
 * Plain JSON would turn it into `{ points: 120 }` and lose the methods.
 * The serialization adapter below (registered in `src/start.ts`) teaches
 * TanStack Start how to rebuild a real `Xp` instance on the other side.
 */
export class Xp {
	constructor(readonly points: number) {}

	/** Level curve: every level needs a little more XP than the last. */
	get level() {
		return Math.floor(Math.sqrt(this.points / 25)) + 1
	}

	get title() {
		const titles = [
			'Village Novice',
			'Apprentice',
			'Wanderer',
			'Pathfinder',
			'Knight of Tasks',
			'Archmage of Done',
			'Legend',
		]
		return titles[Math.min(this.level - 1, titles.length - 1)]
	}

	private xpForLevel(level: number) {
		return (level - 1) ** 2 * 25
	}

	/** 0..1 progress towards the next level. */
	get progress() {
		const start = this.xpForLevel(this.level)
		const end = this.xpForLevel(this.level + 1)
		return (this.points - start) / (end - start)
	}

	get toNextLevel() {
		return this.xpForLevel(this.level + 1) - this.points
	}
}

export const xpSerializationAdapter = createSerializationAdapter({
	key: 'questboard-xp',
	test: (value): value is Xp => value instanceof Xp,
	toSerializable: (xp) => xp.points,
	fromSerializable: (points) => new Xp(points),
})
