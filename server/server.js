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
      'http://127.0.0.1:5173'
    ],
    methods: ['GET', 'POST']
  }
});

// Setup Socket.io events
io.on('connection', (socket) => {
  console.log(`[SOCKET_CONNECTED] User: ${socket.id}`);

  socket.on('join_rescue_room', (reportId) => {
    socket.join(`rescue_${reportId}`);
    console.log(`[SOCKET] User ${socket.id} joined rescue_${reportId}`);
  });

  socket.on('leave_rescue_room', (reportId) => {
    socket.leave(`rescue_${reportId}`);
    console.log(`[SOCKET] User ${socket.id} left rescue_${reportId}`);
  });

  socket.on('send_rescue_message', async (data) => {
    try {
      // data: { reportId, senderId, content }
      const RescueMessage = require('./models/RescueMessage');
      const User = require('./models/User');
      
      const newMessage = await RescueMessage.create({
        report_id: data.reportId,
        sender: data.senderId,
        content: data.content
      });

      const populatedMessage = await RescueMessage.findById(newMessage._id).populate('sender', 'name profile_image_url role hero_level');

      io.to(`rescue_${data.reportId}`).emit('receive_rescue_message', populatedMessage);
    } catch (error) {
      console.error('[SOCKET_ERROR] Failed to save/send message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET_DISCONNECTED] User: ${socket.id}`);
  });
});

// CORS must come BEFORE helmet so preflight OPTIONS requests aren't blocked
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://127.0.0.1:5173'
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
