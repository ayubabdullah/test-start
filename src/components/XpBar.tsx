import type { Xp } from '#/lib/xp'

export function XpBar({ xp }: { xp: Xp }) {
	const pct = Math.round(xp.progress * 100)
	return (
		<div
			className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--line)]"
			role="progressbar"
			aria-valuenow={pct}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label={`${pct}% to level ${xp.level + 1}`}
		>
			<div
				className="h-full rounded-full bg-[linear-gradient(90deg,var(--lagoon),var(--palm))] transition-[width] duration-700"
				style={{ width: `${pct}%` }}
			/>
		</div>
	)
}
