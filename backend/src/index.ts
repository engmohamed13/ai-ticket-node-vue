import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import ticketRoutes from './routes/ticket.routes';
import { authenticate } from './middleware/auth.middleware';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/tickets', ticketRoutes);

app.get('/', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Ticket Mini Module API', data: null });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
