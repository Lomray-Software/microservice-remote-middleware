import { MiddlewareType } from '@lomray/microservice-nodejs-lib';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';
import {
  IRemoteMiddlewareReqParams,
  RemoteMiddlewareActionType,
} from '@interfaces/i-remote-middleware-client';

/**
 * Input params for register middleware on server
 */
class ServerRegisterMiddlewareInput {
  @IsEnum(RemoteMiddlewareActionType)
  action: RemoteMiddlewareActionType;

  @IsString()
  @IsNotEmpty()
  target: string;

  @IsString()
  @IsNotEmpty()
  targetMethod: string;

  @JSONSchema({
    description:
      'This field can be skipped. If not passed, get sender from microservice request params',
  })
  @IsString()
  sender?: string | null;

  @IsString()
  @IsNotEmpty()
  senderMethod: string;

  @JSONSchema({
    example: {
      type: 'request',
      isRequired: true,
      strategy: 'transform',
      convertParams: { 'to.param': '$from.param', custom: 'hello' },
      convertResult: { 'to.result': '$from.result', customNumber: 10 },
    },
  })
  @IsObject()
  @IsOptional()
  params?: IRemoteMiddlewareReqParams | null;
}

/**
 * Output params for register middleware on server
 */
class ServerRegisterMiddlewareOutput {
  @IsBoolean()
  ok: boolean;
}

class ServerObtainMiddlewareOutput {
  @JSONSchema({
    description: 'Return list of MiddlewareEntity',
    example: [
      {
        id: 1,
        target: 'demo',
        targetMethod: 'test',
        sender: 'demo2',
        senderMethod: 'method-name',
        type: 'response',
        params: {},
      },
    ],
  })
  @IsObject()
  list: MiddlewareEntity[];
}

/**
 * Output params for obtain middleware on server
 */
class MiddlewareEntity {
  @IsNumber()
  id: number;

  @IsString()
  target: string;

  @IsString()
  targetMethod: string;

  @IsString()
  sender: string;

  @IsString()
  senderMethod: string;

  @IsEnum(MiddlewareType)
  type: MiddlewareType;

  @JSONSchema({
    example: {
      type: 'request',
      isRequired: false,
      strategy: 'transform',
      convertParams: { 'to.param': '$from.param', custom: 'hello' },
      convertResult: { 'to.result': '$from.result', customNumber: 10 },
    },
  })
  @IsObject()
  params: IRemoteMiddlewareReqParams;
}

export {
  ServerRegisterMiddlewareInput,
  ServerRegisterMiddlewareOutput,
  ServerObtainMiddlewareOutput,
  MiddlewareEntity,
};
