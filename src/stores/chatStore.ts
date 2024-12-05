import { create } from 'zustand';

interface Message {
  role: string;
  content: string;
}

// Future conversation starters for GroqChatComponent.tsx
export const CONVERSATION_STARTERS = [
  'Who are you?',
  'What can you do?',
  'Why are you here?',
  'Play some music.',
] as const;

interface ChatState {
  messages: Message[];
  hasInitialized: boolean;
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  clearMessages: () => void;
  setHasInitialized: (value: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  hasInitialized: false,
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  updateLastMessage: (content) =>
    set((state) => ({
      messages: state.messages.map((msg, idx) =>
        idx === state.messages.length - 1 ? { ...msg, content } : msg,
      ),
    })),
  clearMessages: () => set({ messages: [] }),
  setHasInitialized: (value) => set({ hasInitialized: value }),
}));
