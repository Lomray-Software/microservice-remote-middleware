import {
  BaseException,
  ConsoleLogDriver,
  IEndpointHandler,
  Microservice,
  MicroserviceRequest,
  MicroserviceResponse,
  MiddlewareHandler,
  MiddlewareType,
} from '@lomray/microservice-nodejs-lib';
import { expect } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';
import MiddlewareMock from '@__helpers__/middleware-mock';
import {
  IRemoteMiddlewareEndpointParams,
  MiddlewareStrategy,
  RemoteMiddlewareActionType,
} from '@interfaces/i-remote-middleware-client';
import RemoteMiddlewareClient from '@services/remote-middleware-client';

describe('remote middleware client', () => {
  const microservice = Microservice.create();
  const middlewareInstance = RemoteMiddlewareClient.create(microservice);

  before(() => {
    sinon.stub(console, 'info');
  });

  after(() => {
    sinon.restore();
  });

  it('should correct create client instance', () => {
    expect(middlewareInstance).to.instanceOf(RemoteMiddlewareClient);
  });

  it('should correct return created instance - singletone', () => {
    expect(RemoteMiddlewareClient.create(microservice)).to.equal(middlewareInstance);
  });

  it('should correct return created instance', () => {
    expect(RemoteMiddlewareClient.getInstance()).to.equal(middlewareInstance);
  });

  it('should correct instantiate without log driver', () => {
    const sandbox = sinon.createSandbox();

    sandbox.stub(RemoteMiddlewareClient, 'instance' as any).value(undefined);

    const localInstance = RemoteMiddlewareClient.create(microservice, {
      logDriver: false,
    });
    const driver = localInstance['logDriver'];

    sandbox.restore();

    expect(driver).not.equal(ConsoleLogDriver);
    // noinspection JSVoidFunctionReturnValueUsed
    expect(driver(() => '')).to.undefined;
  });

  it('should correct instantiate with custom log driver & custom configuration microservice name', () => {
    const logDriver = () => ({ hello: 'world' });
    const sandbox = sinon.createSandbox();

    sandbox.stub(RemoteMiddlewareClient, 'instance' as any).value(undefined);

    const localInstance = RemoteMiddlewareClient.create(microservice, {
      logDriver,
      configurationMsName: 'another',
    });

    sandbox.restore();

    expect(localInstance).to.have.property('logDriver').equal(logDriver);
    expect(localInstance).to.have.property('configurationMsName').equal('another');
  });

  let registerEndpoint,
    registerHandler: IEndpointHandler<IRemoteMiddlewareEndpointParams>,
    registerOptions;
  const endpointParams: IRemoteMiddlewareEndpointParams = {
    action: RemoteMiddlewareActionType.ADD,
    method: 'method',
    targetMethod: 'targetMethod',
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

  it('should throw validation errors when pass incorrect registration params', () => {
    expect(() => registerHandler(endpointParams, {} as any)).to.throw(); // not pass sender
    expect(() =>
      registerHandler(
        _.omit(endpointParams, ['action']) as IRemoteMiddlewareEndpointParams,
        endpointOptions,
      ),
    ).to.throw(); // not pass action
    expect(() =>
      registerHandler(
        {
          ...endpointParams,
          action: 'unknown',
        } as unknown as IRemoteMiddlewareEndpointParams,
        endpointOptions,
      ),
    ).to.throw(); // not pass sender
  });

  it('should call "add" method in register handler', async () => {
    const stubbed = sinon.stub(middlewareInstance, 'add');

    const result = await registerHandler(endpointParams, endpointOptions);

    stubbed.restore();

    expect(stubbed).to.calledOnce;
    expect(result?.ok).to.ok;
    expect(stubbed.firstCall.firstArg).to.equal(
      [endpointOptions.sender, endpointParams.method].join('.'),
    );
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

  it('should correct obtain remote middleware for microservice', async () => {
    const middleware = new MiddlewareMock({
      sender: 'test',
      senderMethod: 'sender-method',
      targetMethod: 'target-method',
      params: { type: MiddlewareType.response },
    });

    const sandbox = sinon.createSandbox();
    const addStubbed = sandbox.stub(middlewareInstance, 'add');

    sandbox
      .stub(microservice, 'sendRequest')
      .onCall(0)
      .resolves(new MicroserviceResponse())
      .onCall(1)
      .resolves(new MicroserviceResponse({ result: [middleware] }));

    // 0 call - empty
    await middlewareInstance.obtainMiddlewares();
    // 1 call - return 1 middleware
    await middlewareInstance.obtainMiddlewares();

    sandbox.restore();

    const [endpoint, targetMethod, params] = addStubbed.firstCall.args;

    expect(endpoint).to.equal([middleware.sender, middleware.senderMethod].join('.'));
    expect(targetMethod).to.equal(middleware.targetMethod);
    expect(params).to.deep.equal(middleware.params);
  });

  it('should throw error when try add middleware without method', () => {
    expect(() => middlewareInstance.add('')).to.throw();
  });

  let handler: MiddlewareHandler;
  const method = 'example';
  const request = new MicroserviceResponse({ result: { hello: 'world' } });

  it('should correct add middleware handler', () => {
    const targetMethod = 'target-m';
    const addEndpointSpy = sinon.spy(microservice, 'addMiddleware');

    middlewareInstance.add(method, targetMethod, { isRequired: true });

    handler = addEndpointSpy.firstCall.firstArg;

    addEndpointSpy.restore();

    expect(addEndpointSpy).to.calledOnce;
    expect(addEndpointSpy.firstCall.args[1]).to.equal(MiddlewareType.request);
    expect(addEndpointSpy.firstCall.args[2]).to.deep.equal({ match: targetMethod });
    expect(middlewareInstance).property('methods').have.property('example');
  });

  it('should throw error if middleware handle is required and response is error', async () => {
    const sendReqStubbed = sinon
      .stub(microservice, 'sendRequest')
      .resolves(new MicroserviceResponse({ error: new BaseException() }));

    const [result] = await Promise.allSettled([
      handler({ task: new MicroserviceRequest({ method: 'method' }) }, {}),
    ]);

    sendReqStubbed.restore();

    expect(result?.status).to.equal('rejected');
    // @ts-ignore
    expect(result?.reason).to.instanceOf(BaseException);
  });

  it('should success apply middleware handler data: same strategy', async () => {
    const sendReqStubbed = sinon.stub(microservice, 'sendRequest').resolves(request);
    const result = await handler({ task: new MicroserviceRequest({ method: 'method' }) }, {});

    sendReqStubbed.restore();

    expect(result).to.undefined;
  });

  it('should success apply middleware handler data: replace strategy', async () => {
    const sendReqStubbed = sinon.stub(microservice, 'sendRequest').resolves(request);
    const addEndpointSpy = sinon.spy(microservice, 'addMiddleware');

    middlewareInstance.add(method, 'method-replace-strategy', {
      isRequired: true,
      strategy: MiddlewareStrategy.replace,
      type: MiddlewareType.response,
    });

    const replaceHandler = addEndpointSpy.firstCall.firstArg;

    const result = await replaceHandler(
      { task: new MicroserviceRequest({ method: 'method' }), result: { ms: 'result' } },
      {},
    );

    sendReqStubbed.restore();
    addEndpointSpy.restore();

    expect(result).to.deep.equal({ ...request.getResult(), payload: { senderStack: ['example'] } });
    expect(result?.payload?.senderStack[0]).to.equal(method);
  });

  it('should success apply middleware handler data: merge strategy', async () => {
    const sendReqStubbed = sinon.stub(microservice, 'sendRequest').resolves(request);
    const addEndpointSpy = sinon.spy(microservice, 'addMiddleware');

    middlewareInstance.add(method, 'method-merge-strategy', {
      isRequired: true,
      strategy: MiddlewareStrategy.merge,
      type: MiddlewareType.response,
    });

    const mergeHandler = addEndpointSpy.firstCall.firstArg;

    const result = await mergeHandler(
      { task: new MicroserviceRequest({ method: 'method' }), result: { ms: 'result' } },
      {},
    );

    sendReqStubbed.restore();
    addEndpointSpy.restore();

    expect(result).to.deep.equal({
      ...request.getResult(),
      ms: 'result',
      payload: { senderStack: ['example'] },
    });
    expect(result?.payload?.senderStack[0]).to.equal(method);
  });

  it('should success apply middleware handler data: same strategy with convertParams & convertResult', async () => {
    const sendReqStubbed = sinon.stub(microservice, 'sendRequest').resolves(request);
    const addEndpointSpy = sinon.spy(microservice, 'addMiddleware');

    middlewareInstance.add(method, 'method-same-with-convert-strategy', {
      isRequired: true,
      type: MiddlewareType.response,
      convertParams: { 'someParam.test': 'another.hi' },
      convertResult: { hello: 'res-ms.val' },
    });

    const sameHandler = addEndpointSpy.firstCall.firstArg;
    const result = await sameHandler(
      {
        task: new MicroserviceRequest({ method: 'method', params: { someParam: { test: 'hi' } } }),
        result: { ms: 'result' },
      },
      {},
    );

    const [, reqParams] = sendReqStubbed.firstCall.args;

    sendReqStubbed.restore();
    addEndpointSpy.restore();

    expect(reqParams.another).to.contain({ hi: 'hi' });
    expect(result).to.deep.equal({
      ms: 'result',
      'res-ms': {
        val: 'world',
      },
    });
  });

  it('should NOT throw error if middleware handle is NOT required and response is error', async () => {
    const sendReqStubbed = sinon.stub(microservice, 'sendRequest').rejects(new BaseException());
    const addEndpointSpy = sinon.spy(microservice, 'addMiddleware');

    middlewareInstance.add('another-method', 'another-target');

    const notRequiredHandler = addEndpointSpy.firstCall.firstArg;

    const result = await notRequiredHandler(
      { task: new MicroserviceRequest({ method: 'another-method' }) },
      {},
    );

    sendReqStubbed.restore();

    expect(result).to.undefined;
  });

  it('should correct behaviour when try remove not exist middleware handler', () => {
    const removeSpy = sinon.spy(microservice, 'removeMiddleware');

    middlewareInstance.remove('unknown');

    removeSpy.restore();

    expect(removeSpy).to.not.called;
  });

  it('should correct remove middleware handler', () => {
    const removeSpy = sinon.spy(microservice, 'removeMiddleware');

    middlewareInstance.remove(method);

    removeSpy.restore();

    expect(removeSpy).to.calledOnce;
  });
});
