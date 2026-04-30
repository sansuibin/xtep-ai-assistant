'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
  User,
  Session,
  Message,
  GeneratedImage,
  GenerationParams,
  Resolution,
  AspectRatio,
} from '@/types';

// State types
interface AppState {
  user: User | null;
  sessions: Session[];
  currentSessionId: string | null;
  gallery: GeneratedImage[];
  galleryViewMode: 'timeline' | 'grouped';
  isLoginModalOpen: boolean;
  isImagePreviewOpen: boolean;
  previewImage: GeneratedImage | null;
  isGenerating: boolean;
}

// Action types
type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'OPEN_LOGIN_MODAL' }
  | { type: 'CLOSE_LOGIN_MODAL' }
  | { type: 'ADD_SESSION'; payload: Session }
  | { type: 'UPDATE_SESSION'; payload: { id: string; updates: Partial<Session> } }
  | { type: 'DELETE_SESSION'; payload: string }
  | { type: 'SET_CURRENT_SESSION'; payload: string | null }
  | { type: 'ADD_MESSAGE'; payload: { sessionId: string; message: Message } }
  | { type: 'UPDATE_MESSAGE'; payload: { sessionId: string; messageIndex: number; updates: Partial<Message> } }
  | { type: 'ADD_IMAGES'; payload: GeneratedImage[] }
  | { type: 'DELETE_IMAGES_BY_SESSION'; payload: string }
  | { type: 'SET_GALLERY_VIEW_MODE'; payload: 'timeline' | 'grouped' }
  | { type: 'OPEN_IMAGE_PREVIEW'; payload: GeneratedImage }
  | { type: 'CLOSE_IMAGE_PREVIEW' }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'LOGOUT' }
  | { type: 'LOAD_STATE'; payload: Partial<AppState> };

// Initial state
const initialState: AppState = {
  user: null,
  sessions: [],
  currentSessionId: null,
  gallery: [],
  galleryViewMode: 'timeline',
  isLoginModalOpen: false,
  isImagePreviewOpen: false,
  previewImage: null,
  isGenerating: false,
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'OPEN_LOGIN_MODAL':
      return { ...state, isLoginModalOpen: true };
    case 'CLOSE_LOGIN_MODAL':
      return { ...state, isLoginModalOpen: false };
    case 'ADD_SESSION':
      return {
        ...state,
        sessions: [action.payload, ...state.sessions],
        currentSessionId: action.payload.id,
      };
    case 'UPDATE_SESSION':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.payload.id ? { ...s, ...action.payload.updates } : s
        ),
      };
    case 'DELETE_SESSION':
      return {
        ...state,
        sessions: state.sessions.filter((s) => s.id !== action.payload),
        currentSessionId:
          state.currentSessionId === action.payload
            ? state.sessions[0]?.id || null
            : state.currentSessionId,
        gallery: state.gallery.filter((img) => img.sessionId !== action.payload),
      };
    case 'SET_CURRENT_SESSION':
      return { ...state, currentSessionId: action.payload };
    case 'ADD_MESSAGE':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.payload.sessionId
            ? { ...s, messages: [...s.messages, action.payload.message], updatedAt: Date.now() }
            : s
        ),
      };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.payload.sessionId
            ? {
                ...s,
                messages: s.messages.map((msg, idx) =>
                  idx === action.payload.messageIndex
                    ? { ...msg, ...action.payload.updates }
                    : msg
                ),
                updatedAt: Date.now(),
              }
            : s
        ),
      };
    case 'ADD_IMAGES':
      return { ...state, gallery: [...state.gallery, ...action.payload] };
    case 'DELETE_IMAGES_BY_SESSION':
      return {
        ...state,
        gallery: state.gallery.filter((img) => img.sessionId !== action.payload),
      };
    case 'SET_GALLERY_VIEW_MODE':
      return { ...state, galleryViewMode: action.payload };
    case 'OPEN_IMAGE_PREVIEW':
      return { ...state, isImagePreviewOpen: true, previewImage: action.payload };
    case 'CLOSE_IMAGE_PREVIEW':
      return { ...state, isImagePreviewOpen: false, previewImage: null };
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload };
    case 'LOGOUT':
      return {
        ...initialState,
        isLoginModalOpen: false,
      };
    case 'LOAD_STATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  login: (username: string, userData?: { id: string; modelName?: string; provider?: string }) => void;
  logout: () => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  createSession: (name?: string) => void;
  updateSessionName: (id: string, name: string) => void;
  deleteSession: (id: string) => void;
  selectSession: (id: string) => void;
  addMessage: (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (sessionId: string, messageIndex: number, updates: Partial<Message>) => void;
  addGeneratedImages: (images: GeneratedImage[]) => void;
  setGalleryViewMode: (mode: 'timeline' | 'grouped') => void;
  openImagePreview: (image: GeneratedImage) => void;
  closeImagePreview: () => void;
  setGenerating: (generating: boolean) => void;
  getCurrentSession: () => Session | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEY = 'xtep-ai-app-state';
const USER_STORAGE_KEY = 'xtep-ai-user';

// Provider
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState, (init) => {
    // Lazy initializer: restore from localStorage synchronously to prevent flash
    if (typeof window === 'undefined') return init;
    try {
      const restored: Partial<AppState> = {};
      const savedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (savedUser) {
        restored.user = JSON.parse(savedUser);
      }
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        restored.galleryViewMode = parsed.galleryViewMode || 'timeline';
        restored.sessions = parsed.sessions || [];
        restored.currentSessionId = parsed.currentSessionId || null;
        restored.gallery = parsed.gallery || [];
      }
      // Only override if we actually restored something
      if (Object.keys(restored).length > 0) {
        return { ...init, ...restored };
      }
    } catch {
      // Ignore parse errors
    }
    return init;
  });

  // Create default session if user is logged in but has no sessions
  useEffect(() => {
    if (state.user && state.sessions.length === 0) {
      const sessionId = `session-${Date.now()}`;
      const session: Session = {
        id: sessionId,
        name: '新对话',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      dispatch({ type: 'ADD_SESSION', payload: session });
    }
  }, [state.user]); // Only re-run when user changes

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          galleryViewMode: state.galleryViewMode,
          sessions: state.sessions,
          currentSessionId: state.currentSessionId,
          gallery: state.gallery,
        })
      );
    } catch {
      // Ignore storage errors
    }
  }, [state.galleryViewMode, state.sessions, state.currentSessionId, state.gallery]);

  // Save user to localStorage
  useEffect(() => {
    try {
      if (state.user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(state.user));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [state.user]);

  // Login
  const login = useCallback((username: string, userData?: { id: string; modelName?: string; provider?: string }) => {
    const user: User = {
      id: userData?.id || `user-${Date.now()}`,
      username,
      modelName: userData?.modelName,
      provider: userData?.provider,
    };
    dispatch({ type: 'SET_USER', payload: user });
    dispatch({ type: 'CLOSE_LOGIN_MODAL' });

    // Create default session
    const sessionId = `session-${Date.now()}`;
    const session: Session = {
      id: sessionId,
      name: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    dispatch({ type: 'ADD_SESSION', payload: session });
  }, []);

  // Logout
  const logout = useCallback(() => {
    // Clear all user data from localStorage
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    dispatch({ type: 'LOGOUT' });
  }, []);

  // Open login modal
  const openLoginModal = useCallback(() => {
    dispatch({ type: 'OPEN_LOGIN_MODAL' });
  }, []);

  // Close login modal
  const closeLoginModal = useCallback(() => {
    dispatch({ type: 'CLOSE_LOGIN_MODAL' });
  }, []);

  // Create session
  const createSession = useCallback((name?: string) => {
    const session: Session = {
      id: `session-${Date.now()}`,
      name: name || '新会话',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    dispatch({ type: 'ADD_SESSION', payload: session });
  }, []);

  // Update session name
  const updateSessionName = useCallback((id: string, name: string) => {
    dispatch({ type: 'UPDATE_SESSION', payload: { id, updates: { name } } });
  }, []);

  // Delete session
  const deleteSession = useCallback((id: string) => {
    dispatch({ type: 'DELETE_IMAGES_BY_SESSION', payload: id });
    dispatch({ type: 'DELETE_SESSION', payload: id });
  }, []);

  // Select session
  const selectSession = useCallback((id: string) => {
    dispatch({ type: 'SET_CURRENT_SESSION', payload: id });
  }, []);

  // Add message
  const addMessage = useCallback(
    (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
      const fullMessage: Message = {
        ...message,
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: { sessionId, message: fullMessage } });
    },
    []
  );

  // Update message (for streaming updates)
  const updateMessage = useCallback(
    (sessionId: string, messageIndex: number, updates: Partial<Message>) => {
      dispatch({ type: 'UPDATE_MESSAGE', payload: { sessionId, messageIndex, updates } });
    },
    []
  );

  // Add generated images
  const addGeneratedImages = useCallback((images: GeneratedImage[]) => {
    dispatch({ type: 'ADD_IMAGES', payload: images });
  }, []);

  // Set gallery view mode
  const setGalleryViewMode = useCallback((mode: 'timeline' | 'grouped') => {
    dispatch({ type: 'SET_GALLERY_VIEW_MODE', payload: mode });
  }, []);

  // Open image preview
  const openImagePreview = useCallback((image: GeneratedImage) => {
    dispatch({ type: 'OPEN_IMAGE_PREVIEW', payload: image });
  }, []);

  // Close image preview
  const closeImagePreview = useCallback(() => {
    dispatch({ type: 'CLOSE_IMAGE_PREVIEW' });
  }, []);

  // Set generating
  const setGenerating = useCallback((generating: boolean) => {
    dispatch({ type: 'SET_GENERATING', payload: generating });
  }, []);

  // Get current session
  const getCurrentSession = useCallback(() => {
    return state.sessions.find((s) => s.id === state.currentSessionId) || null;
  }, [state.sessions, state.currentSessionId]);

  const value: AppContextType = {
    state,
    login,
    logout,
    openLoginModal,
    closeLoginModal,
    createSession,
    updateSessionName,
    deleteSession,
    selectSession,
    addMessage,
    updateMessage,
    addGeneratedImages,
    setGalleryViewMode,
    openImagePreview,
    closeImagePreview,
    setGenerating,
    getCurrentSession,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
