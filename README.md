# NodeJS Microservice Remote Middleware lib

![GitHub](https://img.shields.io/github/license/Lomray-Software/microservice-remote-middleware)
![GitHub package.json dependency version (dev dep on branch)](https://img.shields.io/github/package-json/dependency-version/Lomray-Software/microservice-remote-middleware/dev/typescript/master)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Install
```bash
npm i --save @lomray/microservice-remote-middleware
```

## Usage

1. Create `server` remote middleware instance. It might be any microservice but only one.
```typescript
import { Microservice } from '@lomray/microservice-nodejs-lib';
import { RemoteMiddlewareServer } from '@lomray/microservice-remote-middleware';
import { createConnection } from 'typeorm';

const microservice = Microservice.create({ name: 'configuration' });

// Add this endpoint for testing remote middleware
microservice.addEndpoint('example-method', ({ hello }) => ({ hello }));

const result = async () => {
  try {
    // In this case we are use TYPEORM  
    const connection = await createConnection();
    // Get Middleware repository for store middlewares data
    const repository = connection.getRepository(Middleware)

    // Enable remote middleware
    const remoteMiddleware = RemoteMiddlewareServer.create(microservice, repository)
      .addRegisterEndpoint()
      .addObtainEndpoint();

    /**
     * Add microservice method like remote middleware.
     * In future, you can create CRUD for this actions.
     * For example:
     */
    // 1. Create method for register like middleware: configuration.middleware-method
    microservice.addEndpoint('middleware-method', () => ({ hello: 'middleware world' }), {
      isDisableMiddlewares: true,
      isPrivate: true,
    });
    // 2. Register remote middleware on gateway microservice. This middleware will be triggered only for requests to any configuration methods.
    await remoteMiddleware.add(
      'configuration',
      'middleware-method',
      'gateway',
      'configuration.*',
    );

    await microservice.start();
  } catch (e) {
    console.info('\x1b[31m%s\x1b[0m', `Failed to start microservice: ${e.message as string}`);
    process.exit(1);
  }
};

export default result();
```
2. Create `client` remote middleware instance. It might be any microservice.
```typescript
import { Gateway } from '@lomray/microservice-nodejs-lib';
import { RemoteMiddlewareClient } from '@lomray/microservice-remote-middleware';

const microservice = Gateway.create({ name: 'gateway' });

const result = async () => {
  try {
    // Enable remote middleware
    await RemoteMiddlewareClient.create(microservice)
      .addRegisterEndpoint()
      .obtainMiddlewares();

    await microservice.start();
  } catch (e) {
    console.info('\x1b[31m%s\x1b[0m', `Failed to start microservice: ${e.message as string}`);
  }
};

export default result();
```
3. That is all. Check it:
```bash
curl -X POST http://127.0.0.1:3000
   -H 'Content-Type: application/json'
   -d '{"id":"unique-id-1","method":"configuration.example-method","params":{"hello":"world"}}'
```

## You can run any microservice and create remote middleware client. Check out the examples below to get the desired result:
```typescript
// Add remote middleware on any microservices methods (note: this is gateway microservice)
await remoteMiddleware.add(
  'configuration',
  'middleware-method',
  'gateway',
  '*',
);

// Add remote middleware on specific microservice method (note: this is gateway microservice)
await remoteMiddleware.add(
  'configuration',
  'middleware-method',
  'gateway',
  'users.list',
);

// Also you can add remote middleware directly to microservice
await remoteMiddleware.add(
  'configuration',
  'middleware-method',
  'users',
  'users.create',
);

// Just one more example :) Add authentication for requests (you should have authentication microservice)
await remoteMiddleware.add(
  'authentication',
  'middleware-authenticate',
  'gateway',
  '*',
);
```
