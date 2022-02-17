import type { IAbstractMicroserviceParams } from '@lomray/microservice-nodejs-lib';
import { MiddlewareEntity } from '@entities/server-params';

interface IRemoteMiddlewareServerParams {
  logDriver: IAbstractMicroserviceParams['logDriver'];
}

interface IMiddlewareRepository {
  find(params: Partial<MiddlewareEntity>): Promise<MiddlewareEntity[]>;
  findOne(params: Partial<MiddlewareEntity>): Promise<MiddlewareEntity | undefined>;
  create(params: Omit<MiddlewareEntity, 'id'>): MiddlewareEntity;
  save(entity: MiddlewareEntity): Promise<MiddlewareEntity>;
  remove(entity: MiddlewareEntity): Promise<MiddlewareEntity | undefined>;
}

export { IRemoteMiddlewareServerParams, IMiddlewareRepository };
