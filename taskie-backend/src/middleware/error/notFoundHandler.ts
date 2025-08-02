import { Request, Response } from 'express';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method,
    requestId: req.headers['x-request-id']
  });
}