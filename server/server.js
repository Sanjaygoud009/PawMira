require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
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

// Socket.io JWT Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }
    socket.user = user;
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

// Setup Socket.io events
io.on('connection', (socket) => {
  console.log(`[SOCKET_CONNECTED] User: ${socket.user ? socket.user.name : socket.id}`);

  socket.on('join_rescue_room', (reportId) => {
    socket.join(`rescue_${reportId}`);
    console.log(`[SOCKET] User ${socket.user ? socket.user.name : socket.id} joined rescue_${reportId}`);
  });

  socket.on('leave_rescue_room', (reportId) => {
    socket.leave(`rescue_${reportId}`);
    console.log(`[SOCKET] User ${socket.user ? socket.user.name : socket.id} left rescue_${reportId}`);
  });

  socket.on('send_rescue_message', async (data) => {
    try {
      if (!socket.user) return;
      const RescueMessage = require('./models/RescueMessage');
      
      const newMessage = await RescueMessage.create({
        report_id: data.reportId,
        sender: socket.user._id,
        content: data.content
      });

      const populatedMessage = await RescueMessage.findById(newMessage._id).populate('sender', 'name profile_image_url role hero_level');

      io.to(`rescue_${data.reportId}`).emit('receive_rescue_message', populatedMessage);
    } catch (error) {
      console.error('[SOCKET_ERROR] Failed to save/send message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET_DISCONNECTED] User: ${socket.user ? socket.user.name : socket.id}`);
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
