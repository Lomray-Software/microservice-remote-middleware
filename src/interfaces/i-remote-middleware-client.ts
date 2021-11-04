import type {
  IAbstractMicroserviceParams,
  IInnerRequestParams,
  MiddlewareType,
} from '@lomray/microservice-nodejs-lib';

interface IRemoteMiddlewareParams {
  logDriver: IAbstractMicroserviceParams['logDriver'];
  configurationMsName: string;
}

interface IRemoteMiddlewareReqParams {
  type?: MiddlewareType;
  isRequired?: boolean;
  reqParams?: IInnerRequestParams;
}

enum RemoteMiddlewareActionType {
  ADD = 'ADD',
  REMOVE = 'REMOVE',
}

interface IRemoteMiddlewareEndpointParams {
  action: RemoteMiddlewareActionType;
  method: string;
  target?: string;
  targetMethod?: string;
  options?: IRemoteMiddlewareReqParams;
}

interface IRemoteMiddlewareRequest {
  status: string;
  headers: string;
  query: string;
  params: string;
  statusCode: string;
  statusText: string;
  httpVersion: string;
}

interface IMiddlewareEntity {
  id: number | string;
  sender: string;
  senderMethod: string;
  target: string;
  targetMethod: string;
  type: MiddlewareType;
  params: IRemoteMiddlewareReqParams;
}

export {
  IRemoteMiddlewareParams,
  IRemoteMiddlewareReqParams,
  IRemoteMiddlewareEndpointParams,
  RemoteMiddlewareActionType,
  IRemoteMiddlewareRequest,
  IMiddlewareEntity,
};
