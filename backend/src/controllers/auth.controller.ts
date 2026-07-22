import { Request, Response } from 'express';
import { authService } from '../services/auth.service';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
        return;
      }

      const token = await authService.login(email, password);

      if (!token) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export const authController = new AuthController();
