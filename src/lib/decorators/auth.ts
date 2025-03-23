/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'

export function requireSuperAdmin() {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value

        descriptor.value = async function(req: NextRequest, ...args: any[]) {
            const role = parseInt(req.headers.get('x-user-role') || '1')
            
            if (role !== 0) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }

            return originalMethod.apply(this, [req, ...args])
        }

        return descriptor
    }
}

export function requireAdmin() {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value

        descriptor.value = async function(req: NextRequest, ...args: any[]) {
            const role = parseInt(req.headers.get('x-user-role') || '1')
            
            if (role !== 0 && role !== 1) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }

            return originalMethod.apply(this, [req, ...args])
        }

        return descriptor
    }
}