# Status [![Build Status](https://travis-ci.org/tildeio/htmlbars.svg?branch=master)](https://travis-ci.org/tildeio/htmlbars) [![Sauce Test Status](https://saucelabs.com/buildstatus/htmlbars-ci)](https://saucelabs.com/u/htmlbars-ci)

HTMLBars is a layer built on top of the Handlebars template compiler.

# Goals

The goal of HTMLBars is to have a compiler for Handlebars that
builds a DOM rather than a String.

This means that helpers can have special behavior based on their
context (they know if they are inside an `<a>` tag, inside an
attribute, etc.)

Ultimately, the goal is to have a good data binding setup for
Handlebars that can work directly against DOM nodes and doesn't
need special tags in the String for the data binding code to work
(a major limitation in Ember).

There are also many performance gains in HTMLBars' approach to building
DOM vs the HTML-unaware string building approach of Handlebars.

# Security 

HTMLBars aims to not only ease interacting with data-bound templates,
but also to provide it in a secure-by-default way. Thanks to the design
of HTMLBars it has both handlebars and HTML awareness, this allows for
best practices by default. For example:

```hbs
<div>{{fullName}}</div>
```

ultimately becomes:

```
var div = document.createElement('div');
div.textContent = fullName; // when fullName changes
```

In this example, HTMLBars is aware that values set to `textContent` on a `div`
is treated by the browser as inert text. In other words, in this scenario HTMLBars
knows the content is safe, and no escaping is required.

HTML has many interesting contexts, in each HTMLBars aims to do the right thing.
This may be, using the correct browser API, sanatizing, or disabling a feature 
entirely.

Needless to say, we take security very seriously. If there is something we missed, 
please report via the [Ember.js responsible security disclosure system](http://emberjs.com/security/).

# Usage

TODO: much change. This section will be updated shortly.

Until then, check out [ARCHITECTURE.md](ARCHITECTURE.md) for
info on how HTMLBars is structured and its approach to efficiently building / emitting DOM.

# Building HTMLBars

1. Ensure that [Node.js](http://nodejs.org/) is installed.
2. Run `npm install` to ensure the required dependencies are installed.
3. Run `npm run-script build` to build HTMLBars. The builds will be placed in the `dist/` directory.

# How to Run Tests

## Via Ember CLI

1. Run: `ember test --server`

Ember CLI is a CI tool, so it will run tests as you change files.

## On the console with PhantomJS

1. Run `npm test`.

## In a browser

1. Run `npm start`.
2. Visit <http://localhost:4200/tests/>.
