import type { LogDriverType } from '@lomray/microservice-nodejs-lib';
import {
  AbstractMicroservice,
  ConsoleLogDriver,
  MicroserviceResponse,
  MiddlewareType,
} from '@lomray/microservice-nodejs-lib';
import axios from 'axios';
import type {
  IRemoteMiddlewareEndpointParams,
  IRemoteMiddlewareReqParams,
} from '@interfaces/i-remote-middleware-client';
import { RemoteMiddlewareActionType } from '@interfaces/i-remote-middleware-client';
import type {
  IRemoteMiddlewareEndpointParamsServer,
  IRemoteMiddlewareServerParams,
  IMiddlewareRepository,
} from '@interfaces/i-remote-middleware-server';

/**
 * Service for manage remote middleware
 */
class RemoteMiddlewareServer {
  /**
   * @type {RemoteMiddlewareServer}
   * @private
   */
  private static instance: RemoteMiddlewareServer;

  /**
   * Service instance
   * @private
   */
  private microservice: AbstractMicroservice;

  /**
   * Repository for store middlewares
   * @private
   */
  private readonly repository: IMiddlewareRepository;

  /**
   * Service log driver
   * @private
   */
  private readonly logDriver: LogDriverType = ConsoleLogDriver;

  /**
   * Register remote endpoint name
   * @private
   */
  private readonly registerEndpoint: string = 'middleware-register';

  /**
   * Obtain remote endpoint name
   * @private
   */
  private readonly obtainEndpoint: string = 'middleware-obtain';

  /**
   * @constructor
   * @private
   */
  private constructor(
    microservice: AbstractMicroservice,
    repository: IMiddlewareRepository,
    params: Partial<IRemoteMiddlewareServerParams>,
  ) {
    this.microservice = microservice;
    this.repository = repository;

    const { logDriver } = params;

    // Change log driver
    if (logDriver !== undefined && logDriver !== true) {
      // Set custom log driver or disable logging
      this.logDriver = logDriver === false ? () => undefined : logDriver;
    }

    this.logDriver(() => 'Remote middleware server: service initialized.');
  }

  /**
   * Create remote middleware service
   */
  public static create(
    microservice: AbstractMicroservice,
    repository: IMiddlewareRepository,
    params: Partial<IRemoteMiddlewareServerParams> = {},
  ): RemoteMiddlewareServer {
    if (!RemoteMiddlewareServer.instance) {
      RemoteMiddlewareServer.instance = new this(microservice, repository, params);
    }

    return RemoteMiddlewareServer.instance;
  }

  /**
   * Get remote middleware server instance
   */
  public static getInstance(): RemoteMiddlewareServer {
    return RemoteMiddlewareServer.instance;
  }

  /**
   * Add endpoint for register remote middleware
   */
  public addRegisterEndpoint(): RemoteMiddlewareServer {
    this.microservice.addEndpoint<IRemoteMiddlewareEndpointParamsServer>(
      this.registerEndpoint,
      async ({ action, target, targetMethod, method, options }, { sender }) => {
        if (
          !sender ||
          !Object.values(RemoteMiddlewareActionType).includes(action) ||
          !method ||
          !target ||
          !targetMethod
        ) {
          throw new Error('Invalid params for add remote middleware.');
        }

        if (action === RemoteMiddlewareActionType.ADD) {
          await this.add(sender, method, target, targetMethod, options);
        } else {
          await this.remove(sender, method, target, targetMethod, options?.type);
        }

        return { ok: true };
      },
      { isDisableMiddlewares: true, isPrivate: true },
    );

    this.logDriver(() => 'Remote middleware server: register endpoint ready.');

    return this;
  }

  /**
   * Add endpoint for obtain remote middleware
   */
  public addObtainEndpoint(): RemoteMiddlewareServer {
    this.microservice.addEndpoint(
      this.obtainEndpoint,
      (_, { sender }) => this.repository.find({ target: sender }),
      { isDisableMiddlewares: true, isPrivate: true },
    );

    this.logDriver(() => 'Remote middleware server: obtain endpoint ready.');

    return this;
  }

  /**
   * Add remote middleware
   */
  public async add(
    sender: string,
    senderMethod: string,
    target: string,
    targetMethod: string,
    params: IRemoteMiddlewareReqParams = {},
  ): Promise<void> {
    const type = params.type || MiddlewareType.request;

    let entity = await this.repository.findOne({
      sender,
      senderMethod,
      target,
      targetMethod,
      type,
    });

    if (entity) {
      entity.params = params;
    } else {
      entity = this.repository.create({
        sender,
        senderMethod,
        target,
        targetMethod,
        type,
        params,
      });
    }

    await this.repository.save(entity);
    await this.remoteRegister(target, {
      action: RemoteMiddlewareActionType.ADD,
      method: senderMethod,
      targetMethod,
      options: params,
    });
  }

  /**
   * Remove remote middleware
   */
  public async remove(
    sender: string,
    senderMethod: string,
    target: string,
    targetMethod: string,
    type: MiddlewareType = MiddlewareType.request,
  ): Promise<void> {
    const entity = await this.repository.findOne({
      sender,
      senderMethod,
      target,
      targetMethod,
      type,
    });

    if (!entity) {
      return;
    }

    await this.repository.remove(entity);
    await this.remoteRegister(target, {
      action: RemoteMiddlewareActionType.REMOVE,
      method: senderMethod,
      targetMethod,
    });
  }

  /**
   * Register/deregister in remote microservices
   * @private
   */
  private async remoteRegister(
    target: string,
    data: IRemoteMiddlewareEndpointParams,
  ): Promise<void | MicroserviceResponse[]> {
    const ijsonConnection = await this.microservice.getConnection();
    const { data: channels } = await axios.request({ url: `${ijsonConnection}/rpc/details` });
    const msWorkers: number[] =
      channels?.[`${this.microservice.getChannelPrefix()}/${target}`]?.worker_ids ?? [];

    const requests = msWorkers.map((workerId) =>
      this.microservice.sendRequest(`${target}.${this.registerEndpoint}`, data, {
        reqParams: { headers: { 'worker-id': workerId } },
      }),
    );

    return Promise.all(requests).then(() =>
      this.logDriver(
        () => `Remote middleware server: ${data.action} - ${target}.${data.targetMethod ?? ''}`,
      ),
    );
  }
}

export default RemoteMiddlewareServer;
