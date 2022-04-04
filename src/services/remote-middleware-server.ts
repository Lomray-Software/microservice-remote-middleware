import type { LogDriverType } from '@lomray/microservice-nodejs-lib';
import {
  AbstractMicroservice,
  BaseException,
  ConsoleLogDriver,
  IEndpointHandler,
  MiddlewareType,
} from '@lomray/microservice-nodejs-lib';
import { validate } from 'class-validator';
import {
  MiddlewareEntity,
  ServerObtainMiddlewareOutput,
  ServerRegisterMiddlewareInput,
  ServerRegisterMiddlewareOutput,
} from '@entities/server-params';
import withMeta from '@helpers/with-meta';
import type { IRemoteMiddlewareReqParams } from '@interfaces/i-remote-middleware-client';
import { RemoteMiddlewareActionType } from '@interfaces/i-remote-middleware-client';
import type {
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
  private readonly logDriver: LogDriverType = ConsoleLogDriver();

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
   * Endpoint for adding remote middleware
   */
  public addRegisterEndpoint(): RemoteMiddlewareServer {
    const handler: IEndpointHandler<
      ServerRegisterMiddlewareInput,
      never,
      ServerRegisterMiddlewareOutput
    > = withMeta(
      async (reqParams, { sender: reqSender }) => {
        const {
          action,
          target,
          targetMethod,
          sender = reqSender,
          senderMethod,
          order,
          params,
        } = reqParams;
        const errors = await validate(
          Object.assign(new ServerRegisterMiddlewareInput(), { sender: reqSender, ...reqParams }),
          {
            whitelist: true,
            forbidNonWhitelisted: true,
            validationError: { target: false },
          },
        );

        if (errors.length > 0) {
          throw new BaseException({
            status: 422,
            message: 'Invalid params for add remote middleware.',
            payload: errors,
          });
        }

        if (action === RemoteMiddlewareActionType.ADD) {
          await this.add(
            sender as string,
            senderMethod,
            target,
            targetMethod,
            order,
            params || undefined,
          );
        } else {
          await this.remove(sender as string, senderMethod, target, targetMethod, params?.type);
        }

        return { ok: true };
      },
      'Add remote middleware for any microservice',
      ServerRegisterMiddlewareInput,
      ServerRegisterMiddlewareOutput,
    );

    this.microservice.addEndpoint(this.registerEndpoint, handler, {
      isDisableMiddlewares: true,
      isPrivate: true,
    });

    this.logDriver(() => 'Remote middleware server: register endpoint ready.');

    return this;
  }

  /**
   * Add endpoint for obtain remote middleware
   */
  public addObtainEndpoint(): RemoteMiddlewareServer {
    const handler: IEndpointHandler<never, never, ServerObtainMiddlewareOutput> = withMeta(
      async (_, { sender }) => ({
        list: await this.repository.find({ target: sender }, { order: { order: 'ASC' } }),
      }),
      'Get remote middlewares for microservice',
      undefined,
      ServerObtainMiddlewareOutput,
      { list: [MiddlewareEntity.name] },
    );

    this.microservice.addEndpoint(this.obtainEndpoint, handler, {
      isDisableMiddlewares: true,
      isPrivate: true,
    });

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
    order?: number,
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
      entity.order = order;
      entity.params = params;
    } else {
      entity = this.repository.create({
        sender,
        senderMethod,
        target,
        targetMethod,
        type,
        order,
        params,
      });
    }

    await this.repository.save(entity);
    await this.remoteRegister({
      action: RemoteMiddlewareActionType.ADD,
      target,
      targetMethod,
      sender,
      senderMethod,
      params,
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
    await this.remoteRegister({
      action: RemoteMiddlewareActionType.REMOVE,
      target,
      targetMethod,
      sender,
      senderMethod,
    });
  }

  /**
   * Register/deregister in remote microservices
   * @private
   */
  public remoteRegister(data: ServerRegisterMiddlewareInput): Promise<void> {
    const { target, action, targetMethod, sender, senderMethod, params } = data;
    const endpoint = [target, this.registerEndpoint].join('.');

    return this.microservice
      .sendRequest(
        endpoint,
        { action, targetMethod, sender, senderMethod, params },
        {
          // publish (send) request to all alive workers
          reqParams: { headers: { type: 'pub' } },
        },
      )
      .then(() => {
        this.logDriver(
          () => `Remote middleware server: ${action} - ${target}.${targetMethod ?? ''}`,
        );
      });
  }
}

export default RemoteMiddlewareServer;
