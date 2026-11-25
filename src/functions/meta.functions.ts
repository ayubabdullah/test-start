import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { clientInfoMiddleware } from '#/middleware/timing'
import { getRuntime } from '#/server/runtime'

/**
 * Bridges server-only information (runtime, env flags, request headers)
 * to the UI through an RPC instead of leaking it into the client bundle.
 */
export const getRuntimeInfo = createServerFn({ method: 'GET' })
	// Listing the middleware here types `context.clientTz`. It's also part of
	// the global chain; Start de-duplicates the same middleware instance.
	.middleware([clientInfoMiddleware])
	.handler(({ context }) => ({
		...getRuntime(),
		userAgent: getRequestHeader('user-agent')?.slice(0, 80) ?? 'unknown',
		clientTz: context.clientTz,
	}))
