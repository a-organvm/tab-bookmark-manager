const {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ServiceUnavailableError,
  DatabaseError,
  asyncHandler,
  isOperationalError,
} = require('../utils/errors');

describe('AppError', () => {
  it('sets message and statusCode', () => {
    const err = new AppError('Something failed', 500);
    expect(err.message).toBe('Something failed');
    expect(err.statusCode).toBe(500);
  });

  it('defaults isOperational to true', () => {
    const err = new AppError('Oops', 400);
    expect(err.isOperational).toBe(true);
  });

  it('allows isOperational to be set to false', () => {
    const err = new AppError('Fatal', 500, false);
    expect(err.isOperational).toBe(false);
  });

  it('sets timestamp', () => {
    const before = new Date().toISOString();
    const err = new AppError('Test', 400);
    const after = new Date().toISOString();
    expect(err.timestamp >= before).toBe(true);
    expect(err.timestamp <= after).toBe(true);
  });

  it('is an instance of Error', () => {
    const err = new AppError('Test', 500);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('captures stack trace', () => {
    const err = new AppError('Stack', 500);
    expect(err.stack).toBeDefined();
  });
});

describe('ValidationError', () => {
  it('has statusCode 400', () => {
    const err = new ValidationError('Invalid email');
    expect(err.statusCode).toBe(400);
    expect(err.name).toBe('ValidationError');
    expect(err.message).toBe('Invalid email');
  });

  it('is an instance of AppError', () => {
    expect(new ValidationError('Test')).toBeInstanceOf(AppError);
  });
});

describe('NotFoundError', () => {
  it('has statusCode 404 with default message', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Resource not found');
  });

  it('uses custom resource name', () => {
    const err = new NotFoundError('User');
    expect(err.message).toBe('User not found');
    expect(err.name).toBe('NotFoundError');
  });
});

describe('UnauthorizedError', () => {
  it('has statusCode 401 with default message', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Unauthorized access');
  });

  it('accepts custom message', () => {
    const err = new UnauthorizedError('Token expired');
    expect(err.message).toBe('Token expired');
  });
});

describe('ForbiddenError', () => {
  it('has statusCode 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Access forbidden');
  });
});

describe('ConflictError', () => {
  it('has statusCode 409', () => {
    const err = new ConflictError('Email already exists');
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('Email already exists');
  });
});

describe('ServiceUnavailableError', () => {
  it('has statusCode 503', () => {
    const err = new ServiceUnavailableError('ML Service');
    expect(err.statusCode).toBe(503);
    expect(err.message).toBe('ML Service is currently unavailable');
  });
});

describe('DatabaseError', () => {
  it('has statusCode 500 with default message', () => {
    const err = new DatabaseError();
    expect(err.statusCode).toBe(500);
    expect(err.message).toBe('Database operation failed');
  });

  it('accepts custom message', () => {
    const err = new DatabaseError('Connection timeout');
    expect(err.message).toBe('Connection timeout');
  });
});

describe('asyncHandler', () => {
  it('calls the wrapped function with req, res, next', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const wrapped = asyncHandler(fn);
    const req = {};
    const res = {};
    const next = jest.fn();

    await wrapped(req, res, next);

    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  it('catches rejected promises and passes to next', async () => {
    const error = new Error('Async boom');
    const fn = jest.fn().mockRejectedValue(error);
    const wrapped = asyncHandler(fn);
    const next = jest.fn();

    await wrapped({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('handles functions that return rejected promises', async () => {
    const error = new Error('Async rejection');
    const fn = jest.fn().mockImplementation(async () => { throw error; });
    const wrapped = asyncHandler(fn);
    const next = jest.fn();

    await wrapped({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('isOperationalError', () => {
  it('returns true for AppError with isOperational true', () => {
    const err = new AppError('Op error', 400, true);
    expect(isOperationalError(err)).toBe(true);
  });

  it('returns false for AppError with isOperational false', () => {
    const err = new AppError('Fatal', 500, false);
    expect(isOperationalError(err)).toBe(false);
  });

  it('returns true for subclassed errors', () => {
    expect(isOperationalError(new ValidationError('Bad'))).toBe(true);
    expect(isOperationalError(new NotFoundError())).toBe(true);
    expect(isOperationalError(new UnauthorizedError())).toBe(true);
    expect(isOperationalError(new ForbiddenError())).toBe(true);
    expect(isOperationalError(new ConflictError('dup'))).toBe(true);
    expect(isOperationalError(new ServiceUnavailableError('svc'))).toBe(true);
    expect(isOperationalError(new DatabaseError())).toBe(true);
  });

  it('returns false for plain Error', () => {
    expect(isOperationalError(new Error('oops'))).toBe(false);
  });

  it('returns false for non-error objects', () => {
    expect(isOperationalError('string')).toBe(false);
    expect(isOperationalError(null)).toBe(false);
    expect(isOperationalError(undefined)).toBe(false);
  });
});
