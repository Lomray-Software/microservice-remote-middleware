import { MiddlewareType } from '@lomray/microservice-nodejs-lib';
import type {
  IMiddlewareEntity,
  IRemoteMiddlewareReqParams,
} from '@interfaces/i-remote-middleware-client';

/**
 * Mock implementation of middleware
 */
class MiddlewareMock implements IMiddlewareEntity {
  id: number;
  sender: string;
  senderMethod: string;
  target: string;
  targetMethod: string;
  type: MiddlewareType;
  params: IRemoteMiddlewareReqParams;

  constructor(params?: Partial<IMiddlewareEntity>) {
    Object.assign(this, params);
  }
}

export default MiddlewareMock;
