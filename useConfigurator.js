const configurator = require('./index.js');

const CONFIG_FILE = './config.js';

const mainConfig = configurator.expect
  .config({ configFile: { arg: 'config', default: CONFIG_FILE } })
  .string({
    moduleName: {
      arg: 'module',
      do: (name) => name.toLowerCase(),
    },
  })
  .string('name', 'otherName')
  .path('userProfile')
  .save();

try {
  const config = configurator.compile(mainConfig);
  console.log({ config });
} catch (e) {
  console.error(e.message);
}
