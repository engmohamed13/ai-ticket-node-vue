import { Request, Response } from 'express';
import { globalErrorHandler } from '../middleware/error.middleware';
import { AppError } from '../utils/AppError';

const createMockResponse = (): Response => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return res as Response;
};

describe('globalErrorHandler', () => {
  it('responds with the AppError status, message, and details', () => {
    const res = createMockResponse();
    const err = new AppError(400, 'Bad thing', [{ path: 'body.x' }]);

    globalErrorHandler(err, {} as Request, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Bad thing',
      data: null,
      details: [{ path: 'body.x' }]
    });
  });

  it('masks unhandled errors as a 500 with no details', () => {
    const res = createMockResponse();
    const err = new Error('boom');

    globalErrorHandler(err, {} as Request, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('Internal server error');
    expect(payload).not.toHaveProperty('details');
  });
});
