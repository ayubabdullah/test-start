import { rootRouteId, useHydrated, useMatch } from '@tanstack/react-router'
import { useLastRpc } from '#/lib/rpc-stats'

export default function Footer() {
	// The footer lives in the shell, which also renders when the root
	// errors — so read the root match defensively.
	const loaderRanOn = useMatch({
		from: rootRouteId,
		shouldThrow: false,
		select: (match) => match.loaderData?.loaderRanOn,
	})
	const hydrated = useHydrated()
	const rpc = useLastRpc()

	return (
		<footer className="mt-20 border-t border-[var(--line)] px-4 pb-14 pt-8 text-[var(--sea-ink-soft)]">
			<div className="page-wrap flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
				<p className="m-0">⚔️ QuestBoard — a TanStack Start feature tour</p>
				<div className="flex flex-wrap gap-2">
					<span className="demo-pill" title="createIsomorphicFn in the root loader">
						root loader: {loaderRanOn ?? '…'}
					</span>
					<span className="demo-pill" title="useHydrated()">
						{hydrated ? '💧 hydrated' : '⏳ SSR HTML'}
					</span>
					<span
						className="demo-pill"
						title="Reported by the global timingMiddleware (client ↔ server sendContext)"
					>
						{rpc
							? `last RPC: ${rpc.name} · ${rpc.ms}ms · server ${rpc.serverTime.toLocaleTimeString()}`
							: 'no RPC yet'}
					</span>
				</div>
			</div>
		</footer>
	)
}
