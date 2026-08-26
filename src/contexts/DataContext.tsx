import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Book } from '../types';
import { INITIAL_USER_BOOKS } from '../lib/mockData';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';

interface DataContextType {
  books: Book[];
  isLoading: boolean;
  addBook: (bookData: Partial<Book>) => Promise<void>;
  updateBook: (id: string, updates: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  restoreBook: (id: string) => Promise<void>;
  permanentlyDeleteBook: (id: string) => Promise<void>;
  setCurrentBook: (id: string) => Promise<void>;
  getTrashBooks: () => Book[];
  getActiveBooks: () => Book[];
  resetToDefaultBooks: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { spaceId, isAuthenticated } = useAuth();
  const [books, setBooks] = useState<Book[]>(INITIAL_USER_BOOKS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !spaceId) {
      setBooks(INITIAL_USER_BOOKS);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const booksColRef = collection(db, 'spaces', spaceId, 'books');

    // Subscribe to real-time updates from Firestore
    const unsubscribe = onSnapshot(
      booksColRef,
      async (snapshot) => {
        if (snapshot.empty) {
          // Initialize space with default curated library on first entry
          try {
            const batch = writeBatch(db);
            INITIAL_USER_BOOKS.forEach((b) => {
              const bookDocRef = doc(db, 'spaces', spaceId, 'books', b.id);
              const cleanBook = Object.fromEntries(
                Object.entries({ ...b, spaceId }).filter(([_, v]) => v !== undefined)
              );
              batch.set(bookDocRef, cleanBook);
            });
            await batch.commit();
          } catch (seedErr) {
            console.error("Error seeding initial books:", seedErr);
            setBooks(INITIAL_USER_BOOKS);
          }
        } else {
          const loadedBooks: Book[] = [];
          snapshot.forEach((docSnap) => {
            loadedBooks.push(docSnap.data() as Book);
          });

          // Sort: reading first, then recently created
          loadedBooks.sort((a, b) => {
            if (a.status === 'reading' && b.status !== 'reading') return -1;
            if (b.status === 'reading' && a.status !== 'reading') return 1;
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });

          setBooks(loadedBooks);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Firestore books listener error:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [spaceId, isAuthenticated]);

  const addBook = async (bookData: Partial<Book>) => {
    const bookId = 'book_' + Date.now().toString();
    const newBook: Book = {
      id: bookId,
      spaceId: spaceId || 'default_space',
      title: bookData.title || '',
      author: bookData.author || '',
      status: bookData.status || 'planned',
      createdAt: new Date().toISOString(),
      ...bookData
    };

    if (spaceId) {
      try {
        const cleanBook = Object.fromEntries(
          Object.entries(newBook).filter(([_, v]) => v !== undefined)
        );
        await setDoc(doc(db, 'spaces', spaceId, 'books', bookId), cleanBook);
      } catch (err) {
        console.error("Error adding book to Firestore:", err);
      }
    } else {
      setBooks(prev => [newBook, ...prev]);
    }
  };

  const updateBook = async (id: string, updates: Partial<Book>) => {
    if (spaceId) {
      try {
        const cleanUpdates = Object.fromEntries(
          Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        await updateDoc(doc(db, 'spaces', spaceId, 'books', id), cleanUpdates);
      } catch (err) {
        console.error("Error updating book in Firestore:", err);
      }
    } else {
      setBooks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    }
  };

  const deleteBook = async (id: string) => {
    const deletedAt = new Date().toISOString();
    await updateBook(id, { deletedAt });
  };

  const restoreBook = async (id: string) => {
    if (spaceId) {
      try {
        const docRef = doc(db, 'spaces', spaceId, 'books', id);
        await updateDoc(docRef, { deletedAt: null as any });
      } catch (err) {
        console.error("Error restoring book in Firestore:", err);
      }
    } else {
      setBooks(prev => prev.map(b => b.id === id ? { ...b, deletedAt: undefined } : b));
    }
  };

  const permanentlyDeleteBook = async (id: string) => {
    if (spaceId) {
      try {
        await deleteDoc(doc(db, 'spaces', spaceId, 'books', id));
      } catch (err) {
        console.error("Error deleting book in Firestore:", err);
      }
    } else {
      setBooks(prev => prev.filter(b => b.id !== id));
    }
  };

  const setCurrentBook = async (id: string) => {
    if (spaceId) {
      try {
        const batch = writeBatch(db);
        // Find existing reading book and change to planned
        const currentReading = books.find(b => b.status === 'reading');
        if (currentReading && currentReading.id !== id) {
          const oldRef = doc(db, 'spaces', spaceId, 'books', currentReading.id);
          batch.update(oldRef, { status: 'planned' });
        }

        const newRef = doc(db, 'spaces', spaceId, 'books', id);
        const targetBook = books.find(b => b.id === id);
        batch.update(newRef, {
          status: 'reading',
          startedAt: targetBook?.startedAt || new Date().toISOString()
        });

        await batch.commit();
      } catch (err) {
        console.error("Error setting current book in Firestore:", err);
      }
    } else {
      setBooks(prev => prev.map(b => {
        if (b.id === id) {
          return { ...b, status: 'reading', startedAt: b.startedAt || new Date().toISOString() };
        }
        if (b.status === 'reading') {
          return { ...b, status: 'planned' };
        }
        return b;
      }));
    }
  };

  const resetToDefaultBooks = async () => {
    if (spaceId) {
      try {
        const snapshot = await getDocs(collection(db, 'spaces', spaceId, 'books'));
        const batch = writeBatch(db);
        snapshot.forEach((d) => batch.delete(d.ref));
        INITIAL_USER_BOOKS.forEach((b) => {
          const cleanBook = Object.fromEntries(
            Object.entries({ ...b, spaceId }).filter(([_, v]) => v !== undefined)
          );
          batch.set(doc(db, 'spaces', spaceId, 'books', b.id), cleanBook);
        });
        await batch.commit();
      } catch (err) {
        console.error("Error resetting books in Firestore:", err);
      }
    } else {
      setBooks(INITIAL_USER_BOOKS);
    }
  };

  const getTrashBooks = () => books.filter(b => !!b.deletedAt);
  const getActiveBooks = () => books.filter(b => !b.deletedAt);

  return (
    <DataContext.Provider
      value={{
        books,
        isLoading,
        addBook,
        updateBook,
        deleteBook,
        restoreBook,
        permanentlyDeleteBook,
        setCurrentBook,
        getTrashBooks,
        getActiveBooks,
        resetToDefaultBooks
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
