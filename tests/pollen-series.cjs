const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('index.html','utf8');
const code = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)[1];
const context = vm.createContext({console,document:{addEventListener(){},getElementById(){return null}},window:{addEventListener(){}}});
vm.runInContext(code,context);
const site={id:'test',name:'Test'};
const fixture={Moments:['2026-05-01','2026-05-02'],CubicMeters:[10,10],Counts:{}};
function values(data){context.data=data;context.site=site;return [...vm.runInContext('buildPollenSenseSeries(data,site).points.values()',context)];}
assert.deepEqual(values(fixture),[0,0]);
assert.deepEqual(values({...fixture,Counts:{Olea:[20,0],Fraxinus:[10,10]}}),[3,1]);
assert.deepEqual(values({...fixture,CubicMeters:[0,10]}),[null,0]);
assert.deepEqual(values({...fixture,Counts:{Olea:[null,0]}}),[null,0]);
assert.deepEqual(values({...fixture,Moments:['invalid','2026-05-02']}),[0]);
console.log('Passed: active zero, counts, no-volume gaps, missing counts, invalid dates; JS syntax valid.');
