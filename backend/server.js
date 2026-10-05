require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { generalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const pgRoutes = require('./routes/pgs');
const favoriteRoutes = require('./routes/favorites');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const roomRequestRoutes = require('./routes/roomRequests');
const roomRoutes = require('./routes/rooms');
const roomController = require('./controllers/roomController');
const healthController = require('./controllers/healthController');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(generalLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pgs', pgRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/room-requests', roomRequestRoutes);
app.use('/api/rooms', roomRoutes);
app.get('/api/admin/room-requests', require('./middleware/authenticate'), require('./middleware/authorize')('admin'), roomController.adminRequests);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'StayNear API is running' });
});
app.get('/api/ready', healthController.readiness);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`StayNear API running on port ${PORT}`);
});
