const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!DOCTYPE html><html><body><canvas id='c'></canvas></body></html>");
global.document = dom.window.document;
global.window = dom.window;
const fabric = require("fabric");
const text = new fabric.IText("hello", { fill: "#ffffff", textBackgroundColor: "#ff0000" });
console.log(text.toJSON(['textBackgroundColor']));
