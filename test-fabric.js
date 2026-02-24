import * as fabric from 'fabric';

async function test() {
  const text = new fabric.IText("hello", { fill: "#ffffff", textBackgroundColor: "#ff0000" });
  const json = text.toJSON(['textBackgroundColor']);
  console.log('Original JSON:', JSON.stringify(json));
  
  const text2 = await fabric.IText.fromObject(json);
  console.log('Restored fill:', text2.fill);
  console.log('Restored textBackgroundColor:', text2.textBackgroundColor);
}
test();
