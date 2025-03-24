import { jwtVerify, SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
)

export interface JWTPayload {
    id: number
    username: string
    role: number
}

export const jwtUtils = {
    async sign(payload: JWTPayload) {
        const jwt = await new SignJWT({ ...payload })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('7d')
            .sign(JWT_SECRET)
        return jwt
    },

    async verify(token: string) {
        try {
            const { payload } = await jwtVerify(token, JWT_SECRET)
            return payload;
        } catch (error) {
            console.error('jwt verify error:', error)
            return null
        }
    }
}