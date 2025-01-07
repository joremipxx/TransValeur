import { Message, Transcript } from '../types/types';
import { dbService } from './dbService';

export const saveChatToHistory = async (
  messages: Message[], 
  transcript: Transcript, 
  isFavorite: boolean = false,
  userId: number = 1 // Default user ID until auth is implemented
) => {
  try {
    const title = transcript.title || 'Nouvelle conversation';
    await dbService.saveConversation(userId, title, messages, transcript, isFavorite);
  } catch (error) {
    console.error('Error saving chat to history:', error);
    throw error;
  }
};

export const getChatHistory = async (userId: number = 1) => {
  try {
    const conversations = await dbService.getConversations(userId);
    return conversations.map(conv => ({
      id: conv.id.toString(),
      title: conv.title,
      date: new Date(conv.created_at),
      preview: conv.message_count > 0 ? `${conv.message_count} messages` : 'No messages',
      isFavorite: conv.is_favorite
    }));
  } catch (error) {
    console.error('Error getting chat history:', error);
    return [];
  }
};

export const loadChatSession = async (chatId: string) => {
  try {
    const conversation = await dbService.getConversation(parseInt(chatId));
    if (!conversation) return null;

    return {
      messages: conversation.messages.map(msg => ({
        ...msg,
        id: msg.id.toString(),
        timestamp: new Date(msg.timestamp)
      })),
      transcript: {
        ...conversation.transcript,
        uploadDate: new Date(conversation.transcript.upload_date)
      },
      title: conversation.title,
      isFavorite: conversation.is_favorite
    };
  } catch (error) {
    console.error('Error loading chat session:', error);
    return null;
  }
};

export const updateChatTitle = async (chatId: string, title: string) => {
  try {
    await dbService.updateConversationTitle(parseInt(chatId), title);
  } catch (error) {
    console.error('Error updating chat title:', error);
    throw error;
  }
};

export const toggleChatFavorite = async (chatId: string) => {
  try {
    await dbService.toggleFavorite(parseInt(chatId));
  } catch (error) {
    console.error('Error toggling favorite status:', error);
    throw error;
  }
};

export const deleteChatSession = async (chatId: string) => {
  try {
    await dbService.deleteConversation(parseInt(chatId));
  } catch (error) {
    console.error('Error deleting chat session:', error);
    throw error;
  }
}; 