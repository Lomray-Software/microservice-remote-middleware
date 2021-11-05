/* eslint-disable @typescript-eslint/no-unused-vars */
import type { IMiddlewareEntity } from '@interfaces/i-remote-middleware-client';
import type { IMiddlewareRepository } from '@interfaces/i-remote-middleware-server';
import MiddlewareMock from './middleware-mock';

/**
 * Mock implementation of middleware repository
 */
class MiddlewareRepositoryMock implements IMiddlewareRepository {
  find(params: Partial<IMiddlewareEntity>): Promise<IMiddlewareEntity[]> {
    return Promise.resolve([]);
  }

  create(params: Omit<IMiddlewareEntity, 'id'>): IMiddlewareEntity {
    return new MiddlewareMock(params);
  }

  findOne(params: Partial<IMiddlewareEntity>): Promise<IMiddlewareEntity | undefined> {
    return Promise.resolve(undefined);
  }

  remove(entity: IMiddlewareEntity): Promise<IMiddlewareEntity | undefined> {
    return Promise.resolve(undefined);
  }

  save(entity: IMiddlewareEntity): Promise<IMiddlewareEntity> {
    return Promise.resolve(new MiddlewareMock());
  }
}

export default MiddlewareRepositoryMock;
