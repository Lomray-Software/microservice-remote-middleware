import type { LogDriverType, MiddlewareHandler } from '@lomray/microservice-nodejs-lib';
import {
  AbstractMicroservice,
  ConsoleLogDriver,
  LogType,
  MiddlewareType,
} from '@lomray/microservice-nodejs-lib';
import _ from 'lodash';
import type {
  IMiddlewareEntity,
  IRemoteMiddlewareEndpointParams,
  IRemoteMiddlewareParams,
  IRemoteMiddlewareReqParams,
} from '@interfaces/i-remote-middleware-client';
import {
  MiddlewareStrategy,
  RemoteMiddlewareActionType,
} from '@interfaces/i-remote-middleware-client';

/**
 * Service for register remote middleware on client
 */
class RemoteMiddlewareClient {
  /**
   * @type {RemoteMiddlewareClient}
   * @private
   */
  private static instance: RemoteMiddlewareClient;

  /**
   * Service instance
   * @private
   */
  private microservice: AbstractMicroservice;

  /**
   * Collect methods handlers for remove in future
   * @private
   */
  private methods: { [method: string]: MiddlewareHandler } = {};

  /**
   * Service log driver
   * @private
   */
  private readonly logDriver: LogDriverType = ConsoleLogDriver();

  /**
   * Name of configuration microservice
   * @private
   */
  private readonly configurationMsName: string = 'configuration';

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
    params: Partial<IRemoteMiddlewareParams>,
  ) {
    this.microservice = microservice;

    const { logDriver, configurationMsName } = params;

    if (configurationMsName) {
      this.configurationMsName = configurationMsName;
    }

    // Change log driver
    if (logDriver !== undefined && logDriver !== true) {
      // Set custom log driver or disable logging
      this.logDriver = logDriver === false ? () => undefined : logDriver;
    }

    this.logDriver(() => 'Remote middleware client: service initialized.');
  }

  /**
   * Create remote middleware service
   */
  public static create(
    microservice: AbstractMicroservice,
    params: Partial<IRemoteMiddlewareParams> = {},
  ): RemoteMiddlewareClient {
    if (!RemoteMiddlewareClient.instance) {
      RemoteMiddlewareClient.instance = new this(microservice, params);
    }

    return RemoteMiddlewareClient.instance;
  }

  /**
   * Get remote middleware client instance
   */
  public static getInstance(): RemoteMiddlewareClient {
    return RemoteMiddlewareClient.instance;
  }

  /**
   * Add endpoint for register remote middleware
   * @protected
   */
  public addRegisterEndpoint(): RemoteMiddlewareClient {
    this.microservice.addEndpoint<IRemoteMiddlewareEndpointParams>(
      this.registerEndpoint,
      ({ action, method, targetMethod, options }, { sender }) => {
        if (!sender || !Object.values(RemoteMiddlewareActionType).includes(action)) {
          throw new Error('Invalid params for add remote middleware.');
        }

        const endpoint = [sender, method].join('.');

        if (action === RemoteMiddlewareActionType.ADD) {
          this.add(endpoint, targetMethod, options);
          this.logDriver(() => `Remote middleware client: registered - ${endpoint}`);
        } else {
          this.remove(endpoint);
          this.logDriver(() => `Remote middleware client: canceled - ${endpoint}`);
        }

        return { ok: true };
      },
      { isDisableMiddlewares: true, isPrivate: true },
    );

    this.logDriver(() => 'Remote middleware client: register endpoint ready.');

    return this;
  }

  /**
   * Obtain middlewares before start
   */
  public async obtainMiddlewares(): Promise<void> {
    const result = await this.microservice.sendRequest<any, IMiddlewareEntity[]>(
      `${this.configurationMsName}.${this.obtainEndpoint}`,
    );

    result.getResult()?.map(({ sender, senderMethod, targetMethod, params }) => {
      const endpoint = [sender, senderMethod].join('.');

      this.add(endpoint, targetMethod, params);
      this.logDriver(() => `Remote middleware client: registered - ${endpoint}`);
    });
  }

  /**
   * Convert one structure to another
   *
   * Example:
   * mapObj: { 'from.one.key': 'to.other.key' }
   * input: { from: { one: { key: 1 } } }
   *
   * Output will be:
   * output: { to: { other: { key: 1 } } }
   * @private
   */
  private convertData(
    output?: Record<string, any>,
    input?: Record<string, any>,
    mapObj?: Record<string, string>,
  ): Record<string, any> | undefined {
    if (!mapObj) {
      return output;
    }

    const result = { ...output };

    Object.entries(mapObj).forEach(([from, to]) => {
      _.set(result, to, _.get(input, from));
    });

    return result;
  }

  /**
   * Call microservice method like middleware
   */
  public add(
    method: string,
    targetMethod = '*',
    params: IRemoteMiddlewareReqParams = {},
  ): MiddlewareHandler {
    const {
      type = MiddlewareType.request,
      isRequired = false,
      strategy = MiddlewareStrategy.same,
      convertParams,
      convertResult,
      reqParams,
    } = params;

    if (!method) {
      throw new Error('"method" is required for register remote middleware.');
    }

    const handler = (this.methods[method] = (data) => {
      const methodParams = {
        payload: {
          middleware: { ...data },
          ...(data.task.getParams()?.payload ?? {}),
        },
      };

      return this.microservice
        .sendRequest(
          method,
          this.convertData(methodParams, data.task.getParams(), convertParams),
          reqParams,
        )
        .then((response) => {
          if (isRequired && response.getError()) {
            throw response.getError();
          }

          const [microservice] = method.split('.');
          const result = { ...(response.getResult() ?? {}) };
          const requestData = type === MiddlewareType.request ? data.task.getParams() : data.result;

          _.set(result, 'payload.senderStack', [
            ...(data.task.getParams()?.payload?.senderStack ?? []),
            microservice,
          ]);

          switch (strategy) {
            case MiddlewareStrategy.merge:
              return _.merge(requestData, result);

            case MiddlewareStrategy.replace:
              return result;
          }

          // same strategy
          return this.convertData(requestData, result, convertResult);
        })
        .catch((e) => {
          this.logDriver(
            () => `Remote middleware client error: ${e.message as string}`,
            LogType.ERROR,
            data.task.getId(),
          );

          if (!isRequired) {
            return;
          }

          throw e;
        });
    });

    this.microservice.addMiddleware(handler, type, { match: targetMethod });

    return handler;
  }

  /**
   * Remove remote middleware
   */
  public remove(method: string): void {
    const handler = this.methods[method];

    if (!handler) {
      return;
    }

    _.unset(this.methods, method);
    this.microservice.removeMiddleware(handler);
  }
}

export default RemoteMiddlewareClient;
