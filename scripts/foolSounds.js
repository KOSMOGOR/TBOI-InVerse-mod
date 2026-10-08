import * as fs from "fs";

let path = './mod/resources/sfx/Fool/';
let files = fs.readdirSync(path);

function ToName(s) {
    return s.length > 0 ? s[0].toUpperCase() + s.slice(1).split('.')[0] : s;
}

let xmls = files.map(file => `<sound name="Fool${ToName(file)}"> <sample weight="1" path="Fool/${file}" /> </sound>`).join('\n')
console.log(xmls);

let code = `const FoolSounds: [string, SoundEffect, float?][] = [
${files.map(file => `\t["${ToName(file)}", Isaac.GetSoundIdByName("Fool${ToName(file)}")],`).join('\n')}
];`;
console.log('\n' + code);