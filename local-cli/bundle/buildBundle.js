/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

'use strict';

const log = require('../util/log').out('bundle');
const Server = require('metro/src/Server');

const outputBundle = require('metro/src/shared/output/bundle');
const path = require('path');
const saveAssets = require('./saveAssets');

import type {RequestOptions, OutputOptions} from './types.flow';
import type {ConfigT} from 'metro-config/src/configTypes.flow';

async function buildBundle(
  args: OutputOptions & {
    assetsDest: mixed,
    entryFile: string,
    maxWorkers: number,
    resetCache: boolean,
    transformer: string,
    minify: boolean,
  },
  configPromise: Promise<ConfigT>,
  /* $FlowFixMe(>=0.85.0 site=react_native_fb) This comment suppresses an error
   * found when Flow v0.85 was deployed. To see the error, delete this comment
   * and run Flow. */
  output = outputBundle,
) {
  // This is used by a bazillion of npm modules we don't control so we don't
  // have other choice than defining it as an env variable here.
  process.env.NODE_ENV = args.dev ? 'development' : 'production';
  const config = await configPromise;

  let sourceMapUrl = args.sourcemapOutput;
  if (sourceMapUrl && !args.sourcemapUseAbsolutePath) {
    sourceMapUrl = path.basename(sourceMapUrl);
  }

  const requestOpts: RequestOptions = {
    entryFile: args.entryFile,
    sourceMapUrl,
    dev: args.dev,
    minify: args.minify !== undefined ? args.minify : !args.dev,
    platform: args.platform,
  };

  const server = new Server({...config, resetCache: args.resetCache});

  try {
    const bundle = await output.build(server, requestOpts);

    await output.save(bundle, args, log);

    // Save the assets of the bundle
    const outputAssets = await server.getAssets({
      ...Server.DEFAULT_BUNDLE_OPTIONS,
      ...requestOpts,
      bundleType: 'todo',
    });

    // When we're done saving bundle output and the assets, we're done.
    return await saveAssets(outputAssets, args.platform, args.assetsDest);
  } finally {
    server.end();
  }
}

module.exports = buildBundle;
