'use strict';
const fs=require('fs');
const input = './package.json';
const output = './src/info.json'
fs.readFile(input, (err,data)=>{
    if(err){throw err}
    const npmPack = JSON.parse(data)
    const info=JSON.stringify({version:npmPack.version});
    fs.writeFileSync(output,info)
})