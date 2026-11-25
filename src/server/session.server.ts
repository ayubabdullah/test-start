/**
 * Signed-cookie sessions built on Start's cookie helpers.
 *
 * The cookie holds `name.signature` where signature = HMAC-SHA256(name).
 * HttpOnly + SameSite=Lax + Secure (in production) keeps it out of reach
 * of page scripts and cross-site requests.
 */
import {
	createHmac,
	randomBytes,
	scrypt,
	timingSafeEqual,
} from 'node:crypto'
import { promisify } from 'node:util'
import {
	deleteCookie,
	getCookie,
	setCookie,
} from '@tanstack/react-start/server'

const scryptAsync = promisify(scrypt)
const COOKIE = 'qb_session'

function secret() {
	// Read per request. In production, set SESSION_SECRET in the environment.
	const value = process.env.SESSION_SECRET
	if (!value && process.env.NODE_ENV === 'production') {
		console.warn('[questboard] SESSION_SECRET is not set; using a dev secret')
	}
	return value ?? 'questboard-dev-secret-change-me'
}

function sign(name: string) {
	return createHmac('sha256', secret()).update(name).digest('base64url')
}

function safeEqual(a: string, b: string) {
	const ab = Buffer.from(a)
	const bb = Buffer.from(b)
	return ab.length === bb.length && timingSafeEqual(ab, bb)
}

export function readSessionUser(): string | null {
	const raw = getCookie(COOKIE)
	if (!raw) return null
	const dot = raw.lastIndexOf('.')
	if (dot < 1) return null
	const name = decodeURIComponent(raw.slice(0, dot))
	return safeEqual(raw.slice(dot + 1), sign(name)) ? name : null
}

export function issueSession(name: string) {
	setCookie(COOKIE, `${encodeURIComponent(name)}.${sign(name)}`, {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		path: '/',
		maxAge: 60 * 60 * 24 * 30,
	})
}

export function destroySession() {
	deleteCookie(COOKIE, { path: '/' })
}

export async function hashPassphrase(passphrase: string) {
	const salt = randomBytes(16).toString('hex')
	const hash = (await scryptAsync(passphrase, salt, 32)) as Buffer
	return `${salt}:${hash.toString('hex')}`
}

export async function verifyPassphrase(passphrase: string, stored: string) {
	const [salt, hash] = stored.split(':')
	if (!salt || !hash) return false
	const candidate = (await scryptAsync(passphrase, salt, 32)) as Buffer
	return safeEqual(candidate.toString('hex'), hash)
}
