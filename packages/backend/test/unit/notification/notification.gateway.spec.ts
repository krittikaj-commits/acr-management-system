import { Test, TestingModule } from '@nestjs/testing';
import { NotificationGateway } from '../../../src/modules/notification/notification.gateway';
import { RedisService } from '../../../src/modules/redis/redis.service';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

describe('NotificationGateway', () => {
  let gateway: NotificationGateway;
  let redisService: jest.Mocked<RedisService>;

  const JWT_SECRET = 'test-secret';
  const mockUserId = 'user-123';
  const mockRole = 'IT_REVIEWER';
  const mockEmail = 'test@dits.co.th';

  // Generate a valid JWT for testing
  const generateValidToken = (payload?: Partial<{ sub: string; email: string; role: string }>) => {
    return jwt.sign(
      {
        sub: payload?.sub ?? mockUserId,
        email: payload?.email ?? mockEmail,
        role: payload?.role ?? mockRole,
      },
      JWT_SECRET,
    );
  };

  // Create a mock Socket
  const createMockSocket = (token?: string): jest.Mocked<Socket> => {
    const mockSocket = {
      id: `socket-${Math.random().toString(36).slice(2)}`,
      handshake: {
        auth: token ? { token } : {},
        headers: {},
      },
      join: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as jest.Mocked<Socket>;
    return mockSocket;
  };

  // Create a mock Server
  const createMockServer = (): jest.Mocked<Server> => {
    const mockTo = jest.fn().mockReturnThis();
    const mockEmit = jest.fn();
    return {
      to: mockTo,
      emit: mockEmit,
    } as unknown as jest.Mocked<Server>;
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = JWT_SECRET;

    const mockRedisClient = {
      duplicate: jest.fn().mockReturnValue({
        psubscribe: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
      }),
    };

    redisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationGateway,
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    gateway = module.get<NotificationGateway>(NotificationGateway);

    // Assign mock server
    const mockServer = createMockServer();
    gateway.server = mockServer;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('handleConnection', () => {
    it('should reject connection without a token', () => {
      const client = createMockSocket();

      gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Authentication required' });
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('should reject connection with an invalid token', () => {
      const client = createMockSocket('invalid-jwt-token');

      gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Invalid token' });
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('should reject connection with an expired token', () => {
      const expiredToken = jwt.sign(
        { sub: mockUserId, email: mockEmail, role: mockRole },
        JWT_SECRET,
        { expiresIn: '-1s' },
      );
      const client = createMockSocket(expiredToken);

      gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Invalid token' });
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('should accept connection with valid JWT and join user room', () => {
      const token = generateValidToken();
      const client = createMockSocket(token);

      gateway.handleConnection(client);

      expect(client.join).toHaveBeenCalledWith(`user:${mockUserId}`);
      expect(client.join).toHaveBeenCalledWith(`role:${mockRole}`);
      expect(client.disconnect).not.toHaveBeenCalled();
      expect((client as any).userId).toBe(mockUserId);
      expect((client as any).userRole).toBe(mockRole);
    });

    it('should accept connection with Bearer prefix in token', () => {
      const token = `Bearer ${generateValidToken()}`;
      const client = createMockSocket(token);

      gateway.handleConnection(client);

      expect(client.join).toHaveBeenCalledWith(`user:${mockUserId}`);
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should accept connection with Authorization header fallback', () => {
      const token = generateValidToken();
      const client = {
        id: 'socket-header-auth',
        handshake: {
          auth: {},
          headers: { authorization: `Bearer ${token}` },
        },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as jest.Mocked<Socket>;

      gateway.handleConnection(client);

      expect(client.join).toHaveBeenCalledWith(`user:${mockUserId}`);
      expect(client.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should clean up connected user on disconnect', () => {
      const token = generateValidToken();
      const client = createMockSocket(token);

      // First connect
      gateway.handleConnection(client);
      expect(gateway.getConnectedUsersCount()).toBe(1);

      // Then disconnect
      gateway.handleDisconnect(client);
      expect(gateway.getConnectedUsersCount()).toBe(0);
    });

    it('should handle disconnect for unknown socket gracefully', () => {
      const client = createMockSocket();
      client.id = 'unknown-socket-id';

      // Should not throw
      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  describe('pushNotification', () => {
    it('should emit notification to correct user room', () => {
      const notification = {
        id: 'notif-1',
        type: 'CR_APPROVED',
        title: 'CR Approved',
        message: 'Your change request has been approved',
      };

      gateway.pushNotification(mockUserId, notification);

      expect(gateway.server.to).toHaveBeenCalledWith(`user:${mockUserId}`);
      // The mock chaining: to() returns this (the server), then emit is called
      expect(gateway.server.emit).toHaveBeenCalledWith('notification:new', notification);
    });

    it('should emit to different user rooms for different users', () => {
      const notification = { id: 'notif-2', type: 'CR_ASSIGNED', title: 'Assigned' };

      gateway.pushNotification('user-A', notification);
      expect(gateway.server.to).toHaveBeenCalledWith('user:user-A');

      gateway.pushNotification('user-B', notification);
      expect(gateway.server.to).toHaveBeenCalledWith('user:user-B');
    });
  });

  describe('broadcastToRole', () => {
    it('should emit notification to role room', () => {
      const notification = {
        id: 'notif-3',
        type: 'CR_SUBMITTED',
        title: 'New CR submitted',
      };

      gateway.broadcastToRole('CALL_CENTER', notification);

      expect(gateway.server.to).toHaveBeenCalledWith('role:CALL_CENTER');
      expect(gateway.server.emit).toHaveBeenCalledWith('notification:new', notification);
    });

    it('should broadcast to different roles', () => {
      const notification = { id: 'notif-4', type: 'SYSTEM', title: 'System update' };

      gateway.broadcastToRole('ADMIN', notification);
      expect(gateway.server.to).toHaveBeenCalledWith('role:ADMIN');

      gateway.broadcastToRole('AUDITOR', notification);
      expect(gateway.server.to).toHaveBeenCalledWith('role:AUDITOR');
    });
  });

  describe('Redis pub/sub integration', () => {
    it('should subscribe to Redis notifications:* pattern on init', async () => {
      const mockSubscriber = {
        psubscribe: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
      };
      const mockClient = {
        duplicate: jest.fn().mockReturnValue(mockSubscriber),
      };
      redisService.getClient.mockReturnValue(mockClient as any);

      await gateway.onModuleInit();

      expect(mockClient.duplicate).toHaveBeenCalled();
      expect(mockSubscriber.psubscribe).toHaveBeenCalledWith('notifications:*');
      expect(mockSubscriber.on).toHaveBeenCalledWith('pmessage', expect.any(Function));
    });

    it('should push notification when Redis message is received', async () => {
      const mockSubscriber = {
        psubscribe: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
      };
      const mockClient = {
        duplicate: jest.fn().mockReturnValue(mockSubscriber),
      };
      redisService.getClient.mockReturnValue(mockClient as any);

      await gateway.onModuleInit();

      // Get the pmessage handler
      const pmessageHandler = mockSubscriber.on.mock.calls.find(
        (call) => call[0] === 'pmessage',
      )?.[1];
      expect(pmessageHandler).toBeDefined();

      const notification = { id: 'notif-redis', type: 'CR_APPROVED', title: 'Approved' };
      const pushSpy = jest.spyOn(gateway, 'pushNotification');

      // Simulate Redis message
      pmessageHandler('notifications:*', `notifications:${mockUserId}`, JSON.stringify(notification));

      expect(pushSpy).toHaveBeenCalledWith(mockUserId, notification);
    });

    it('should handle Redis subscription failure gracefully', async () => {
      const mockClient = {
        duplicate: jest.fn().mockReturnValue({
          psubscribe: jest.fn().mockRejectedValue(new Error('Connection refused')),
          on: jest.fn(),
        }),
      };
      redisService.getClient.mockReturnValue(mockClient as any);

      // Should not throw — graceful degradation
      await expect(gateway.onModuleInit()).resolves.not.toThrow();
    });
  });
});
