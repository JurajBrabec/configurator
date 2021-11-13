const configurator = require('./src/index.js');

const CONFIG_FILE = './config.js';

const mainConfig = configurator.expect
  .jsFile({ configFile: { arg: 'config', default: CONFIG_FILE } })
  .string({
    moduleName: {
      arg: 'module',
      do: (value) => value.toLowerCase(),
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
