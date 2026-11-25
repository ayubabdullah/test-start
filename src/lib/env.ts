import {
	createClientOnlyFn,
	createIsomorphicFn,
} from '@tanstack/react-start'

/**
 * One function, two implementations. The bundler keeps only the branch
 * for the environment it builds, so the footer can tell you where a
 * piece of UI was rendered.
 */
export const renderedOn = createIsomorphicFn()
	.server(() => '🖥️ server')
	.client(() => '🌐 browser')

/**
 * Browser-only effect. Calling it on the server throws, which makes
 * accidental SSR usage loud instead of silently broken.
 */
export const celebrate = createClientOnlyFn((emojis: string) => {
	const chars = [...emojis]
	for (let i = 0; i < 28; i++) {
		const span = document.createElement('span')
		span.textContent = chars[i % chars.length]
		span.className = 'qb-confetti'
		span.style.left = `${Math.random() * 100}vw`
		span.style.animationDelay = `${Math.random() * 0.4}s`
		span.style.fontSize = `${18 + Math.random() * 18}px`
		document.body.appendChild(span)
		setTimeout(() => span.remove(), 2200)
	}
})
