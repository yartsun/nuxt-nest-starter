import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';

/**
 * Socket.IO namespace `/realtime`. Everyone joins the `catalog` room; a valid
 * access token in the handshake `auth` payload (never the URL) also joins the
 * private `user:<id>` room used for import progress.
 */
@WebSocketGateway({ namespace: 'realtime' })
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private readonly server?: Namespace;

  constructor(private readonly jwt: JwtService) {}

  handleConnection(client: Socket) {
    void client.join('catalog');
    const token = client.handshake.auth?.token;
    if (typeof token === 'string' && token) {
      try {
        const { sub } = this.jwt.verify<{ sub: string }>(token);
        client.data.userId = sub;
        void client.join(`user:${sub}`);
      } catch {
        this.logger.debug(`Socket ${client.id} sent an invalid token; catalog events only`);
      }
    }
    client.emit('session', { authenticated: Boolean(client.data.userId) });
  }

  toCatalog(event: string, payload: unknown) {
    this.server?.to('catalog').emit(event, payload);
  }

  toUser(userId: string, event: string, payload: unknown) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }
}
