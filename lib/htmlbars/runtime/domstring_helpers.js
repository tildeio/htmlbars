import { merge } from "htmlbars/utils";

function DomStringDocumentFragment( ownerDocument ) {
  this.ownerDocument = ownerDocument;
  this.childNodes = [];
}

DomStringDocumentFragment.prototype.appendChild = function( child ) {
  this.childNodes.push( child );
};

DomStringDocumentFragment.prototype.insertBefore = function( child, anchor ) {
  var idx = this.childNodes.indexOf( anchor );

  //TODO: if child already exist on the list, it needs to be removed first

  if( idx >= 0 ) {
    this.childNodes.splice( idx, 0, child );
  } else {
    this.childNodes.push( child );
  }
};

DomStringDocumentFragment.prototype.cloneNode = function() {
  var res = new DomStringDocumentFragment( this.ownerDocument );

  this.childNodes.forEach( function( child ){
    res.appendChild( child.cloneNode() );
  });

  return res;
};

DomStringDocumentFragment.prototype.toString = function() {
  var res = "";

  this.childNodes.forEach( function( child ) {
    res += child.toString();
  });

  return res;
};

function DomStringElement( tagName ) {
  this.tagName = tagName;
  this.attributes = {};
  this.childNodes = [];
}

DomStringElement.prototype.appendChild = function( child ) {
  this.childNodes.push( child );
};

DomStringElement.prototype.createComment = function( comment ) {
  this.appendChild( new DomStringCommentNode( comment ) );
};

DomStringElement.prototype.insertBefore = function( child, anchor ) {
  var idx = this.childNodes.indexOf( anchor );

  //TODO: if child already exist on the list, it needs to be removed first

  if( idx >= 0 ) {
    this.childNodes.splice( idx, 0, child );
  } else {
    this.childNodes.push( child );
  }
};

DomStringElement.prototype.cloneNode = function() {
  var res = new DomStringElement( this.tagName );

  this.childNodes.forEach( function( child ){
    res.appendChild( child.cloneNode() );
  });

  for( var attr in this.attributes ) {
    res.setAttribute( attr, this.attributes[ attr ] );
  }

  return res;
};

DomStringElement.prototype.setAttribute = function( name, value ) {
  this.attributes[ name ] = value;
};

DomStringElement.prototype.toString = function() {
  var res = "<" + this.tagName;

  // TODO: support <input disabled> syntax
  // TODO: support <br/> syntax
  // TODO: check unicode entities
  for( var attr in this.attributes ) {
    res += ' ' + attr + '=' + '"' + this.attributes[ attr ] + '"';
  }

  res += '>';

  this.childNodes.forEach( function( child ) {
    res += child.toString();
  });

  res += '</' + this.tagName + '>';

  return res;
};

function DomStringTextNode( text ) {
  this.text = text;
}

DomStringTextNode.prototype.cloneNode = function() {
  return new DomStringTextNode( this.text );
};

DomStringTextNode.prototype.toString = function() {
  return this.text;
};

export function domStringHelpers(extensions) {
  var document;

  var base = {
    appendText: function(element, text) {
      element.appendChild( new DomStringTextNode( text ) );
    },

    createElement: function(tagName) {
      return new DomStringElement( tagName );
    },

    createTextNode: function( text ) {
      return new DomStringTextNode( text );
    },

    createDocumentFragment: function() {
      return new DomStringDocumentFragment( document );
    },
  };

  document = extensions ? merge(extensions, base) : base;

//  window.dsd = document;

  return document;
}

export function runtimeHelpers( dom ) {
  var metamorphId = 0;

  function getMetamorphPair(){
    var res = [ dom.createElement( 'script' ), dom.createElement( 'script' ) ];

    //This naming scheme allows for easy finding end node, having the start one (get id of start, append '-end', document.getElementById).
    //Might be helpful in runtime. Or not.
    res[0].setAttribute( 'id', 'metamorph-' + metamorphId );
    res[1].setAttribute( 'id', 'metamorph-' + metamorphId + '-end' );

    metamorphId++;

    return res;
  };

  var helpers = {
    //TODO: ELEMENT, SUBEXPR, maybe LOOKUP_HELPER, ATTRIBUTE
    //TODO: all helpers

    CONTENT: function(placeholder, helperName, context, params, options, helpers) {
      var metamorphs = getMetamorphPair();

      placeholder.appendChild( metamorphs[ 0 ] );

      if (helperName === 'if') {
        options.helpers = helpers;
        if (context[params[0]]) {
          placeholder.appendChild(
            options.render(context, options)
          );
        } else {
          placeholder.appendChild(
            options.inverse(context, options)
          );
        }
      } else {
        placeholder.appendText(context[helperName]);
      }

      placeholder.appendChild( metamorphs[ 1 ] );
    }
  };

  return helpers;
}
