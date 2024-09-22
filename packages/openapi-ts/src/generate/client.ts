import { copyFileSync } from 'node:fs';
import path from 'node:path';

import { getConfig, isStandaloneClient } from '../utils/config';
import { ensureDirSync } from './utils';

const isESM = () => {
  try {
    return typeof import.meta.url === 'string';
  } catch (error) {
    return false;
  }
};

const getRequire = async (): Promise<NodeRequire> => {
  try {
    if (isESM()) {
      const module: any = await import('node:module');
      const createRequire: (path: string | URL) => NodeRequire =
        module.createRequire;
      return createRequire(import.meta.url);
    }

    return module.require;
  } catch (error) {
    return module.require;
  }
};

export const clientModulePath = () => {
  const config = getConfig();
  return config.client.bundle ? './client' : config.client.name;
};

export const clientOptionsTypeName = () => 'Options';

/**
 * (optional) Creates a `client.ts` file containing the same exports as a
 * standalone client package. Creates a `client` directory containing the modules
 * from standalone client. These files are generated only when `client.bundle`
 * is set to true.
 */
export const generateClient = async (
  outputPath: string,
  moduleName: string,
) => {
  const config = getConfig();

  if (!isStandaloneClient(config) || !config.client.bundle) {
    return;
  }

  // create directory for client modules
  const dirPath = path.resolve(outputPath, 'client');
  ensureDirSync(dirPath);

  const require = await getRequire();
  const clientModulePath = path.normalize(require.resolve(moduleName));
  const clientModulePathComponents = clientModulePath.split(path.sep);
  const clientSrcPath = [
    ...clientModulePathComponents.slice(
      0,
      clientModulePathComponents.indexOf('dist'),
    ),
    'src',
  ].join(path.sep);

  // copy client modules
  const files = ['index.ts', 'types.ts', 'utils.ts'];
  files.forEach((file) => {
    copyFileSync(
      path.resolve(clientSrcPath, file),
      path.resolve(dirPath, file),
    );
  });
};
