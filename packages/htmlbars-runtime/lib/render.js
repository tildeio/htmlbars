import { forEach } from "../htmlbars-util/array-utils";
import { visitChildren } from "../htmlbars-util/morph-utils";
import ExpressionVisitor from "./node-visitor";
import { AlwaysDirtyVisitor } from "./node-visitor";
import Morph from "./morph";
import { clearMorph } from "../htmlbars-util/template-utils";
import voidMap from '../htmlbars-util/void-tag-names';

var svgNamespace = "http://www.w3.org/2000/svg";

export default function render(template, env, scope, options) {
  var dom = env.dom;
  var contextualElement;

  if (options) {
    if (options.renderNode) {
      contextualElement = options.renderNode.contextualElement;
    } else if (options.contextualElement) {
      contextualElement = options.contextualElement;
    }
  }

  dom.detectNamespace(contextualElement);

  var renderResult = RenderResult.build(env, scope, template, options, contextualElement);
  renderResult.render();

  return renderResult;
}

export function RenderResult(env, scope, options, rootNode, ownerNode, nodes, fragment, template, shouldSetContent) {
  this.root = rootNode;
  this.fragment = fragment;

  this.nodes = nodes;
  this.template = template;
  this.statements = template.statements.slice();
  this.env = env;
  this.scope = scope;
  this.shouldSetContent = shouldSetContent;

  this.bindScope();

  if (options.self !== undefined) { this.bindSelf(options.self); }
  if (options.blockArguments !== undefined) { this.bindLocals(options.blockArguments); }

  this.initializeNodes(ownerNode);
}

RenderResult.build = function(env, scope, template, options, contextualElement) {
  var dom = env.dom;
  var fragment = getCachedFragment(template, env);
  var nodes = template.buildRenderNodes(dom, fragment, contextualElement);

  var rootNode, ownerNode, shouldSetContent;

  if (options && options.renderNode) {
    rootNode = options.renderNode;
    ownerNode = rootNode.ownerNode;
    shouldSetContent = true;
  } else {
    // creating the root render node
    rootNode = dom.createMorph(null, fragment.firstChild, fragment.lastChild, contextualElement);
    ownerNode = rootNode;
    initializeNode(rootNode, ownerNode);
    shouldSetContent = false;
  }

  if (rootNode.childNodes) {
    visitChildren(rootNode.childNodes, function(node) {
      clearMorph(node, env, true);
    });
  }

  rootNode.childNodes = nodes;
  return new RenderResult(env, scope, options, rootNode, ownerNode, nodes, fragment, template, shouldSetContent);
};

RenderResult.rehydrate = function(env, scope, template, options) {
  let rootNode = options.renderNode;
  let ownerNode = rootNode.ownerNode;
  let shouldSetContent = false;

  return new RenderResult(env, scope, options, rootNode, ownerNode, rootNode.childNodes, null, template, shouldSetContent);
};

export function manualElement(tagName, attributes, _isEmpty) {
  var statements = [];

  for (var key in attributes) {
    if (typeof attributes[key] === 'string') { continue; }
    statements.push(["attribute", key, attributes[key]]);
  }

  var isEmpty = _isEmpty || voidMap[tagName];

  if (!isEmpty) {
    statements.push(['content', 'yield']);
  }

  var template = {
    arity: 0,
    cachedFragment: null,
    hasRendered: false,
    buildFragment: function buildFragment(dom) {
      var el0 = dom.createDocumentFragment();
      if (tagName === 'svg') {
        dom.setNamespace(svgNamespace);
      }
      var el1 = dom.createElement(tagName);

      for (var key in attributes) {
        if (typeof attributes[key] !== 'string') { continue; }
        dom.setAttribute(el1, key, attributes[key]);
      }

      if (!isEmpty) {
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
      }

      dom.appendChild(el0, el1);

      return el0;
    },
    buildRenderNodes: function buildRenderNodes(dom, fragment) {
      var element = dom.childAt(fragment, [0]);
      var morphs = [];

      for (var key in attributes) {
        if (typeof attributes[key] === 'string') { continue; }
        morphs.push(dom.createAttrMorph(element, key));
      }

      if (!isEmpty) {
        morphs.push(dom.createMorphAt(element, 0, 0));
      }

      return morphs;
    },
    statements: statements,
    locals: [],
    templates: []
  };

  return template;
}

export function attachAttributes(attributes) {
  var statements = [];

  for (var key in attributes) {
    if (typeof attributes[key] === 'string') { continue; }
    statements.push(["attribute", key, attributes[key]]);
  }

  var template = {
    arity: 0,
    cachedFragment: null,
    hasRendered: false,
    buildFragment: function buildFragment(dom) {
      var el0 = this.element;
      if (el0.namespaceURI === "http://www.w3.org/2000/svg") {
        dom.setNamespace(svgNamespace);
      }
      for (var key in attributes) {
        if (typeof attributes[key] !== 'string') { continue; }
        dom.setAttribute(el0, key, attributes[key]);
      }

      return el0;
    },
    buildRenderNodes: function buildRenderNodes(dom) {
      var element = this.element;
      var morphs = [];

      for (var key in attributes) {
        if (typeof attributes[key] === 'string') { continue; }
        morphs.push(dom.createAttrMorph(element, key));
      }

      return morphs;
    },
    statements: statements,
    locals: [],
    templates: [],
    element: null
  };

  return template;
}

RenderResult.prototype.initializeNodes = function(ownerNode) {
  forEach(this.root.childNodes, function(node) {
    initializeNode(node, ownerNode);
  });
};

RenderResult.prototype.render = function() {
  this.root.lastResult = this;
  this.root.rendered = true;
  this.populateNodes(AlwaysDirtyVisitor);

  if (this.shouldSetContent && this.root.setContent) {
    this.root.setContent(this.fragment);
  }
};

RenderResult.prototype.dirty = function() {
  visitChildren([this.root], function(node) { node.isDirty = true; });
};

RenderResult.prototype.revalidate = function(env, self, blockArguments, scope) {
  this.revalidateWith(env, scope, self, blockArguments, ExpressionVisitor);
};

RenderResult.prototype.rerender = function(env, self, blockArguments, scope) {
  this.revalidateWith(env, scope, self, blockArguments, AlwaysDirtyVisitor);
};

RenderResult.prototype.revalidateWith = function(env, scope, self, blockArguments, visitor) {
  if (env !== undefined) { this.env = env; }
  if (scope !== undefined) { this.scope = scope; }
  this.updateScope();

  if (self !== undefined) { this.updateSelf(self); }
  if (blockArguments !== undefined) { this.updateLocals(blockArguments); }

  this.populateNodes(visitor);
};

RenderResult.prototype.destroy = function() {
  var rootNode = this.root;
  clearMorph(rootNode, this.env, true);
};

RenderResult.prototype.populateNodes = function(visitor) {
  var env = this.env;
  var scope = this.scope;
  var template = this.template;
  var nodes = this.nodes;
  var statements = this.statements;
  var i, l;

  for (i=0, l=statements.length; i<l; i++) {
    var statement = statements[i];
    var morph = nodes[i];

    if (env.hooks.willRenderNode) {
      env.hooks.willRenderNode(morph, env, scope);
    }

    switch (statement[0]) {
      case 'block': visitor.block(statement, morph, env, scope, template, visitor); break;
      case 'inline': visitor.inline(statement, morph, env, scope, visitor); break;
      case 'content': visitor.content(statement, morph, env, scope, visitor); break;
      case 'element': visitor.element(statement, morph, env, scope, template, visitor); break;
      case 'attribute': visitor.attribute(statement, morph, env, scope); break;
      case 'component': visitor.component(statement, morph, env, scope, template, visitor); break;
    }

    if (env.hooks.didRenderNode) {
      env.hooks.didRenderNode(morph, env, scope);
    }
  }
};

RenderResult.prototype.bindScope = function() {
  this.env.hooks.bindScope(this.env, this.scope);
};

RenderResult.prototype.updateScope = function() {
  this.env.hooks.updateScope(this.env, this.scope);
};

RenderResult.prototype.bindSelf = function(self) {
  this.env.hooks.bindSelf(this.env, this.scope, self);
};

RenderResult.prototype.updateSelf = function(self) {
  this.env.hooks.updateSelf(this.env, this.scope, self);
};

RenderResult.prototype.bindLocals = function(blockArguments) {
  var localNames = this.template.locals;

  for (var i=0, l=localNames.length; i<l; i++) {
    this.env.hooks.bindLocal(this.env, this.scope, localNames[i], blockArguments[i]);
  }
};

RenderResult.prototype.updateLocals = function(blockArguments) {
  var localNames = this.template.locals;

  for (var i=0, l=localNames.length; i<l; i++) {
    this.env.hooks.updateLocal(this.env, this.scope, localNames[i], blockArguments[i]);
  }
};

function initializeNode(node, owner) {
  node.ownerNode = owner;
}

export function createChildMorph(dom, parentMorph, contextualElement) {
  var morph = Morph.empty(dom, contextualElement || parentMorph.contextualElement);
  initializeNode(morph, parentMorph.ownerNode);
  return morph;
}

export function getCachedFragment(template, env) {
  var dom = env.dom, fragment;
  if (env.useFragmentCache && dom.canClone) {
    if (template.cachedFragment === null) {
      fragment = template.buildFragment(dom);
      if (template.hasRendered) {
        template.cachedFragment = fragment;
      } else {
        template.hasRendered = true;
      }
    }
    if (template.cachedFragment) {
      fragment = dom.cloneNode(template.cachedFragment, true);
    }
  } else if (!fragment) {
    fragment = template.buildFragment(dom);
  }

  return fragment;
}

export function rehydrateNode(serializedNodes, renderNode) {
  let dom = renderNode.domHelper;
  let context = renderNode.firstNode.parentNode;
  let cache = Object.create(null);

  renderNode.childNodes = serializedNodes.map(childNode => _rehydrateNode(renderNode, childNode, dom, context, cache));
  return renderNode;
}

function _rehydrateNode(owner, renderNode, dom, context, cache) {
  let element, node;

  switch (renderNode.type) {
    case 'attr':
      element = elementFromId(dom, context, renderNode.element, cache);
      node = dom.createAttrMorph(element, renderNode.attrName);
      break;
    case 'range':
      element = elementFromId(dom, context, renderNode.parentNode, cache);
      node = dom.createMorphAt(element, renderNode.firstNode, renderNode.lastNode);
      node.lastYielded = LastYielded.fromTemplateId(renderNode.templateId);
      node.childNodes = renderNode.childNodes && renderNode.childNodes.map(childNode => _rehydrateNode(node, childNode, dom, context, cache));
      break;
  }

  initializeNode(node, owner);
  return node;
}

function elementFromId(dom, context, id, cache) {
  if (id in cache) {
    return cache[id];
  }

  let element = context.querySelector(`[data-hbs-node="${id}"]`);
  dom.removeAttribute(element, 'data-hbs-node');
  cache[id] = element;
  return element;
}

export function serializeNode(env, renderNode) {
  let serializationContext = { id: 0 };

  return renderNode.childNodes.map(childNode => _serializeNode(env, childNode, serializationContext));

  //return [{
    //type: 'attr',
    //element: "0",
    //attrName: 'title'
  //}, {
    //type: 'range',
    //parentNode: "0",
    //firstNode: 0,
    //lastNode: 0
  //}];
}

function _serializeNode(env, renderNode, serializationContext) {
  let dom = env.dom;
  if (renderNode instanceof dom.MorphClass) {
    let parent = renderNode.firstNode.parentNode;
    let { firstNode, lastNode } = parentOffsets(dom, parent, renderNode);

    return {
      type: 'range',
      childNodes: renderNode.childNodes && renderNode.childNodes.map(childNode => _serializeNode(env, childNode, serializationContext)),
      parentNode: idFromElement(dom, parent, serializationContext),
      templateId: renderNode.lastYielded && env.hooks.serializeLastYielded(env, renderNode),
      firstNode,
      lastNode
    };
  } else if (renderNode instanceof dom.AttrMorphClass) {
    return {
      type: 'attr',
      element: idFromElement(dom, renderNode.element, serializationContext),
      attrName: renderNode.attrName
    };
  }
}

function parentOffsets(dom, parent, renderNode) {
  let current = parent.firstChild;
  let firstNeedle = renderNode.firstNode;
  let lastNeedle = renderNode.lastNode;
  let firstNode, lastNode;

  while (current !== firstNeedle) {
    current = current.nextSibling;
  }

  firstNode = current;

  while (current !== lastNeedle) {
    current = current.nextSibling;
  }

  lastNode = current;

  return { firstNode, lastNode };
}

function idFromElement(dom, element, serializationContext) {
  let id = dom.getAttribute(element, 'data-hbs-node');

  if (id) {
    return id;
  }

  id = (serializationContext.id++) + '';
  dom.setAttribute(element, 'data-hbs-node', id);
  return id;
}

export function LastYielded(self, template, shadowTemplate, templateId) {
  this.self = self;
  this.template = template;
  this.shadowTemplate = shadowTemplate;
  this.templateId = templateId;
}

LastYielded.fromTemplateId = function(templateId)  {
  return new LastYielded(null, null, null, templateId);
};

LastYielded.prototype.isStableTemplate = function(nextTemplate) {
  return !this.shadowTemplate && nextTemplate === this.template;
};

