'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';

interface User {
    user_ID: number;
    email: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    setUser: () => {},
    loading: false
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if we have a JWT token
        const token = localStorage.getItem('jwt');
        if (token) {
            // If we have a token, we consider the user logged in
            const user_ID = localStorage.getItem('user_ID');
            const role = localStorage.getItem('role');
            if (user_ID && role) {
                setUser({
                    user_ID: parseInt(user_ID),
                    email: '', // We don't need the email since we're not using it
                    role: role
                });
            }
        }
        setLoading(false);
    }, []);

    return (
        <AuthContext.Provider value={{ user, setUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
} 