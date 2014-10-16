var packagesConfig = {
  "version": "0.1.0",
  "revision": "ae6f6dec092d756edbd806a41d96683b272e152e",
  "vendored": {},
  "dependencies": {
    "htmlbars": {
      "node": true,
      "lib": [
        "handlebars",
        "morph",
        "simple-html-tokenizer",
        "htmlbars-compiler",
        "htmlbars-runtime"
      ]
    },
    "htmlbars-compiler": {
      "node": true,
      "lib": [
        "handlebars",
        "simple-html-tokenizer",
        "morph"
      ],
      "test": [
        "htmlbars-runtime"
      ]
    },
    "htmlbars-runtime": {
      "lib": [
        "handlebars",
        "morph"
      ]
    },
    "morph": {
      "test": [
        "handlebars"
      ]
    }
  }
};