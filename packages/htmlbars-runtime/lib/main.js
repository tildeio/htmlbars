import { DOMHelper } from "./dom-helper";

export function hydrate(spec, options) {
  return spec(new DOMHelper(document));
}
