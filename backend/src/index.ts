import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import ticketRoutes from './routes/ticket.routes';
import { globalErrorHandler } from './middleware/error.middleware';

dotenv.config();

// Ensure JWT_SECRET exists
if (!process.env.JWT_SECRET) {
  console.error('CRITICAL ERROR: JWT_SECRET environment variable is missing.');
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 3000;

// Restrict CORS to actual frontend development origin
app.use(cors({
  origin: 'http://localhost:5173'
}));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/tickets', ticketRoutes);

app.get('/', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Ticket Mini Module API', data: null });
});

// Global error handler must be registered last
app.use(globalErrorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

export default app;

