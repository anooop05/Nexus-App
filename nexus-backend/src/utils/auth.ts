import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-nexus-key';

export interface AuthResponse {
    token?: string;
    user?: {
        id: string;
        email: string;
    };
    error?: string;
}

export async function registerUser(email: string, pass: string): Promise<AuthResponse> {
    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return { error: 'User with this email already exists.' };
        }

        const hashedPassword = await bcrypt.hash(pass, 10);

        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
            },
        });

        const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, {
            expiresIn: '7d',
        });

        return { token, user: { id: newUser.id, email: newUser.email } };
    } catch (error) {
        console.error('[Auth Error] Registration failed:', error);
        return { error: 'Internal server error during registration.' };
    }
}


export async function loginUser(email: string, pass: string): Promise<AuthResponse> {
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return { error: 'Invalid email or password.' };
        }

        const isPasswordValid = await bcrypt.compare(pass, user.password);
        if (!isPasswordValid) {
            return { error: 'Invalid email or password.' };
        }

        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
            expiresIn: '7d',
        });

        return { token, user: { id: user.id, email: user.email } };
    } catch (error) {
        console.error('[Auth Error] Login failed:', error);
        return { error: 'Internal server error during login.' };
    }
}

export function verifyAuthToken(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        return decoded.userId;
    } catch (error) {
        return null;
    }
}