import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { RegisterDTO, LoginDTO, AuthRequest } from '../types';
import prisma from '../config/database';
import { generateToken } from '../utils/jwt';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    console.log('🔵 Register endpoint hit:', req.body);
    try {
      const { email, password, fullName }: RegisterDTO = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists'
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          createdAt: true
        }
      });

      // Generate token
      const token = generateToken({
        id: user.id,
        email: user.email,
        fullName: user.fullName
      });

      res.status(201).json({
        success: true,
        data: {
          user,
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password }: LoginDTO = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate token
      const token = generateToken({
        id: user.id,
        email: user.email,
        fullName: user.fullName
      });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { fullName, avatarUrl } = req.body;

      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: { fullName, avatarUrl },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          updatedAt: true
        }
      });

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
}
