const fabric = require('fabric');
const brightness = new fabric.filters.Brightness({ brightness: 0.1 });
console.log(brightness);
console.log(fabric.filters.Composed);
