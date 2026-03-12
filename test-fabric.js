const fabric = require('fabric');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const dom = new JSDOM(`<!DOCTYPE html><canvas id="c"></canvas>`);
global.window = dom.window;
global.document = dom.window.document;
const canvas = new fabric.Canvas('c');
console.log("Canvas methods:");
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(canvas)).filter(n => n.toLowerCase().includes('mouse') || n.toLowerCase().includes('pointer')));
