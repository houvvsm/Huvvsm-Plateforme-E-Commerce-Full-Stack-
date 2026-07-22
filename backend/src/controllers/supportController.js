import { prisma } from '../config/db.js';
import { sendTicketCreatedEmail, sendAdminReplyEmail, sendRatingRequestEmail } from '../config/email.js';
import { generateTriageSummary, generateSuggestedReplies } from '../services/aiService.js';

// Helper to asynchronously generate AI Triage Summary and Priority
async function generateAiSummaryAndPriority(ticketId, initialMessage, customerName, category) {
  try {
    const triage = await generateTriageSummary(customerName, category, initialMessage);
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        aiSummary: JSON.stringify({
          shortSummary: triage.shortSummary,
          highlights: triage.highlights,
          suggestedCause: triage.suggestedCause,
          suggestedAction: triage.suggestedAction
        }),
        priority: triage.priority || 'MEDIUM'
      }
    });
  } catch (err) {
    console.error('[AI TRIAGE ERROR]', err.message);
  }
}

// ── CUSTOMER PORTAL ENDPOINTS ──

// @desc    Create support ticket
// @route   POST /api/v1/support/tickets
// @access  Private
export const createTicket = async (req, res) => {
  try {
    const { category, message } = req.body;

    if (!category || !message) {
      return res.status(400).json({ success: false, error: 'Category and message are required' });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user.id,
        category,
        status: 'OPEN',
        priority: 'MEDIUM', // initial default priority
        messages: {
          create: {
            senderId: req.user.id,
            senderRole: req.user.role,
            senderName: req.user.name,
            content: message
          }
        }
      },
      include: {
        messages: true,
        user: true
      }
    });

    // Run AI Triage asynchronously (fire-and-forget)
    generateAiSummaryAndPriority(ticket.id, message, req.user.name, category);

    // Send notification email to admins & owners
    try {
      const staffList = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'OWNER'] } }
      });
      const emails = staffList.map(s => s.email).filter(Boolean);
      if (emails.length > 0) {
        await sendTicketCreatedEmail(emails, {
          id: ticket.id,
          category,
          customerName: req.user.name,
          customerEmail: req.user.email,
          message,
          createdAt: ticket.createdAt
        });
      }
    } catch (emailErr) {
      console.error('[ADMIN NOTIFICATION EMAIL ERROR]', emailErr);
    }

    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get my support tickets
// @route   GET /api/v1/support/tickets
// @access  Private
export const getMyTickets = async (req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user.id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: tickets });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get support ticket by ID
// @route   GET /api/v1/support/tickets/:id
// @access  Private
export const getTicketById = async (req, res) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found or unauthorized' });
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Customer sends reply message
// @route   POST /api/v1/support/tickets/:id/messages
// @access  Private
export const addCustomerMessage = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found or unauthorized' });
    }

    const message = await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: req.user.id,
        senderRole: req.user.role,
        senderName: req.user.name,
        content
      }
    });

    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: 'WAITING_SUPPORT' }
    });

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Submit customer satisfaction rating
// @route   POST /api/v1/support/tickets/:id/rating
// @access  Private
export const submitRating = async (req, res) => {
  try {
    const { rating, ratingNote } = req.body;
    const ticketId = req.params.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be an integer between 1 and 5' });
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, userId: req.user.id }
    });

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found or unauthorized' });
    }

    if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
      return res.status(400).json({ success: false, error: 'Feedback can only be submitted for resolved or closed tickets' });
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        rating: parseInt(rating),
        ratingNote: ratingNote || null,
        ratedAt: new Date()
      }
    });

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// ── ADMIN PORTAL ENDPOINTS ──

// @desc    Get all tickets (Admin Support Center)
// @route   GET /api/v1/admin/support/tickets
// @access  Private/Admin
export const getAllTickets = async (req, res) => {
  try {
    const { status, priority, category } = req.query;

    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        messages: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.status(200).json({ success: true, data: tickets });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get ticket by ID for admin
// @route   GET /api/v1/admin/support/tickets/:id
// @access  Private/Admin
export const getAdminTicketById = async (req, res) => {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { name: true, email: true } },
        messages: { orderBy: { createdAt: 'asc' } },
        notes: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Admin reply to ticket
// @route   POST /api/v1/admin/support/tickets/:id/reply
// @access  Private/Admin
export const adminReply = async (req, res) => {
  try {
    const { content, status } = req.body;
    const ticketId = req.params.id;

    if (!content) {
      return res.status(400).json({ success: false, error: 'Reply content is required' });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { user: true }
    });

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const message = await prisma.supportMessage.create({
      data: {
        ticketId,
        senderId: req.user.id,
        senderRole: req.user.role,
        senderName: req.user.name,
        content
      }
    });

    const targetStatus = status || 'WAITING_CUSTOMER';

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: targetStatus }
    });

    // Send email notification to user
    try {
      if (ticket.user && ticket.user.email) {
        await sendAdminReplyEmail(ticket.user.email, ticket.user.name, ticketId);
      }
    } catch (emailErr) {
      console.error('[CUSTOMER NOTIFICATION EMAIL ERROR]', emailErr);
    }

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Update ticket status
// @route   PATCH /api/v1/admin/support/tickets/:id/status
// @access  Private/Admin
export const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ticketId = req.params.id;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { user: true }
    });

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status }
    });

    // If status updated to RESOLVED, send satisfaction survey request email
    if (status === 'RESOLVED') {
      try {
        if (ticket.user && ticket.user.email) {
          await sendRatingRequestEmail(ticket.user.email, ticket.user.name, ticketId);
        }
      } catch (ratingEmailErr) {
        console.error('[RATING REQUEST EMAIL ERROR]', ratingEmailErr);
      }
    }

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Add internal private staff note
// @route   POST /api/v1/admin/support/tickets/:id/notes
// @access  Private/Admin
export const addInternalNote = async (req, res) => {
  try {
    const { content } = req.body;
    const ticketId = req.params.id;

    if (!content) {
      return res.status(400).json({ success: false, error: 'Note content is required' });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const note = await prisma.supportNote.create({
      data: {
        ticketId,
        authorId: req.user.id,
        authorName: req.user.name,
        content
      }
    });

    res.status(201).json({ success: true, data: note });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get suggested replies for a ticket via Gemini
// @route   POST /api/v1/admin/support/tickets/:id/suggest-replies
// @access  Private/Admin
export const getSuggestedReplies = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const chatHistory = ticket.messages.map(m => `${m.senderRole}: ${m.content}`).join('\n');
    const suggestions = await generateSuggestedReplies(ticket.user.name, ticket.category, chatHistory);
    res.status(200).json({ success: true, data: suggestions });
  } catch (err) {
    console.error('[SUGGESTED REPLIES ERROR]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
