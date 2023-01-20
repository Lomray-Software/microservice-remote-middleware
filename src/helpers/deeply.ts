/* eslint-disable @typescript-eslint/no-unsafe-argument */
import _ from 'lodash';

type TFn = (val: any, key: string) => Record<string, any> | any;

/**
 * Deep walk object values
 * @see https://gist.github.com/zambon/8b2d207bd21cf4fcd47b96cd6d7f99c2
 */
const deeply =
  (map: (obj: Record<string, any>, fn: TFn) => Record<string, any>) =>
  (obj: Record<string, any>, fn: TFn): Record<string, any> =>
    map(
      _.mapValues(obj, (v) => {
        if (_.isPlainObject(v)) {
          return deeply(map)(v, fn);
        } else if (_.isArray(v)) {
          return _.map(v, (item) => deeply(map)(item, fn));
        }

        return v;
      }),
      fn,
    );

export default deeply;
