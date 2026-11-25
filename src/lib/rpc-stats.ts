import { useSyncExternalStore } from 'react'

/**
 * A tiny client-side store fed by `timingMiddleware` so the footer can
 * show the last server-function round trip.
 */
export type RpcStat = { name: string; ms: number; serverTime: Date }

let last: RpcStat | null = null
const listeners = new Set<() => void>()

export function recordRpc(stat: RpcStat) {
	last = stat
	for (const listener of listeners) listener()
}

export function useLastRpc() {
	return useSyncExternalStore(
		(listener) => {
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
		() => last,
		() => null,
	)
}
