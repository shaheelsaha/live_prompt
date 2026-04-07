import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config';

export type UserTier = 'free' | 'pro_monthly' | 'pro_yearly';

export interface SubscriptionData {
    plan?: string;
    status?: string;
    cancelAtPeriodEnd?: boolean;
    currentPeriodEnd?: string | number; // sometimes Polar returns string ISO, sometimes we read it from firestore
    polarSubscriptionId?: string;
    polarCustomerId?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    tier: UserTier;
    credits: number;
    subscriptionData: SubscriptionData | null;
    isPro: boolean;
    isFree: boolean;
    hasFullAccess: boolean;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    tier: 'free',
    credits: 0,
    subscriptionData: null,
    isPro: false,
    isFree: true,
    hasFullAccess: false,
    loginWithGoogle: async () => { },
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [tier, setTier] = useState<UserTier>('free');
    const [credits, setCredits] = useState(0);
    const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);

    useEffect(() => {
        let unsubscribeSnapshot: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            // 1. Cleanup previous snapshot if user changes
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }

            if (currentUser) {
                // Check if user authenticated with password and is NOT verified
                const isPasswordAuth = currentUser.providerData.some(p => p.providerId === 'password');
                if (isPasswordAuth && !currentUser.emailVerified) {
                    await signOut(auth);
                    setUser(null);
                    setTier('free');
                    setLoading(false);
                    return;
                }

                // Initial fetch/create to ensure user exists
                const userRef = doc(db, 'users', currentUser.uid);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    // Brand new user — gets 'free' tier
                    const newTier: UserTier = 'free';
                    await setDoc(userRef, {
                        email: currentUser.email,
                        displayName: currentUser.displayName,
                        tier: newTier,
                        createdAt: new Date(),
                    });
                    setTier(newTier);
                    setCredits(0);
                    setSubscriptionData(null);
                } else {
                    const data = userSnap.data();
                    const userTier = data.tier === 'elite_early_user' ? 'free' : (data.tier || 'free');
                    setTier(userTier as UserTier);
                    setCredits(data.credits || 0);
                    setSubscriptionData(data.subscription || null);
                }

                // 2. Set up real-time listener for the user record
                unsubscribeSnapshot = onSnapshot(userRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.data();
                        const updatedTier = data.tier === 'elite_early_user' ? 'free' : (data.tier || 'free');
                        setTier(updatedTier as UserTier);
                        setCredits(data.credits || 0);
                        setSubscriptionData(data.subscription || null);
                    }
                });
                
                setUser(currentUser);
            } else {
                setUser(null);
                setTier('free');
                setSubscriptionData(null);
            }

            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) unsubscribeSnapshot();
        };
    }, []);

    const loginWithGoogle = async () => {
        await signInWithPopup(auth, googleProvider);
    };

    const logout = async () => {
        await signOut(auth);
        setTier('free');
        setCredits(0);
        setSubscriptionData(null);
    };

    const isPro = tier === 'pro_monthly' || tier === 'pro_yearly';
    const isFree = tier === 'free';
    const hasFullAccess = isPro;

    return (
        <AuthContext.Provider value={{ user, loading, tier, credits, subscriptionData, isPro, isFree, hasFullAccess, loginWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
