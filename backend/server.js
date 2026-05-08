import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import Database from './database/database.js';    
import authController from './controllers/authController.js';
import taskController from './controllers/TaskController.js';
import projectController from './controllers/ProjectController.js';
import notificationController from './controllers/NotificationController.js';
import fileController from './controllers/FileController.js';
import ReportsController from './controllers/ReportsController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// 1) Global error handlers — ป้องกัน process ตายจาก unhandled errors
// ============================================================
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(' Unhandled Rejection at:', promise, 'reason:', reason);
  // Log แต่ไม่ crash — ให้ server ทำงานต่อได้
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

let server; 

async function gracefulShutdown(signal) {
  console.log(`\n ${signal} received. Shutting down gracefully...`);
  
  // หยุดรับ request ใหม่
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
    });
  }

  // ปิด database pool
  try {
    await Database.closePool();
  } catch (err) {
    console.error('Error closing DB pool:', err);
  }

  // รอให้ connection ที่ค้างอยู่จบก่อน (max 10 วินาที)
  setTimeout(() => {
    console.log('⚠️ Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// ============================================================
// 2) Database initialization with retry
// ============================================================
async function initializeDatabase(retries = 5, delay = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      Database.initialize();
      await Database.testConnection();
      
      // เช็คว่ามี initializeTables หรือเปล่า
      if (typeof Database.initializeTables === 'function') {
        await Database.initializeTables();
      } else {
        console.log('⚠️ Database.initializeTables not found — skipping table init');
      }
      
      console.log('✅ Database ready');
      return true;
    } catch (error) {
      console.error(`❌ DB init attempt ${attempt}/${retries} failed:`, error.message);
      
      if (attempt < retries) {
        console.log(`⏳ Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5;
      } else {
        console.error('🔴 All DB init attempts failed. Starting server anyway.');
        return false;
      }
    }
  }
}

app.use(helmet());
app.use(cors());

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', async (req, res) => {
  try {
    const pool = Database.getPool();
    const [rows] = await pool.execute('SELECT 1');
    res.json({ 
      success: true, 
      message: 'Server running', 
      database: 'connected',
      uptime: Math.floor(process.uptime()) + 's',
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
    });
  } catch (error) {
    res.status(503).json({ 
      success: false, 
      message: 'Server running but database unavailable',
      database: 'disconnected'
    });
  }
});

app.use('/api/auth', authController);
app.use('/api/tasks', taskController);
app.use('/api/projects', projectController);
app.use('/api/notifications', notificationController);
app.use('/api/files', fileController);
app.use('/api/reports', ReportsController);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
})

// Global error middleware — จับ error ที่หลุดจาก route handlers
app.use((error, req, res, next) => {
  console.error(' Unhandled route error:', error.stack || error);
  
  // ถ้าเป็น DB connection error ให้ตอบ 503
  if (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST') {
    return res.status(503).json({ 
      success: false, 
      message: 'Database temporarily unavailable' 
    });
  }

  res.status(500).json({ 
    success: false, 
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message 
  });
});


async function startServer() {
  await initializeDatabase();

 server = app.listen(PORT, '0.0.0.0', () => { 
  console.log(`Server: http://0.0.0.0:${PORT}`);
    console.log(`ealth: http://localhost:${PORT}/health`);
    console.log('Login: admin / admin123');
  });

// dev
// async function startServer() {
//   await initializeDatabase();

//  server = app.listen(PORT,0.0.0.0,() => { 
//   console.log(`Server: http:0.0.0.0:${PORT}`);
//     console.log(`ealth: http://localhost:${PORT}/health`);
//     console.log('Login: admin / admin123');
//   });


  // ป้องกัน server crash จาก connection error
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use`);
      process.exit(1);
    }
    console.error('Server error:', error);
  });
}

startServer();