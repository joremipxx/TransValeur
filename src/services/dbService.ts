import { Pool } from 'pg';
import { Message, Transcript } from '../types/types';

// Create a new pool using environment variables
const pool = new Pool({
  connectionString: process.env.NODE_ENV === 'development' 
    ? process.env.POSTGRES_URL_NO_SSL 
    : process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false }
    : false
});

// Add development error logging
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  if (process.env.NODE_ENV === 'development') {
    console.error('Database connection details:', {
      host: process.env.POSTGRES_HOST,
      database: process.env.POSTGRES_DATABASE,
      user: process.env.POSTGRES_USER,
      ssl: pool.options.ssl,
    });
  }
});

export const dbService = {
  async saveConversation(
    userId: number,
    title: string,
    messages: Message[],
    transcript: Transcript,
    isFavorite: boolean = false
  ) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create conversation
      const conversationResult = await client.query(
        'INSERT INTO conversations (user_id, title, is_favorite) VALUES ($1, $2, $3) RETURNING id',
        [userId, title, isFavorite]
      );
      const conversationId = conversationResult.rows[0].id;

      // Save messages
      for (const message of messages) {
        await client.query(
          'INSERT INTO messages (conversation_id, content, sender, timestamp) VALUES ($1, $2, $3, $4)',
          [conversationId, message.content, message.sender, message.timestamp]
        );
      }

      // Save transcript
      await client.query(
        'INSERT INTO transcripts (conversation_id, content, upload_date) VALUES ($1, $2, $3)',
        [conversationId, transcript.content, transcript.uploadDate]
      );

      await client.query('COMMIT');
      return conversationId;
    } catch (error) {
      await client.query('ROLLBACK');
      if (process.env.NODE_ENV === 'development') {
        console.error('Database error details:', {
          operation: 'saveConversation',
          error,
          params: { userId, title, messagesCount: messages.length }
        });
      }
      throw error;
    } finally {
      client.release();
    }
  },

  async getConversations(userId: number) {
    const result = await pool.query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
       FROM conversations c 
       WHERE c.user_id = $1 
       ORDER BY c.updated_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async getConversation(conversationId: number) {
    const client = await pool.connect();
    try {
      // Get conversation details
      const conversationResult = await client.query(
        'SELECT * FROM conversations WHERE id = $1',
        [conversationId]
      );
      const conversation = conversationResult.rows[0];

      // Get messages
      const messagesResult = await client.query(
        'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY timestamp',
        [conversationId]
      );
      const messages = messagesResult.rows;

      // Get transcript
      const transcriptResult = await client.query(
        'SELECT * FROM transcripts WHERE conversation_id = $1',
        [conversationId]
      );
      const transcript = transcriptResult.rows[0];

      return {
        ...conversation,
        messages,
        transcript
      };
    } finally {
      client.release();
    }
  },

  async updateConversationTitle(conversationId: number, title: string) {
    await pool.query(
      'UPDATE conversations SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [title, conversationId]
    );
  },

  async toggleFavorite(conversationId: number) {
    await pool.query(
      'UPDATE conversations SET is_favorite = NOT is_favorite, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );
  },

  async deleteConversation(conversationId: number) {
    await pool.query('DELETE FROM conversations WHERE id = $1', [conversationId]);
  }
}; 