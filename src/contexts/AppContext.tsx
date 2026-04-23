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
  login: (username: string) => void;
  logout: () => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  createSession: (name?: string) => void;
  updateSessionName: (id: string, name: string) => void;
  deleteSession: (id: string) => void;
  selectSession: (id: string) => void;
  addMessage: (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
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

// Provider
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Don't restore user session for security
        dispatch({
          type: 'LOAD_STATE',
          payload: {
            galleryViewMode: parsed.galleryViewMode || 'timeline',
          },
        });
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save state to localStorage (exclude sensitive data)
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          galleryViewMode: state.galleryViewMode,
        })
      );
    } catch {
      // Ignore storage errors
    }
  }, [state.galleryViewMode]);

  // Login
  const login = useCallback((username: string) => {
    const user: User = {
      id: `user-${Date.now()}`,
      username,
    };
    dispatch({ type: 'SET_USER', payload: user });
    dispatch({ type: 'CLOSE_LOGIN_MODAL' });

    // Create default session
    const session: Session = {
      id: `session-${Date.now()}`,
      name: '我的设计',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    dispatch({ type: 'ADD_SESSION', payload: session });
  }, []);

  // Logout
  const logout = useCallback(() => {
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
