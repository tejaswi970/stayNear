import React, { createContext, useContext, useState, useCallback } from 'react';

const CompareContext = createContext(null);
const MAX_COMPARE = 3;

export function CompareProvider({ children }) {
  const [compareList, setCompareList] = useState([]);

  const addToCompare = useCallback((pg) => {
    setCompareList(prev => {
      if (prev.find(p => p.id === pg.id)) return prev;
      if (prev.length >= MAX_COMPARE) {
        return prev; // Caller should check canAdd first
      }
      return [...prev, pg];
    });
  }, []);

  const removeFromCompare = useCallback((pgId) => {
    setCompareList(prev => prev.filter(p => p.id !== pgId));
  }, []);

  const isInCompare = useCallback((pgId) => {
    return compareList.some(p => p.id === pgId);
  }, [compareList]);

  const canAdd = compareList.length < MAX_COMPARE;

  const clearCompare = useCallback(() => setCompareList([]), []);

  return (
    <CompareContext.Provider value={{ compareList, addToCompare, removeFromCompare, isInCompare, canAdd, clearCompare, MAX_COMPARE }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within CompareProvider');
  return ctx;
}
