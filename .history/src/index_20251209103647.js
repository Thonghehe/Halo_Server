import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger.js';
import { connectDB } from './config/db.js';
import authRoute from './routes/auth.js';
import adminRoute from './routes/admin.js';
import ordersRoute from './routes/orders.js';
import uploadRoute from './routes/upload.js';
import notificationsRoute from './routes/notifications.js';

dotenv.config();

const app = express();

// Trust proxy để lấy IP thực của client khi có reverse proxy (Nginx)
app.set('trust proxy', true);

// CORS configuration - cho phép tất cả origins để test
const corsOptions = {
  origin: true, // Cho phép tất cả origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Debug middleware để log tất cả requests
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Original: ${req.originalUrl}`);
    console.log(`  Headers:`, {
      'content-type': req.headers['content-type'],
      'origin': req.headers['origin'],
      'authorization': req.headers['authorization'] ? 'present' : 'missing'
    });
    console.log(`  Body:`, req.body);
  }
  next();
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Halo API Documentation'
}));

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Halo API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      orders: '/api/orders',
      upload: '/api/upload',
      notifications: '/api/notifications',
      docs: '/api-docs',
      health: '/health'
    },
    documentation: 'https://api.halocrms.io.vn/api-docs'
  });
});

// Test route để kiểm tra routing
app.all('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test route works!',
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl
  });
});

// API Routes (upload route phải được đăng ký trước để handle GET requests)
app.use('/api/auth', authRoute);
app.use('/api/admin', adminRoute);
app.use('/api/orders', ordersRoute);
app.use('/api/upload', uploadRoute);
app.use('/api/notifications', notificationsRoute);

// Serve static files cho uploads (fallback nếu route GET không match)
app.use('/api/upload/paintings', express.static(path.join(process.cwd(), 'uploads/paintings')));
app.use('/api/upload/deposits', express.static(path.join(process.cwd(), 'uploads/deposits')));
app.use('/api/upload/files', express.static(path.join(process.cwd(), 'uploads/files')));
app.use('/api/upload/payment-bills', express.static(path.join(process.cwd(), 'uploads/payment-bills')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Halo API is running' });
});

// 404 handler for API routes - phải đặt cuối cùng, sau tất cả routes
app.use((req, res, next) => {
  // Chỉ xử lý các routes bắt đầu với /api
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: 'API endpoint not found',
      path: req.path,
      method: req.method,
      originalUrl: req.originalUrl,
      availableEndpoints: {
        auth: [
          'POST /api/auth/login',
          'POST /api/auth/register',
          'POST /api/auth/logout',
          'GET /api/auth/me',
          'PUT /api/auth/me',
          'POST /api/auth/change-password',
          'POST /api/auth/forgot-password',
          'POST /api/auth/verify-reset-otp',
          'POST /api/auth/reset-password'
        ],
        orders: [
          'GET /api/orders',
          'GET /api/orders/:id',
          'POST /api/orders',
          'PATCH /api/orders/:id',
          'DELETE /api/orders/:id'
        ],
        docs: 'GET /api-docs'
      }
    });
  }
  // Nếu không phải /api route, tiếp tục với 404 mặc định
  next();
});

const PORT = process.env.PORT || 4000;
connectDB().then(() =>
  app.listen(PORT, () => console.log(`Halo API running on :${PORT}`))
);
