const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const ChatHistory = require('../models/ChatHistory');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'farmwise-secret-key-2024';

// Auth middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// POST /api/chat-history - Create a new chat session
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, context, messages, productContext } = req.body;

    const chat = new ChatHistory({
      user: req.user._id,
      title: title || 'New Chat',
      context: context || {},
      messages: messages || [],
      productContext: productContext || null
    });

    await chat.save();

    res.status(201).json({
      success: true,
      chat: {
        id: chat._id,
        title: chat.title,
        context: chat.context,
        messages: chat.messages,
        productContext: chat.productContext,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }
    });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ success: false, error: 'Failed to create chat session' });
  }
});

// GET /api/chat-history - List all chat sessions for the user
router.get('/', authenticate, async (req, res) => {
  try {
    const chats = await ChatHistory.find({ user: req.user._id, isActive: true })
      .select('title context.crop messages updatedAt createdAt')
      .sort({ updatedAt: -1 })
      .lean();

    // Return summary info (title, last message preview, message count, date)
    const chatList = chats.map(chat => ({
      id: chat._id,
      title: chat.title,
      crop: chat.context?.crop || '',
      messageCount: chat.messages?.length || 0,
      lastMessage: chat.messages?.length > 0
        ? chat.messages[chat.messages.length - 1].text.substring(0, 80)
        : '',
      updatedAt: chat.updatedAt,
      createdAt: chat.createdAt
    }));

    res.json({ success: true, chats: chatList });
  } catch (error) {
    console.error('List chats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch chat history' });
  }
});

// GET /api/chat-history/:id - Get a single chat session with all messages
router.get('/:id', authenticate, async (req, res) => {
  try {
    const chat = await ChatHistory.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    res.json({
      success: true,
      chat: {
        id: chat._id,
        title: chat.title,
        context: chat.context,
        messages: chat.messages,
        productContext: chat.productContext,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch chat' });
  }
});

// PUT /api/chat-history/:id - Update a chat session (add messages, update context/title)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { title, context, messages } = req.body;

    const chat = await ChatHistory.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    if (title !== undefined) chat.title = title;
    if (context !== undefined) chat.context = context;
    if (messages !== undefined) chat.messages = messages;

    await chat.save();

    res.json({
      success: true,
      chat: {
        id: chat._id,
        title: chat.title,
        context: chat.context,
        messages: chat.messages,
        productContext: chat.productContext,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }
    });
  } catch (error) {
    console.error('Update chat error:', error);
    res.status(500).json({ success: false, error: 'Failed to update chat' });
  }
});

// POST /api/chat-history/:id/messages - Append messages to a chat session
router.post('/:id/messages', authenticate, async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'Messages array is required' });
    }

    const chat = await ChatHistory.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    // Append new messages
    chat.messages.push(...messages);

    // Auto-generate title from first user message if still default
    if (chat.title === 'New Chat') {
      const firstUserMsg = chat.messages.find(m => m.role === 'user');
      if (firstUserMsg) {
        chat.title = firstUserMsg.text.substring(0, 50) + (firstUserMsg.text.length > 50 ? '...' : '');
      }
    }

    await chat.save();

    res.json({
      success: true,
      chat: {
        id: chat._id,
        title: chat.title,
        messageCount: chat.messages.length,
        updatedAt: chat.updatedAt
      }
    });
  } catch (error) {
    console.error('Append messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to append messages' });
  }
});

// DELETE /api/chat-history/:id - Soft delete a chat session
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const chat = await ChatHistory.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isActive: false },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    res.json({ success: true, message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete chat' });
  }
});

module.exports = router;
