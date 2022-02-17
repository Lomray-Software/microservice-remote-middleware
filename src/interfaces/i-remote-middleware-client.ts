import type {
  IAbstractMicroserviceParams,
  IInnerRequestParams,
  MiddlewareType,
} from '@lomray/microservice-nodejs-lib';

enum MiddlewareStrategy {
  /**
   * Merge middleware result/request with microservice result/request and return
   */
  merge = 'merge',
  /**
   * Return only middleware result
   */
  replace = 'replace',
  /**
   * Transform microservice response (combine with middleware response, add extra fields, etc...)
   *  - You can pass request microservice params to middleware method (through 'convertParams')
   *  - You can pass response microservice result to middleware method (through 'convertResult')
   *  @see convertData
   */
  transform = 'transform',
}

enum RemoteMiddlewareActionType {
  ADD = 'ADD',
  REMOVE = 'REMOVE',
}

interface IRemoteMiddlewareParams {
  logDriver: IAbstractMicroserviceParams['logDriver'];
  configurationMsName: string;
}

interface IRemoteMiddlewareReqParams {
  type?: MiddlewareType;
  isRequired?: boolean;
  strategy?: MiddlewareStrategy; // default: same
  convertParams?: Record<string, string>; // you can convert input request data to params middleware method
  convertResult?: Record<string, string>; // you can convert output middleware method data (without replace by default)
  reqParams?: IInnerRequestParams;
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
  MiddlewareStrategy,
};
