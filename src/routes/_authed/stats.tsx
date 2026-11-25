import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { XpBar } from '#/components/XpBar'
import { getMyStats } from '#/functions/quests.functions'
import { DIFFICULTIES, DIFFICULTY_KEYS } from '#/lib/quests'

export const Route = createFileRoute('/_authed/stats')({
	// Selective SSR: the loader still runs on the server (data arrives with
	// the HTML), but the component — which draws on a <canvas> — renders
	// only in the browser.
	ssr: 'data-only',
	loader: () => getMyStats(),
	pendingComponent: StatsPending,
	pendingMs: 0,
	head: () => ({ meta: [{ title: 'Stats · QuestBoard' }] }),
	component: Stats,
})

function StatsPending() {
	return (
		<main className="page-wrap px-4 py-10">
			<section className="island-shell h-80 animate-pulse rounded-2xl p-6">
				<p className="demo-muted">Consulting the scrolls…</p>
			</section>
		</main>
	)
}

function Stats() {
	const { daily, xp, byDifficulty } = Route.useLoaderData()

	return (
		<main className="page-wrap px-4 py-10">
			<section className="island-shell rounded-2xl p-6">
				<p className="island-kicker mb-1">Chronicle</p>
				<h1 className="display-title m-0 text-3xl font-bold">
					XP over the last 14 days
				</h1>
				<p className="demo-muted mt-1 text-sm">
					Level {xp.level} {xp.title} · {xp.points} XP total
				</p>
				<XpBar xp={xp} />
				<XpChart daily={daily} />
			</section>

			<section className="mt-6 grid gap-4 sm:grid-cols-3">
				{DIFFICULTY_KEYS.map((key) => {
					const row = byDifficulty.find((r) => r.difficulty === key)
					const meta = DIFFICULTIES[key]
					return (
						<article key={key} className="island-shell rounded-2xl p-5">
							<p className="m-0 text-2xl">{meta.emoji}</p>
							<p className="m-0 mt-2 text-2xl font-bold">
								{row?.done ?? 0} / {row?.total ?? 0}
							</p>
							<p className="demo-muted m-0 text-sm">{meta.label} quests done</p>
						</article>
					)
				})}
			</section>
		</main>
	)
}

function XpChart({ daily }: { daily: Array<{ day: string; xp: number }> }) {
	const ref = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = ref.current
		const ctx = canvas?.getContext('2d')
		if (!canvas || !ctx) return

		const draw = () => {
			const dpr = window.devicePixelRatio || 1
			const width = canvas.clientWidth
			const height = canvas.clientHeight
			canvas.width = width * dpr
			canvas.height = height * dpr
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
			ctx.clearRect(0, 0, width, height)

			const styles = getComputedStyle(document.documentElement)
			const bar = styles.getPropertyValue('--lagoon').trim() || '#4fb8b2'
			const ink = styles.getPropertyValue('--sea-ink-soft').trim() || '#416166'
			const max = Math.max(25, ...daily.map((d) => d.xp))
			const gap = 6
			const barWidth = (width - gap * (daily.length - 1)) / daily.length
			const chartHeight = height - 28

			ctx.font = '11px Manrope, system-ui, sans-serif'
			ctx.textAlign = 'center'
			daily.forEach((d, i) => {
				const x = i * (barWidth + gap)
				const h = (d.xp / max) * (chartHeight - 16)
				ctx.fillStyle = bar
				ctx.globalAlpha = d.xp ? 1 : 0.25
				ctx.beginPath()
				ctx.roundRect(x, chartHeight - Math.max(h, 3), barWidth, Math.max(h, 3), 6)
				ctx.fill()
				ctx.globalAlpha = 1
				ctx.fillStyle = ink
				if (d.xp) ctx.fillText(String(d.xp), x + barWidth / 2, chartHeight - h - 4)
				if (i % 2 === daily.length % 2) {
					ctx.fillText(d.day.slice(5), x + barWidth / 2, height - 6)
				}
			})
		}

		draw()
		const observer = new ResizeObserver(draw)
		observer.observe(canvas)
		return () => observer.disconnect()
	}, [daily])

	return (
		<canvas
			ref={ref}
			className="mt-6 h-64 w-full"
			role="img"
			aria-label={`Bar chart of XP per day: ${daily.map((d) => `${d.day} ${d.xp}`).join(', ')}`}
		/>
	)
}
