import solc from 'solc';
import {readFile,writeFile} from 'node:fs/promises';
const source=await readFile('deploy/contracts/EvidenceAnchor.sol','utf8');
const output=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources:{'EvidenceAnchor.sol':{content:source}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}})));
if(output.errors?.some(error=>error.severity==='error'))throw new Error(output.errors.filter(error=>error.severity==='error').map(error=>error.formattedMessage).join('\n'));
const contract=output.contracts['EvidenceAnchor.sol'].EvidenceAnchor;
await writeFile('deploy/contracts/EvidenceAnchor.artifact.json',JSON.stringify({compiler:solc.version(),abi:contract.abi,bytecode:'0x'+contract.evm.bytecode.object},null,2));
console.log('EvidenceAnchor compiled with optimizer and Shanghai EVM target.');
