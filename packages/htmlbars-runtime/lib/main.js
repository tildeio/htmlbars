import { DOMHelper } from "./dom-helper";
import { Morph } from "./morph";

export function hydrate(spec, options) {
  return spec(new DOMHelper(document), Morph);
}
