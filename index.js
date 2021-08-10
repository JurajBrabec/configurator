const path = require('path');
const { statSync } = require('fs');

module.exports.Type = {
  Array: 'arr',
  Bool: 'bool',
  Config: 'conf',
  File: 'file',
  Num: 'num',
  Path: 'path',
  String: 'str',
};

const ARGS = process.argv.slice(2);
const ENV = process.env;
const ARG_PREFIXES = '-+/';
const ARG_VALUE_SEPARATORS = '=:';
const VALUE_DELIMITERS = ',;|';

let configuration = {};
let variables = [];

const getPattern = (variable) =>
  new RegExp(
    `^[${ARG_PREFIXES}]+(?<argument>${
      variable.arg || variable.name
    })(?:[${ARG_VALUE_SEPARATORS}](?<value>.*))?`,
    'i'
  );

const defaultValue = (variable) => {
  let value = envValue(variable);
  if (value === undefined) value = configuration[variable.name];
  if (value === undefined) value = variable.default;
  if (value === undefined && variable.type === exports.Type.Bool) value = false;
  return value;
};

const envValue = (variable) => {
  if (variable.env === false) return undefined;
  const envName = variable.env || variable.name.toUpperCase();
  return ENV[envName];
};

const argValue = (variable) => {
  if (variable.arg === false) return undefined;
  const pattern = getPattern(variable);
  const index = ARGS.findIndex((arg) => pattern.test(arg));
  if (index === -1) return undefined;
  let { value } = ARGS[index].match(pattern).groups;
  if (value === undefined && variable.type === exports.Type.Bool) value = true;
  if (value === undefined && index < ARGS.length) value = ARGS[index + 1];
  return value;
};

const castValue = (text, variable) => {
  let value = text;
  switch (variable.type) {
    case exports.Type.Array:
      if (!Array.isArray(value))
        value = text.split(new RegExp(`[${VALUE_DELIMITERS}]`));
      break;
    case exports.Type.Num:
      value = parseInt(text);
      break;
    case exports.Type.File:
      value = false;
      if (statSync(text).isFile()) value = path.resolve(text);
      break;
    case exports.Type.Path:
      value = false;
      if (statSync(path.resolve(text)).isDirectory())
        value = path.resolve(text);
      break;
  }
  if (typeof variable.do === 'function') value = variable.do(value);
  return value;
};

const importConfig = (fileName) => {
  const fileConfig = require(path.resolve(fileName));
  configuration = { ...configuration, ...fileConfig };
  return configuration;
};

const parseVariable = (variable) => {
  let value;
  try {
    value = argValue(variable) || defaultValue(variable);
    if (value === undefined) {
      if (variable.required) throw new Error(`missing required variable`);
    } else {
      value = castValue(value, variable);
    }
  } catch (error) {
    throw new Error(
      `'${variable.name}' ${error.message} (${variable.arg}=${value})`
    );
  }
  configuration[variable.name] = value;
  return value;
};

module.exports.compile = (setup = variables) => {
  try {
    setup
      .filter((variable) => variable.type === exports.Type.Config)
      .map((variable) => importConfig(parseVariable(variable)));
    setup
      .filter((variable) => variable.type !== exports.Type.Config)
      .map((variable) => parseVariable(variable));
    return configuration;
  } catch (error) {
    throw new Error(`Error: ${error.message}`);
  }
};

const addSingle = (type, param) => {
  let variable = { type };
  if (typeof param === 'string') variable.name = param;
  if (typeof param === 'object') {
    Object.keys(param).forEach((name) => {
      variable.name = name;
      Object.entries(param[name]).forEach(
        ([key, value]) => (variable[key] = value)
      );
    });
  }
  return variable;
};

const addAll = (type, params) => {
  params.forEach((param) => variables.push(addSingle(type, param)));
  return exports.expect;
};

module.exports.expect = {
  new: () => {
    variables = [];
    return exports.expect;
  },
  array: (...params) => addAll(exports.Type.Array, params),
  bool: (...params) => addAll(exports.Type.Bool, params),
  config: (...params) => addAll(exports.Type.Config, params),
  file: (...params) => addAll(exports.Type.File, params),
  num: (...params) => addAll(exports.Type.Num, params),
  path: (...params) => addAll(exports.Type.Path, params),
  string: (...params) => addAll(exports.Type.String, params),
  save: () => variables,
};
