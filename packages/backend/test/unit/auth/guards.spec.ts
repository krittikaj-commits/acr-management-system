import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { JwtAuthGuard } from '../../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/common/guards/roles.guard';

const TEST_SECRET = 'test-jwt-secret-for-guards';

function createMockExecutionContext(overrides: {
  headers?: Record<string, string>;
  user?: Record<string, unknown>;
} = {}): ExecutionContext {
  const request = {
    headers: overrides.headers ?? {},
    user: overrides.user ?? undefined,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

function generateValidToken(payload: { sub: string; email: string; role: string }): string {
  return jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });
}

function generateExpiredToken(payload: { sub: string; email: string; role: string }): string {
  return jwt.sign(payload, TEST_SECRET, { expiresIn: '-1s' });
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should allow a valid token and attach user to request', () => {
    const token = generateValidToken({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'admin',
    });

    const context = createMockExecutionContext({
      headers: { authorization: `Bearer ${token}` },
    });

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    const request = context.switchToHttp().getRequest() as { user: { sub: string; email: string; role: string } };
    expect(request.user).toBeDefined();
    expect(request.user.sub).toBe('user-1');
    expect(request.user.email).toBe('user@example.com');
    expect(request.user.role).toBe('admin');
  });

  it('should reject a request with no token', () => {
    const context = createMockExecutionContext({ headers: {} });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow('Missing authentication token');
  });

  it('should reject an expired token', () => {
    const token = generateExpiredToken({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'admin',
    });

    const context = createMockExecutionContext({
      headers: { authorization: `Bearer ${token}` },
    });

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow('Token has expired');
  });

  it('should allow @Public() routes without a token', () => {
    const context = createMockExecutionContext({ headers: {} });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should reject a token signed with wrong secret', () => {
    const token = jwt.sign(
      { sub: 'user-1', email: 'user@example.com', role: 'admin' },
      'wrong-secret',
      { expiresIn: '1h' },
    );

    const context = createMockExecutionContext({
      headers: { authorization: `Bearer ${token}` },
    });

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow('Invalid token');
  });

  it('should reject if Authorization header has no Bearer prefix', () => {
    const token = generateValidToken({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'admin',
    });

    const context = createMockExecutionContext({
      headers: { authorization: `Basic ${token}` },
    });

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow('Missing authentication token');
  });
});

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow a user with a matching role', () => {
    const context = createMockExecutionContext({
      user: { sub: 'user-1', email: 'user@example.com', role: 'admin' },
    });

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'auditor']);

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should deny a user with a non-matching role', () => {
    const context = createMockExecutionContext({
      user: { sub: 'user-1', email: 'user@example.com', role: 'requester' },
    });

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'auditor']);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Access denied: insufficient role');
  });

  it('should allow if no @Roles() decorator is set', () => {
    const context = createMockExecutionContext({
      user: { sub: 'user-1', email: 'user@example.com', role: 'requester' },
    });

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow if @Roles() is set to empty array', () => {
    const context = createMockExecutionContext({
      user: { sub: 'user-1', email: 'user@example.com', role: 'requester' },
    });

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should deny if user has no role property', () => {
    const context = createMockExecutionContext({
      user: { sub: 'user-1', email: 'user@example.com' },
    });

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
