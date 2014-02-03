import { merge } from "htmlbars/utils";

export function domHelpers(extensions) {
  var base = {
    appendText: function(element, text) {
      element.appendChild(document.createTextNode(text));
    },

    setAttribute: function(element, name, value) {
      element.setAttribute(name, value);
    },

    removeAttribute: function(element, name) {
      element.removeAttribute(name);
    },

    createElement: function(tagName) {
      return document.createElement(tagName);
    },

    createDocumentFragment: function() {
      return document.createDocumentFragment();
    },

    getElementById: function(fragment, id) {
      // First time this is called, we decide whether
      // we want to use querySelector or getElementById depending
      // on browser availability. Then we use the same method
      // from then on.
      if (fragment.querySelector) {
        this.getElementById = this._queryForId;
      } else {
        this.getElementById = this._getElementById;
      }
      return this.getElementById(fragment, id);
    },

    _getElementById: function(fragment, id) {
      return fragment.getElementById(id);
    },

    _queryForId: function(fragment, id) {
      return fragment.querySelector('#' + id);
    }
  };

  return extensions ? merge(extensions, base) : base;
}
