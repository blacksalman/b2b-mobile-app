import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { CartState } from '@/data/types';
import type { FilterTabName } from '@/data/categories-content';

export type FilterMultiKind = 'avail' | 'brand' | 'ing' | 'concern' | 'form';

export interface FilterSelections {
  sort: string;
  price: string;
  avail: string[];
  brand: string[];
  ing: string[];
  concern: string[];
  form: string[];
}

// Ported verbatim from the source's default filter picks (sortPick:'Popular', the rest empty/blank).
export const DEFAULT_FILTERS: FilterSelections = {
  sort: 'Popular',
  price: '',
  avail: [],
  brand: [],
  ing: [],
  concern: [],
  form: [],
};

// Ported verbatim from the source prototype's initial state (line 1378): cart {1:2,3:1}, wish [2,3,7],
// loggedIn false. Not persisted — resets to these seed values on every fresh app load, same as source.
// Filter selections (sortPick/pricePick/etc.) and the filter-sheet open/tab state are global in the
// source too (line 1358-1360ish), shared between the Categories screen and the Listing screen —
// picking a filter on one and navigating to the other shows the same active-filter-pills row on both.
interface AppState {
  cart: CartState;
  wish: number[];
  loggedIn: boolean;
  toast: string;
  filters: FilterSelections;
  filterOpen: boolean;
  filterTab: FilterTabName;
}

const initialState: AppState = {
  cart: { 1: 2, 3: 1 },
  wish: [2, 3, 7],
  loggedIn: false,
  toast: '',
  filters: DEFAULT_FILTERS,
  filterOpen: false,
  filterTab: 'Brand',
};

type Action =
  | { type: 'ADD_TO_CART'; id: number; qty: number }
  | { type: 'INC'; id: number }
  | { type: 'DEC'; id: number }
  | { type: 'SET_LOGGED_IN'; value: boolean }
  | { type: 'SHOW_TOAST'; message: string }
  | { type: 'HIDE_TOAST' }
  | { type: 'SET_FILTER_OPEN'; value: boolean }
  | { type: 'SET_FILTER_TAB'; tab: FilterTabName }
  | { type: 'SET_FILTER_SORT'; value: string }
  | { type: 'SET_FILTER_PRICE'; value: string }
  | { type: 'TOGGLE_FILTER_MULTI'; kind: FilterMultiKind; value: string }
  | { type: 'CLEAR_FILTERS' };

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

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
    case 'SET_FILTER_OPEN':
      return { ...state, filterOpen: action.value };
    case 'SET_FILTER_TAB':
      return { ...state, filterTab: action.tab };
    case 'SET_FILTER_SORT':
      return { ...state, filters: { ...state.filters, sort: action.value } };
    case 'SET_FILTER_PRICE':
      return { ...state, filters: { ...state.filters, price: state.filters.price === action.value ? '' : action.value } };
    case 'TOGGLE_FILTER_MULTI':
      return { ...state, filters: { ...state.filters, [action.kind]: toggleInList(state.filters[action.kind], action.value) } };
    case 'CLEAR_FILTERS':
      return { ...state, filters: DEFAULT_FILTERS };
    default:
      return state;
  }
}

export interface ActiveFilterPill {
  key: string;
  label: string;
  remove: () => void;
}

interface AppStateContextValue extends AppState {
  addToCart: (id: number, qty: number) => void;
  inc: (id: number) => void;
  dec: (id: number) => void;
  setLoggedIn: (value: boolean) => void;
  flash: (message: string) => void;
  cartCases: number;
  setFilterOpen: (value: boolean) => void;
  setFilterTab: (tab: FilterTabName) => void;
  setFilterSort: (value: string) => void;
  setFilterPrice: (value: string) => void;
  toggleFilterMulti: (kind: FilterMultiKind, value: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterPills: ActiveFilterPill[];
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

  const setFilterOpen = useCallback((value: boolean) => dispatch({ type: 'SET_FILTER_OPEN', value }), []);
  const setFilterTab = useCallback((tab: FilterTabName) => dispatch({ type: 'SET_FILTER_TAB', tab }), []);
  const setFilterSort = useCallback((value: string) => dispatch({ type: 'SET_FILTER_SORT', value }), []);
  const setFilterPrice = useCallback((value: string) => dispatch({ type: 'SET_FILTER_PRICE', value }), []);
  const toggleFilterMulti = useCallback(
    (kind: FilterMultiKind, value: string) => dispatch({ type: 'TOGGLE_FILTER_MULTI', kind, value }),
    [],
  );
  const clearFilters = useCallback(() => dispatch({ type: 'CLEAR_FILTERS' }), []);

  const cartCases = useMemo(
    () => Object.values(state.cart).reduce((a, b) => a + b, 0),
    [state.cart],
  );

  // Ported verbatim from the source's `hasActiveFilters`/`activeFilterPills` (lines 1566-1575) —
  // shared by both Categories and Listing screens. Removing a pill here only clears that selection;
  // it never re-filters any product grid (filters are inert everywhere in the source, by design).
  const hasActiveFilters = useMemo(
    () =>
      state.filters.sort !== 'Popular' ||
      !!state.filters.price ||
      state.filters.avail.length > 0 ||
      state.filters.brand.length > 0 ||
      state.filters.ing.length > 0 ||
      state.filters.concern.length > 0 ||
      state.filters.form.length > 0,
    [state.filters],
  );

  const activeFilterPills = useMemo<ActiveFilterPill[]>(() => {
    const f = state.filters;
    const pills: ActiveFilterPill[] = [];
    if (f.sort !== 'Popular') pills.push({ key: 'sort', label: f.sort, remove: () => setFilterSort('Popular') });
    if (f.price) pills.push({ key: 'price', label: f.price, remove: () => setFilterPrice(f.price) });
    f.avail.forEach((v) => pills.push({ key: `avail-${v}`, label: v, remove: () => toggleFilterMulti('avail', v) }));
    f.brand.forEach((v) => pills.push({ key: `brand-${v}`, label: v, remove: () => toggleFilterMulti('brand', v) }));
    f.ing.forEach((v) => pills.push({ key: `ing-${v}`, label: v, remove: () => toggleFilterMulti('ing', v) }));
    f.concern.forEach((v) => pills.push({ key: `concern-${v}`, label: v, remove: () => toggleFilterMulti('concern', v) }));
    f.form.forEach((v) => pills.push({ key: `form-${v}`, label: v, remove: () => toggleFilterMulti('form', v) }));
    return pills;
  }, [state.filters, setFilterSort, setFilterPrice, toggleFilterMulti]);

  const value = useMemo<AppStateContextValue>(
    () => ({
      ...state,
      addToCart,
      inc,
      dec,
      setLoggedIn,
      flash,
      cartCases,
      setFilterOpen,
      setFilterTab,
      setFilterSort,
      setFilterPrice,
      toggleFilterMulti,
      clearFilters,
      hasActiveFilters,
      activeFilterPills,
    }),
    [
      state,
      addToCart,
      inc,
      dec,
      setLoggedIn,
      flash,
      cartCases,
      setFilterOpen,
      setFilterTab,
      setFilterSort,
      setFilterPrice,
      toggleFilterMulti,
      clearFilters,
      hasActiveFilters,
      activeFilterPills,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
