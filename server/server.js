require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const connectDB = require('./config/db');
const { generalLimiter } = require('./middleware/rateLimiter');

// Route imports
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const whatsappRoutes = require('./routes/whatsapp');
const lostFoundRoutes = require('./routes/lostFound');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/adminRoutes');
const messagesRoutes = require('./routes/messagesRoutes');
const rescueMessageRoutes = require('./routes/rescueMessageRoutes');
const notificationRoutes = require('./routes/notifications');
const leaderboardRoutes = require('./routes/leaderboards');
const { startCleanupService } = require('./services/cleanupService');
const { startEscalationService } = require('./services/escalationService');

const app = express();
const httpServer = http.createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://pawmira.in',
      'https://www.pawmira.in'
    ],
    methods: ['GET', 'POST']
  }
});

const jwt = require('jsonwebtoken');
const User = require('./models/User');
const mongoose = require('mongoose');
const Report = require('./models/Report');
const RescueMessage = require('./models/RescueMessage');
const { authenticateSocket } = require('./utils/socketAuth');
const { canAccessRescueChat } = require('./utils/reportAuthorization');
const { validateRescueMessage } = require('./utils/rescueChat');

const acknowledge = (callback, payload) => {
  if (typeof callback === 'function') callback(payload);
};

// Socket.io JWT Authentication Middleware
io.use((socket, next) => authenticateSocket(socket, next, { jwt, User, jwtSecret: process.env.JWT_SECRET }));

// Setup Socket.io events
io.on('connection', (socket) => {
  console.log(`[SOCKET_CONNECTED] socket=${socket.id} userId=${socket.user?._id}`);

  socket.on('join_rescue_room', async (reportId, callback) => {
    try {
      if (!socket.user) return acknowledge(callback, { ok: false, error: 'Authentication required' });
      if (!mongoose.Types.ObjectId.isValid(reportId)) {
        return acknowledge(callback, { ok: false, error: 'Invalid rescue report ID' });
      }

      const report = await Report.findById(reportId);
      if (!report || report.is_deleted) {
        return acknowledge(callback, { ok: false, error: 'Rescue report not found' });
      }

      if (canAccessRescueChat(report, socket.user)) {
        await socket.join(`rescue_${reportId}`);
        console.log(`[SOCKET] socket=${socket.id} joined rescue_${reportId}`);
        acknowledge(callback, { ok: true });
      } else {
        console.warn(`[SOCKET_AUTH] socket=${socket.id} unauthorized join attempt for rescue_${reportId}`);
        acknowledge(callback, { ok: false, error: 'Not authorized to join this rescue chat' });
      }
    } catch (err) {
      console.error('[SOCKET_ERROR] join_rescue_room:', err);
      acknowledge(callback, { ok: false, error: 'Unable to join rescue chat' });
    }
  });

  socket.on('leave_rescue_room', (reportId) => {
    socket.leave(`rescue_${reportId}`);
    console.log(`[SOCKET] socket=${socket.id} left rescue_${reportId}`);
  });

  socket.on('send_rescue_message', async (data = {}, callback) => {
    try {
      if (!socket.user) return acknowledge(callback, { ok: false, error: 'Authentication required' });
      if (!mongoose.Types.ObjectId.isValid(data.reportId)) {
        return acknowledge(callback, { ok: false, error: 'Invalid rescue report ID' });
      }
      const message = validateRescueMessage(data.content);
      if (!message.ok) return acknowledge(callback, message);

      const report = await Report.findById(data.reportId);
      if (!report || report.is_deleted) {
        return acknowledge(callback, { ok: false, error: 'Rescue report not found' });
      }

      if (!canAccessRescueChat(report, socket.user)) {
        console.warn(`[SOCKET_AUTH] socket=${socket.id} unauthorized send attempt to rescue_${data.reportId}`);
        return acknowledge(callback, { ok: false, error: 'Not authorized to send rescue chat messages' });
      }

      const newMessage = await RescueMessage.create({
        report_id: data.reportId,
        sender: socket.user._id, // Always enforced from the authenticated socket.
        content: message.content
      });

      const populatedMessage = await RescueMessage.findById(newMessage._id).populate('sender', 'name profile_image_url role hero_level');

      io.to(`rescue_${data.reportId}`).emit('receive_rescue_message', populatedMessage);
      acknowledge(callback, { ok: true, messageId: newMessage._id.toString() });
    } catch (error) {
      console.error('[SOCKET_ERROR] Failed to save/send message:', error);
      acknowledge(callback, { ok: false, error: 'Unable to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET_DISCONNECTED] socket=${socket.id}`);
  });
});

// CORS must come BEFORE helmet so preflight OPTIONS requests aren't blocked
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://pawmira.in',
    'https://www.pawmira.in'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compress JSON/text API responses. Multipart request bodies are never
// compressed; skipping their responses also keeps the upload path untouched.
app.use(compression({
  filter: (req, res) => {
    if (req.is('multipart/form-data')) return false;
    return compression.filter(req, res);
  }
}));
// Server restart triggered

// Handle preflight for all routes
app.options('*', cors());

// Security middleware
app.use(helmet());

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust proxy is required when deployed behind Render's load balancer
// otherwise rate limiting applies globally to all users
app.set('trust proxy', 1);

// Health check (MUST be before rate limiter so Render health checks don't fail with 429)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rate limiting
app.use('/api', generalLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/lost-found', lostFoundRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/rescue-messages', rescueMessageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/leaderboards', leaderboardRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(`[SERVER_ERROR] ${err.message}`);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

// Start server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER_STARTED] PawMira API & Socket.io running on port ${PORT}`);
    
    // Start automated daily cleanup cron job
    startCleanupService();

    // Start escalation cron job
    startEscalationService();

    // Background job: Inactivity Timeout (runs every minute)
    setInterval(async () => {
      try {
        const Report = require('./models/Report');
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        
        const result = await Report.updateMany(
          { 
            status: 'in_progress', 
            last_activity_at: { $lt: fifteenMinsAgo },
            is_deleted: false 
          },
          { 
            $set: { status: 'inactive' },
            $unset: { primary_responder: "" },
            $push: { 
              history: { status: 'inactive', updated_at: new Date() }
            }
          }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`[INACTIVITY_TIMEOUT] Marked ${result.modifiedCount} reports as inactive.`);
        }
      } catch (error) {
        console.error(`[BACKGROUND_JOB_ERROR] ${error.message}`);
      }
    }, 60000);
  });
});
