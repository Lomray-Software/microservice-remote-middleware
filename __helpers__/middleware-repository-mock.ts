/* eslint-disable @typescript-eslint/no-unused-vars */
import { MiddlewareEntity } from '@entities/server-params';
import type { IMiddlewareRepository } from '@interfaces/i-remote-middleware-server';
import MiddlewareMock from './middleware-mock';

/**
 * Mock implementation of middleware repository
 */
class MiddlewareRepositoryMock implements IMiddlewareRepository {
  find(params: Parameters<IMiddlewareRepository['find']>[0]): Promise<MiddlewareEntity[]> {
    return Promise.resolve([]);
  }

  create(params: Omit<MiddlewareEntity, 'id'>): MiddlewareEntity {
    return new MiddlewareMock(params);
  }

  findOne(params: Partial<MiddlewareEntity>): Promise<MiddlewareEntity | undefined> {
    return Promise.resolve(undefined);
  }

  remove(entity: MiddlewareEntity): Promise<MiddlewareEntity | undefined> {
    return Promise.resolve(undefined);
  }

  save(entity: MiddlewareEntity): Promise<MiddlewareEntity> {
    return Promise.resolve(new MiddlewareMock());
  }
}

export default MiddlewareRepositoryMock;
