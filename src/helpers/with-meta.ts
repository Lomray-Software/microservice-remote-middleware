export interface IWithEndpointMeta {
  getMeta: () => {
    input: (string | undefined)[];
    output: (string | Record<string, any> | undefined)[];
    description?: string;
  };
}

interface IConstructor {
  new (): Record<string, any>;
}

/**
 * Add metadata to endpoint handler
 */
const withMeta = <TFunc>(
  handler: TFunc,
  description?: string,
  input?: IConstructor,
  output?: IConstructor,
  outputParams?: Record<string, any>,
): TFunc & IWithEndpointMeta =>
  Object.assign(handler, {
    getMeta: () => ({
      description,
      input: [input?.name],
      output: [output?.name, outputParams],
    }),
  });

export default withMeta;
