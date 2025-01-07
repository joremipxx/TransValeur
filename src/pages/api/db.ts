import { NextApiRequest, NextApiResponse } from 'next';
import { dbService } from '../../services/dbService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        if (req.query.conversationId) {
          const conversation = await dbService.getConversation(parseInt(req.query.conversationId as string));
          res.status(200).json(conversation);
        } else {
          const conversations = await dbService.getConversations(parseInt(req.query.userId as string) || 1);
          res.status(200).json(conversations);
        }
        break;

      case 'POST':
        const { userId, title, messages, transcript, isFavorite } = req.body;
        const conversationId = await dbService.saveConversation(
          userId || 1,
          title,
          messages,
          transcript,
          isFavorite
        );
        res.status(201).json({ conversationId });
        break;

      case 'PUT':
        if (req.query.action === 'title') {
          await dbService.updateConversationTitle(
            parseInt(req.query.conversationId as string),
            req.body.title
          );
        } else if (req.query.action === 'favorite') {
          await dbService.toggleFavorite(parseInt(req.query.conversationId as string));
        }
        res.status(200).json({ success: true });
        break;

      case 'DELETE':
        await dbService.deleteConversation(parseInt(req.query.conversationId as string));
        res.status(200).json({ success: true });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
} 