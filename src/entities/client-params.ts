import { IsBoolean, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';
import type { IRemoteMiddlewareReqParams } from '@interfaces/i-remote-middleware-client';
import { RemoteMiddlewareActionType } from '@interfaces/i-remote-middleware-client';

/**
 * Input params for register middleware on client
 */
class ClientRegisterMiddlewareInput {
  @IsEnum(RemoteMiddlewareActionType)
  action: RemoteMiddlewareActionType;

  @IsString()
  @IsNotEmpty()
  targetMethod: string;

  @JSONSchema({
    description:
      'This field can be skipped. If not passed, get sender from microservice request params',
  })
  @IsString()
  sender?: string;

  @IsString()
  @IsNotEmpty()
  senderMethod: string;

  @JSONSchema({
    example: {
      type: 'response',
      isRequired: true,
      strategy: 'replace',
      convertParams: { 'to.param': '$from.param', custom: 'hello' },
      convertResult: { 'to.result': '$from.result', customNumber: 10 },
    },
  })
  @IsObject()
  @IsOptional()
  params?: IRemoteMiddlewareReqParams | null;
}

/**
 * Output params for register middleware on client
 */
class ClientRegisterMiddlewareOutput {
  @IsBoolean()
  ok: boolean;
}

export { ClientRegisterMiddlewareInput, ClientRegisterMiddlewareOutput };
