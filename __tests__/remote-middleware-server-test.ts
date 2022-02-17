import {
  ConsoleLogDriver,
  IEndpointHandler,
  Microservice,
  MiddlewareType,
} from '@lomray/microservice-nodejs-lib';
import { expect } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';
import MiddlewareMock from '@__helpers__/middleware-mock';
import MiddlewareRepositoryMock from '@__helpers__/middleware-repository-mock';
import { ServerRegisterMiddlewareInput } from '@entities/server-params';
import { IWithEndpointMeta } from '@helpers/with-meta';
import { RemoteMiddlewareActionType } from '@interfaces/i-remote-middleware-client';
import RemoteMiddlewareServer from '@services/remote-middleware-server';

describe('remote middleware server', () => {
  const microservice = Microservice.create();
  const repository = new MiddlewareRepositoryMock();
  const middlewareInstance = RemoteMiddlewareServer.create(microservice, repository);

  before(() => {
    sinon.stub(console, 'info');
  });

  after(() => {
    sinon.restore();
  });

  it('should correct create server instance', () => {
    expect(middlewareInstance).to.instanceOf(RemoteMiddlewareServer);
  });

  it('should correct return created instance - singletone', () => {
    expect(RemoteMiddlewareServer.create(microservice, repository)).to.equal(middlewareInstance);
  });

  it('should correct return created instance', () => {
    expect(RemoteMiddlewareServer.getInstance()).to.equal(middlewareInstance);
  });

  it('should correct instantiate without log driver', () => {
    const sandbox = sinon.createSandbox();

    sandbox.stub(RemoteMiddlewareServer, 'instance' as any).value(undefined);

    const localInstance = RemoteMiddlewareServer.create(microservice, repository, {
      logDriver: false,
    });
    const driver = localInstance['logDriver'];

    sandbox.restore();

    expect(driver).not.equal(ConsoleLogDriver);
    // noinspection JSVoidFunctionReturnValueUsed
    expect(driver(() => '')).to.undefined;
  });

  it('should correct instantiate with custom log driver', () => {
    const logDriver = () => ({ hello: 'world' });
    const sandbox = sinon.createSandbox();

    sandbox.stub(RemoteMiddlewareServer, 'instance' as any).value(undefined);

    const localInstance = RemoteMiddlewareServer.create(microservice, repository, { logDriver });

    sandbox.restore();

    expect(localInstance).to.have.property('logDriver').equal(logDriver);
  });

  let registerEndpoint,
    registerHandler: IEndpointHandler<ServerRegisterMiddlewareInput>,
    registerOptions;
  const endpointParams: ServerRegisterMiddlewareInput = {
    action: RemoteMiddlewareActionType.ADD,
    target: 'target',
    targetMethod: 'targetMethod',
    senderMethod: 'method',
  };
  const endpointOptions = { sender: 'sender' } as any;

  it('should correct add register endpoint', () => {
    const addEndpointSpy = sinon.spy(microservice, 'addEndpoint');

    middlewareInstance.addRegisterEndpoint();

    [registerEndpoint, registerHandler, registerOptions] = addEndpointSpy.firstCall.args;

    addEndpointSpy.restore();

    expect(middlewareInstance).have.property('registerEndpoint').to.equal(registerEndpoint);
    expect(registerOptions?.isPrivate).to.ok;
    expect(registerOptions?.isDisableMiddlewares).to.ok;
  });

  it('should correctly return endpoint metadata', () => {
    const result = (registerHandler as typeof registerHandler & IWithEndpointMeta).getMeta();

    expect(result).to.deep.equal({
      description: 'Add remote middleware for any microservice',
      input: ['ServerRegisterMiddlewareInput'],
      output: ['ServerRegisterMiddlewareOutput', undefined],
    });
  });

  it('should throw validation errors when pass incorrect registration params', async () => {
    const getParamsWithout = (omit: string) =>
      _.omit(endpointParams, [omit]) as ServerRegisterMiddlewareInput;

    const result = await Promise.allSettled([
      registerHandler(endpointParams, {} as any), // not pass sender
      registerHandler(getParamsWithout('action'), endpointOptions), // not pass action
      registerHandler(
        {
          ...endpointParams,
          action: 'unknown',
        } as unknown as ServerRegisterMiddlewareInput,
        endpointOptions,
      ), // pass incorrect action
      registerHandler(getParamsWithout('method'), endpointOptions), // not pass method
      registerHandler(getParamsWithout('target'), endpointOptions), // not pass target
      registerHandler(getParamsWithout('targetMethod'), endpointOptions), // not pass targetMethod
    ]);

    result.forEach(({ status }) => {
      expect(status).to.equal('rejected');
    });
  });

  it('should call "add" method in register handler', async () => {
    const stubbed = sinon.stub(middlewareInstance, 'add');

    const result = await registerHandler(endpointParams, endpointOptions);

    stubbed.restore();

    expect(stubbed).to.calledOnce;
    expect(result?.ok).to.ok;
  });

  it('should call "remove" method in register handler', async () => {
    const stubbed = sinon.stub(middlewareInstance, 'remove');

    const result = await registerHandler(
      { ...endpointParams, action: RemoteMiddlewareActionType.REMOVE },
      endpointOptions,
    );

    stubbed.restore();

    expect(stubbed).to.calledOnce;
    expect(result?.ok).to.ok;
  });

  it('should call "remove" method in register handler - response type', async () => {
    const stubbed = sinon.stub(middlewareInstance, 'remove');

    const result = await registerHandler(
      {
        ...endpointParams,
        action: RemoteMiddlewareActionType.REMOVE,
        params: { type: MiddlewareType.response },
      },
      endpointOptions,
    );

    stubbed.restore();

    expect(stubbed).to.calledOnce;
    expect(result?.ok).to.ok;
  });

  it('should correct add obtain endpoint & run endpoint handler', async () => {
    const addEndpointSpy = sinon.spy(microservice, 'addEndpoint');
    const repoFindSpy = sinon.spy(repository, 'find');

    middlewareInstance.addObtainEndpoint();

    const [endpoint, handler, options] = addEndpointSpy.firstCall.args;

    await handler({}, endpointOptions);

    addEndpointSpy.restore();
    repoFindSpy.restore();

    expect(middlewareInstance).have.property('obtainEndpoint').to.equal(endpoint);
    expect(options?.isPrivate).to.ok;
    expect(options?.isDisableMiddlewares).to.ok;
    expect(repoFindSpy).to.calledWith({ target: endpointOptions.sender });

    // test metadata for obtain endpoint
    const result = (handler as typeof handler & IWithEndpointMeta).getMeta();

    expect(result).to.deep.equal({
      description: 'Get remote middlewares for microservice',
      input: [undefined],
      output: [
        'ServerObtainMiddlewareOutput',
        {
          list: ['MiddlewareEntity'],
        },
      ],
    });
  });

  it('should correct add remote middleware (save & update)', async () => {
    const middlewareParams = { type: MiddlewareType.request, isRequired: false };

    const sandbox = sinon.createSandbox();
    const repoCreateSpy = sandbox.spy(repository, 'create');
    const repoSaveSpy = sandbox.spy(repository, 'save');
    const sendRequestStubbed = sandbox.stub(microservice, 'sendRequest').resolves();
    const { senderMethod, target, targetMethod } = endpointParams;
    const { sender } = endpointOptions;

    // Create middleware
    await middlewareInstance.add(sender, senderMethod, target, targetMethod);

    sandbox.stub(repository, 'findOne').resolves(new MiddlewareMock());

    // Update middleware
    await middlewareInstance.add(sender, senderMethod, target, targetMethod, middlewareParams);

    sandbox.restore();

    // Call remoteRegister
    const [remoteEndpoint, remoteData] = sendRequestStubbed.firstCall.args;

    expect(repoCreateSpy).to.calledOnce;
    expect(repoCreateSpy.firstCall.firstArg).to.includes({
      sender,
      senderMethod,
      target,
      targetMethod,
      type: MiddlewareType.request,
    });
    expect(repoSaveSpy).to.calledTwice;

    // Check remoteRegister
    expect(sendRequestStubbed).to.calledTwice; // create / update
    expect(remoteEndpoint).to.equal(`${target}.${middlewareInstance['registerEndpoint']}`);
    expect({ sender, ...endpointParams }).to.includes(_.omit(remoteData, ['params']));
  });

  it('should correct remove remote middleware', async () => {
    const sandbox = sinon.createSandbox();
    const repoRemoveSpy = sandbox.spy(repository, 'remove');
    const sendRequestStubbed = sandbox.stub(microservice, 'sendRequest').resolves();
    const { senderMethod, target, targetMethod } = endpointParams;
    const { sender } = endpointOptions;

    // Middleware not exist
    await middlewareInstance.remove(sender, senderMethod, target, targetMethod);

    sandbox.stub(repository, 'findOne').resolves(
      new MiddlewareMock({
        sender,
        senderMethod,
        target,
        targetMethod,
        type: MiddlewareType.request,
      }),
    );

    await middlewareInstance.remove(sender, senderMethod, target, targetMethod);

    sandbox.restore();

    // Call remoteRegister
    const [remoteEndpoint, remoteData] = sendRequestStubbed.firstCall.args;

    expect(repoRemoveSpy).to.calledOnce;

    // Check remoteRegister
    expect(remoteEndpoint).to.equal(`${target}.${middlewareInstance['registerEndpoint']}`);
    expect({ ...endpointParams, action: RemoteMiddlewareActionType.REMOVE, sender }).to.includes(
      _.omit(remoteData, ['params']),
    );
  });
});
