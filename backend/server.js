const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Security & Middleware
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Schema
const KudosSchema = new mongoose.Schema({
  to: { type: String, required: true, trim: true, maxlength: 100 },
  from: { type: String, required: true, trim: true, maxlength: 100 },
  headline: { type: String, trim: true, maxlength: 200 },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now }
});

const Kudos = mongoose.model('Kudos', KudosSchema);

// MongoDB Connection with retry
const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://database:27017/kudosboard';
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await mongoose.connect(mongoUri, {
        connectTimeoutMS: 10000,
        serverSelectionTimeoutMS: 5000,
      });
      console.log('✅ MongoDB Connected');
      return;
    } catch (err) {
      retries++;
      console.error(`❌ MongoDB Connection Error (Attempt ${retries}/${maxRetries}):`, err.message);
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  console.error('❌ Failed to connect to MongoDB after retries');
  process.exit(1);
};

connectDB();

// Routes
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({ 
    status: 'healthy',
    database: dbStatus 
  });
});

app.get('/api/kudos', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    const cards = await Kudos.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Kudos.countDocuments();

    res.json({ data: cards, pagination: { page, limit, total } });
  } catch (err) {
    console.error('GET /api/kudos error:', err);
    res.status(500).json({ error: 'Failed to fetch kudos' });
  }
});

app.post('/api/kudos', async (req, res) => {
  const { to, from, headline, message } = req.body;

  // Validation
  if (!to?.trim() || !from?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Missing required fields: to, from, message' });
  }
  if (message.length > 500) {
    return res.status(400).json({ error: 'Message cannot exceed 500 characters' });
  }

  try {
    const newCard = new Kudos({ to, from, headline, message });
    await newCard.save();
    res.status(201).json(newCard);
  } catch (err) {
    console.error('POST /api/kudos error:', err);
    res.status(400).json({ error: err.message.includes('validation') ? err.message : 'Failed to create kudos' });
  }
});

app.delete('/api/kudos/:id', async (req, res) => {
  if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  try {
    const result = await Kudos.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Kudos not found' });
    }
    res.json({ message: 'Deleted successfully', id: req.params.id });
  } catch (err) {
    console.error('DELETE /api/kudos error:', err);
    res.status(500).json({ error: 'Failed to delete kudos' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await mongoose.connection.close();
    console.log('Server closed');
    process.exit(0);
  });
});
