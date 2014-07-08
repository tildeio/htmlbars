import { isFunction, isEmpty } from "./utils";

export function ifHelper(params, options, env) {
  var template, condition = params[0];

  if (isFunction(condition)) {
    condition = condition.call(options.context);
  }

  if ((!options.hash.includeZero && !condition) || isEmpty(condition)) {
    template = options.inverse;
  } else {
    template = options.render;
  }

  if (template) {
    return template(options.context, env);
  }
}

export function unlessHelper(params, options, env) {
  var temp = options.render;
  options.render = options.inverse;
  options.inverse = temp;

  return ifHelper(params, options, env);
}

export function withHelper(params, options, env) {
  var template = options.render;
  var newContext = params[0];

  if (isFunction(newContext)) {
    newContext = newContext.call(this);
  }

  if (!isEmpty(newContext) && template) {
    return template(newContext, env);
  }
}

export default {
  'if': ifHelper,
  'unless': unlessHelper,
  'with': withHelper
};
