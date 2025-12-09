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

app.use(cors());
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Halo API Documentation'
}));

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

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

const PORT = process.env.PORT || 4000;
connectDB().then(() =>
  app.listen(PORT, () => console.log(`Halo API running on :${PORT}`))
);
