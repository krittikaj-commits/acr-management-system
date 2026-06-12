import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { RedisService } from '../redis/redis.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

/**
 * NotificationGateway — WebSocket gateway for real-time notification push.
 *
 * - Namespace: /notifications
 * - Auth: JWT Bearer token verified during handshake
 * - Each user joins a room named after their userId for targeted push
 * - Redis pub/sub integration for horizontal scaling
 */
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*',
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private readonly connectedUsers = new Map<string, string>(); // socketId → userId

  constructor(private readonly redisService: RedisService) {}

  /**
   * Called after module init — subscribe to Redis pub/sub channels.
   * Uses a dedicated subscriber Redis client.
   */
  async onModuleInit(): Promise<void> {
    await this.subscribeToRedisNotifications();
  }

  /**
   * Handle new WebSocket connection.
   * Verifies JWT from handshake auth, joins user to their room.
   * Rejects connection if JWT is missing or invalid.
   */
  handleConnection(client: Socket): void {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Connection rejected: no token provided (socket: ${client.id})`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect(true);
        return;
      }

      const payload = this.verifyToken(token);
      if (!payload) {
        this.logger.warn(`Connection rejected: invalid token (socket: ${client.id})`);
        client.emit('error', { message: 'Invalid token' });
        client.disconnect(true);
        return;
      }

      // Store connection mapping
      this.connectedUsers.set(client.id, payload.sub);

      // Join user-specific room for targeted notifications
      client.join(`user:${payload.sub}`);

      // Join role-based room for broadcast-to-role
      client.join(`role:${payload.role}`);

      // Attach user data to socket for later use
      (client as any).userId = payload.sub;
      (client as any).userRole = payload.role;

      this.logger.log(`Client connected: ${payload.sub} (socket: ${client.id})`);
    } catch (error) {
      this.logger.error(`Connection error: ${(error as Error).message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect(true);
    }
  }

  /**
   * Handle WebSocket disconnection. Cleans up connection tracking.
   */
  handleDisconnect(client: Socket): void {
    const userId = this.connectedUsers.get(client.id);
    this.connectedUsers.delete(client.id);

    if (userId) {
      this.logger.log(`Client disconnected: ${userId} (socket: ${client.id})`);
    }
  }

  /**
   * Push a notification to a specific user's room via Socket.io.
   */
  pushNotification(userId: string, notification: any): void {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
    this.logger.debug(`Pushed notification to user:${userId}`);
  }

  /**
   * Broadcast a notification to all users with a specific role.
   */
  broadcastToRole(role: string, notification: any): void {
    this.server.to(`role:${role}`).emit('notification:new', notification);
    this.logger.debug(`Broadcast notification to role:${role}`);
  }

  /**
   * Get the number of currently connected users.
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Extract Bearer token from socket handshake.
   * Supports both `auth.token` and `Authorization` header.
   */
  private extractToken(client: Socket): string | null {
    // Check auth object first (Socket.io client auth option)
    const authToken = client.handshake?.auth?.token;
    if (authToken) {
      return authToken.replace(/^Bearer\s+/i, '');
    }

    // Fallback to Authorization header
    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader) {
      return authHeader.replace(/^Bearer\s+/i, '');
    }

    return null;
  }

  /**
   * Verify JWT token and return payload, or null if invalid.
   */
  private verifyToken(token: string): JwtPayload | null {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        this.logger.error('JWT_SECRET not configured');
        return null;
      }
      return jwt.verify(token, secret) as JwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * Subscribe to Redis pub/sub for notification channels.
   * Pattern: notifications:* — receives all user notification publishes.
   */
  private async subscribeToRedisNotifications(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      // Create a duplicate connection for subscribing (ioredis requirement)
      const subscriber = client.duplicate();

      await subscriber.psubscribe('notifications:*');

      subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
        // Channel format: notifications:{userId}
        const userId = channel.replace('notifications:', '');
        try {
          const notification = JSON.parse(message);
          this.pushNotification(userId, notification);
        } catch (error) {
          this.logger.error(`Failed to parse Redis notification: ${(error as Error).message}`);
        }
      });

      this.logger.log('Subscribed to Redis notifications:* channel');
    } catch (error) {
      this.logger.error(`Failed to subscribe to Redis: ${(error as Error).message}`);
      // Graceful degradation — gateway still works for direct pushNotification calls
    }
  }
}
