import { MiddlewareType } from '@lomray/microservice-nodejs-lib';
import { MiddlewareEntity } from '@entities/server-params';
import type { IRemoteMiddlewareReqParams } from '@interfaces/i-remote-middleware-client';

/**
 * Mock implementation of middleware
 */
class MiddlewareMock implements MiddlewareEntity {
  id: number;
  sender: string;
  senderMethod: string;
  target: string;
  targetMethod: string;
  type: MiddlewareType;
  params: IRemoteMiddlewareReqParams;

  constructor(params?: Partial<MiddlewareEntity>) {
    Object.assign(this, params);
  }
}

export default MiddlewareMock;
