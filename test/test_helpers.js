import { domHelpers } from "htmlbars/runtime/dom_helpers";
import { domStringHelpers } from "htmlbars/runtime/domstring_helpers";

export var dom = domHelpers({
  fragmentToString: function(fragment){
    var div = document.createElement("div");
    div.appendChild(fragment.cloneNode(true));
    return div.innerHTML;
  },

  fragmentToDocumentFragment: function(fragment) {
    return fragment;
  }
});

export var domString = domStringHelpers({
  fragmentToString: function(fragment) {
    return fragment.toString();
  },

  fragmentToDocumentFragment: function(fragment) {
    var f = document.createDocumentFragment();
    var d = document.createElement( 'div' ); //can't use innerHTML on documentFragment
    d.innerHTML = fragment.toString();

    while(d.childNodes.length > 0) {
      f.appendChild(d.childNodes[0]);
    }

    return f;
  }
});

export function equalHTML(fragment, html) {
  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));

  QUnit.push(div.innerHTML === html, div.innerHTML, html);
};

export function equalDomHTML(dom,fragment, html) {
  var string = dom.fragmentToString( fragment );

  QUnit.push(string === html, string, html);
};

// Test all DOM representations
export function testDom(name, cb) {
  test( name + " - dom", function(){
    cb(dom);
  });

  test( name + " - domstring", function(){
//    try{
      cb(domString);
//    } catch(e) {
//      console.log(e.stack);
//      throw e;
//    }
  });
}
