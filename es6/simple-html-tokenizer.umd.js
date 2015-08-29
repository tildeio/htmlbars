/* global define:false, module:false */
import {
  EventedTokenizer, Tokenizer, tokenize, Generator, generate, StartTag, EndTag, Chars, Comment
} from './simple-html-tokenizer';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.HTML5Tokenizer = factory();
  }
}(this, function () {
  return {
    EventedTokenizer: EventedTokenizer,
    Tokenizer: Tokenizer,
    tokenize: tokenize,
    Generator: Generator,
    generate: generate,
    StartTag: StartTag,
    EndTag: EndTag,
    Chars: Chars,
    Comment: Comment
  };
}));
