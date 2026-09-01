import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, runTransaction } from 'firebase/firestore';

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCode() {
  const randomValues = new Uint32Array(8);
  crypto.getRandomValues(randomValues);
  const suffix = Array.from(randomValues, (value) =>
    INVITE_CODE_ALPHABET[value % INVITE_CODE_ALPHABET.length]
  ).join('');
  return `SAYU-${suffix}`;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  nickname?: string;
  spaceId?: string | null;
  createdAt: string;
  lastLogin: string;
}

export interface AuthContextType {
  user: AppUser | null;
  partner: AppUser | null;
  loading: boolean;
  isLoading: boolean; // Alias for backward compatibility
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setNickname: (nickname: string) => Promise<void>;
  hasSpace: boolean;
  spaceId: string | null;
  joinSpace: (code: string) => Promise<void>;
  createSpace: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [partner, setPartner] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to sync or create user doc with all required fields
  const syncUserDoc = async (firebaseUser: FirebaseUser): Promise<AppUser> => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    const nowIso = new Date().toISOString();

    if (userSnap.exists()) {
      const existingData = userSnap.data() as Partial<AppUser>;
      
      const updatedFields: Record<string, any> = {
        lastLogin: nowIso,
        createdAt: existingData.createdAt || nowIso,
        displayName: existingData.displayName || firebaseUser.displayName || '',
      };

      if (firebaseUser.photoURL) {
        updatedFields.photoURL = firebaseUser.photoURL;
      }
      if (firebaseUser.email && !existingData.email) {
        updatedFields.email = firebaseUser.email;
      }

      await updateDoc(userRef, updatedFields).catch(async (e) => {
        console.warn('updateDoc failed, using setDoc with merge:', e);
        await setDoc(userRef, updatedFields, { merge: true });
      });

      const fullUser: AppUser = {
        uid: firebaseUser.uid,
        email: existingData.email || firebaseUser.email || '',
        displayName: existingData.displayName || firebaseUser.displayName || '',
        photoURL: firebaseUser.photoURL || existingData.photoURL || '',
        nickname: existingData.nickname || '',
        spaceId: existingData.spaceId || null,
        createdAt: existingData.createdAt || nowIso,
        lastLogin: nowIso
      };

      return fullUser;
    } else {
      // First-time registration
      const newUserData: AppUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || '',
        photoURL: firebaseUser.photoURL || '',
        nickname: '',
        spaceId: null,
        createdAt: nowIso,
        lastLogin: nowIso
      };

      const cleanData = Object.fromEntries(
        Object.entries(newUserData).filter(([_, v]) => v !== undefined)
      );

      await setDoc(userRef, cleanData);
      return newUserData;
    }
  };

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          const appUserData = await syncUserDoc(firebaseUser);
          setUser(appUserData);

          // Real-time listener for current user's profile updates (nickname, spaceId)
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          unsubUserDoc = onSnapshot(userDocRef, (snap) => {
            if (snap.exists()) {
              setUser(snap.data() as AppUser);
            }
          });
        } else {
          if (unsubUserDoc) unsubUserDoc();
          setUser(null);
          setPartner(null);
        }
      } catch (error) {
        console.error('Firebase Auth state error:', error);
        setUser(null);
        setPartner(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  // Real-time partner sync when user is connected to a space
  useEffect(() => {
    if (!user?.uid || !user?.spaceId) {
      setPartner(null);
      return;
    }

    const currentSpaceId = user.spaceId.trim().toUpperCase();

    // The space membership list is the single source of truth for partner access.
    const spaceRef = doc(db, 'spaces', currentSpaceId);
    let unsubPartnerDoc: (() => void) | null = null;

    const unsubSpace = onSnapshot(spaceRef, (spaceSnap) => {
      if (spaceSnap.exists()) {
        const spaceData = spaceSnap.data();
        const usersList: string[] = spaceData.users || [];
        const partnerUid = usersList.find((uid) => uid !== user.uid);

        if (partnerUid) {
          if (unsubPartnerDoc) unsubPartnerDoc();
          const partnerRef = doc(db, 'users', partnerUid);
          unsubPartnerDoc = onSnapshot(partnerRef, (pSnap) => {
            if (pSnap.exists()) {
              setPartner(pSnap.data() as AppUser);
            } else {
              setPartner(null);
            }
          });
        } else {
          if (unsubPartnerDoc) {
            unsubPartnerDoc();
            unsubPartnerDoc = null;
          }
          setPartner(null);
        }
      } else {
        setPartner(null);
      }
    }, (err) => {
      console.warn("Space snapshot error:", err);
    });

    return () => {
      unsubSpace();
      if (unsubPartnerDoc) unsubPartnerDoc();
    };
  }, [user?.uid, user?.spaceId]);

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const appUserData = await syncUserDoc(result.user);
        setUser(appUserData);
      }
    } catch (error: any) {
      console.error('Google Sign In error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setPartner(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const setNickname = async (nickname: string) => {
    if (user && auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, { nickname });
        setUser(prev => prev ? { ...prev, nickname } : null);
      } catch (error) {
        console.error('Error saving nickname:', error);
        throw error;
      }
    }
  };

  const joinSpace = async (code: string) => {
    if (user && auth.currentUser) {
      try {
        const cleanCode = code.trim().toUpperCase();
        const spaceRef = doc(db, 'spaces', cleanCode);
        const userRef = doc(db, 'users', auth.currentUser.uid);

        await runTransaction(db, async (transaction) => {
          const spaceSnap = await transaction.get(spaceRef);
          if (!spaceSnap.exists()) {
            throw new Error('SPACE_NOT_FOUND');
          }

          const members = (spaceSnap.data().users || []) as string[];
          const isAlreadyMember = members.includes(auth.currentUser!.uid);

          if (!isAlreadyMember && members.length >= 2) {
            throw new Error('SPACE_FULL');
          }

          if (!isAlreadyMember) {
            transaction.update(spaceRef, { users: [...members, auth.currentUser!.uid] });
          }
          transaction.update(userRef, { spaceId: cleanCode });
        });

        setUser(prev => prev ? { ...prev, spaceId: cleanCode } : null);
      } catch (error) {
        console.error('Error joining space:', error);
        throw error;
      }
    }
  };

  const createSpace = async (): Promise<string> => {
    if (user && auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const newSpaceId = generateInviteCode();
          const spaceRef = doc(db, 'spaces', newSpaceId);

          try {
            await runTransaction(db, async (transaction) => {
              const existingSpace = await transaction.get(spaceRef);
              if (existingSpace.exists()) {
                throw new Error('SPACE_CODE_COLLISION');
              }

              transaction.set(spaceRef, {
                id: newSpaceId,
                users: [auth.currentUser!.uid],
                createdAt: new Date().toISOString()
              });
              transaction.update(userRef, { spaceId: newSpaceId });
            });

            setUser(prev => prev ? { ...prev, spaceId: newSpaceId } : null);
            return newSpaceId;
          } catch (error) {
            if (error instanceof Error && error.message === 'SPACE_CODE_COLLISION') {
              continue;
            }
            throw error;
          }
        }
        throw new Error('SPACE_CREATE_RETRY_EXHAUSTED');
      } catch (error) {
        console.error('Error creating space:', error);
        throw error;
      }
    }
    throw new Error('Not authenticated');
  };

  const hasSpace = !!user?.spaceId;
  const spaceId = user?.spaceId || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        partner,
        loading,
        isLoading: loading,
        isAuthenticated: !!user,
        login,
        logout,
        setNickname,
        hasSpace,
        spaceId,
        joinSpace,
        createSpace
      }}
    >
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
