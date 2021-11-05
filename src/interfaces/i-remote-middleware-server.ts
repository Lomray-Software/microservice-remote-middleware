import type { IAbstractMicroserviceParams } from '@lomray/microservice-nodejs-lib';
import type {
  IMiddlewareEntity,
  IRemoteMiddlewareReqParams,
  RemoteMiddlewareActionType,
} from '@interfaces/i-remote-middleware-client';

interface IRemoteMiddlewareEndpointParamsServer {
  action: RemoteMiddlewareActionType;
  target: string;
  targetMethod: string;
  method: string;
  options?: IRemoteMiddlewareReqParams;
}

interface IRemoteMiddlewareServerParams {
  logDriver: IAbstractMicroserviceParams['logDriver'];
}

interface IMiddlewareRepository {
  find(params: Partial<IMiddlewareEntity>): Promise<IMiddlewareEntity[]>;
  findOne(params: Partial<IMiddlewareEntity>): Promise<IMiddlewareEntity | undefined>;
  create(params: Omit<IMiddlewareEntity, 'id'>): IMiddlewareEntity;
  save(entity: IMiddlewareEntity): Promise<IMiddlewareEntity>;
  remove(entity: IMiddlewareEntity): Promise<IMiddlewareEntity | undefined>;
}

export {
  IRemoteMiddlewareEndpointParamsServer,
  IRemoteMiddlewareServerParams,
  IMiddlewareRepository,
};
