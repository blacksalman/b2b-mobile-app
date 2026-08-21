import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { CartState } from '@/data/types';

// Ported verbatim from the source prototype's initial state (line 1378): cart {1:2,3:1}, wish [2,3,7],
// loggedIn false. Not persisted — resets to these seed values on every fresh app load, same as source.
interface AppState {
  cart: CartState;
  wish: number[];
  loggedIn: boolean;
  toast: string;
}

const initialState: AppState = {
  cart: { 1: 2, 3: 1 },
  wish: [2, 3, 7],
  loggedIn: false,
  toast: '',
};

type Action =
  | { type: 'ADD_TO_CART'; id: number; qty: number }
  | { type: 'INC'; id: number }
  | { type: 'DEC'; id: number }
  | { type: 'SET_LOGGED_IN'; value: boolean }
  | { type: 'SHOW_TOAST'; message: string }
  | { type: 'HIDE_TOAST' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_TO_CART':
      return { ...state, cart: { ...state.cart, [action.id]: (state.cart[action.id] || 0) + action.qty } };
    case 'INC':
      return { ...state, cart: { ...state.cart, [action.id]: (state.cart[action.id] || 0) + 1 } };
    case 'DEC':
      return { ...state, cart: { ...state.cart, [action.id]: Math.max(0, (state.cart[action.id] || 0) - 1) } };
    case 'SET_LOGGED_IN':
      return { ...state, loggedIn: action.value };
    case 'SHOW_TOAST':
      return { ...state, toast: action.message };
    case 'HIDE_TOAST':
      return { ...state, toast: '' };
    default:
      return state;
  }
}

interface AppStateContextValue extends AppState {
  addToCart: (id: number, qty: number) => void;
  inc: (id: number) => void;
  dec: (id: number) => void;
  setLoggedIn: (value: boolean) => void;
  flash: (message: string) => void;
  cartCases: number;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

// Ported verbatim from the source's `flash()` (line 1388): 2.6s auto-dismiss, restarting the timer
// on every new toast.
const TOAST_DURATION_MS = 2600;

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const flash = useCallback((message: string) => {
    dispatch({ type: 'SHOW_TOAST', message });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => dispatch({ type: 'HIDE_TOAST' }), TOAST_DURATION_MS);
  }, []);

  const addToCart = useCallback((id: number, qty: number) => dispatch({ type: 'ADD_TO_CART', id, qty }), []);
  const inc = useCallback((id: number) => dispatch({ type: 'INC', id }), []);
  const dec = useCallback((id: number) => dispatch({ type: 'DEC', id }), []);
  const setLoggedIn = useCallback((value: boolean) => dispatch({ type: 'SET_LOGGED_IN', value }), []);

  const cartCases = useMemo(
    () => Object.values(state.cart).reduce((a, b) => a + b, 0),
    [state.cart],
  );

  const value = useMemo<AppStateContextValue>(
    () => ({ ...state, addToCart, inc, dec, setLoggedIn, flash, cartCases }),
    [state, addToCart, inc, dec, setLoggedIn, flash, cartCases],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
