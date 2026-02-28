jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

const { errorHandler, notFoundHandler } = require('../middleware/errorHandler');
const { AppError, ValidationError, NotFoundError } = require('../utils/errors');

function mockReqResNext() {
  const req = {
    method: 'GET',
    url: '/test',
    originalUrl: '/test',
    user: null,
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('errorHandler', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('handles AppError with correct status', () => {
    const { req, res, next } = mockReqResNext();
    const err = new AppError('Bad request', 400);

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Bad request',
      })
    );
  });

  it('defaults to 500 for plain errors', () => {
    const { req, res, next } = mockReqResNext();
    const err = new Error('Unknown');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('handles ValidationError', () => {
    const { req, res, next } = mockReqResNext();
    const err = new ValidationError('Invalid input');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid input' })
    );
  });

  it('handles NotFoundError', () => {
    const { req, res, next } = mockReqResNext();
    const err = new NotFoundError('Bookmark');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Bookmark not found' })
    );
  });

  it('includes stack trace in development', () => {
    process.env.NODE_ENV = 'development';
    const { req, res, next } = mockReqResNext();
    const err = new Error('Dev error');

    errorHandler(err, req, res, next);

    const body = res.json.mock.calls[0][0];
    expect(body.stack).toBeDefined();
  });

  it('excludes stack trace in production', () => {
    process.env.NODE_ENV = 'production';
    const { req, res, next } = mockReqResNext();
    const err = new Error('Prod error');

    errorHandler(err, req, res, next);

    const body = res.json.mock.calls[0][0];
    expect(body.stack).toBeUndefined();
  });

  it('includes error details when present', () => {
    const { req, res, next } = mockReqResNext();
    const err = new AppError('Bad input', 400);
    err.details = { field: 'email', reason: 'invalid format' };

    errorHandler(err, req, res, next);

    const body = res.json.mock.calls[0][0];
    expect(body.details).toEqual({ field: 'email', reason: 'invalid format' });
  });

  it('includes timestamp in response', () => {
    const { req, res, next } = mockReqResNext();
    const err = new Error('Test');

    errorHandler(err, req, res, next);

    const body = res.json.mock.calls[0][0];
    expect(body.timestamp).toBeDefined();
  });
});

describe('notFoundHandler', () => {
  it('creates 404 error and passes to next', () => {
    const { req, res, next } = mockReqResNext();
    req.originalUrl = '/api/v1/nonexistent';

    notFoundHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Route not found: /api/v1/nonexistent',
      })
    );
  });
});
