import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Interface,AbiCoder,id,ZeroHash,solidityPackedKeccak256} from 'ethers';
import {createRequire} from 'node:module';
const tool=createRequire(new URL('../tools/verification/package.json',import.meta.url));
const {createVM,runTx}=tool('@ethereumjs/vm'),{Common,Mainnet,Hardfork}=tool('@ethereumjs/common'),{createLegacyTx}=tool('@ethereumjs/tx'),{createAccount,createAddressFromPrivateKey,hexToBytes,bytesToHex}=tool('@ethereumjs/util');
test('actual EVM contract rejects another wallet, overwritten evidence and skipped history',async()=>{
 const common=new Common({chain:Mainnet,hardfork:Hardfork.Shanghai}),vm=await createVM({common});
 const writerKey=hexToBytes('0x'+'20'.repeat(32)),attackerKey=hexToBytes('0x'+'30'.repeat(32)),writer=createAddressFromPrivateKey(writerKey),attacker=createAddressFromPrivateKey(attackerKey);
 for(const address of [writer,attacker])await vm.stateManager.putAccount(address,createAccount({balance:10n**20n,nonce:0n}));
 const artifact=JSON.parse(await readFile(new URL('../deploy/contracts/EvidenceAnchor.artifact.json',import.meta.url),'utf8')),abi=new Interface(artifact.abi),coder=AbiCoder.defaultAbiCoder();
 async function transact(key,to,data){const sender=createAddressFromPrivateKey(key),account=await vm.stateManager.getAccount(sender),tx=createLegacyTx({nonce:account.nonce,gasLimit:3000000n,gasPrice:10000000000n,...(to?{to}:{}),data:hexToBytes(data)},{common}).sign(key);return runTx(vm,{tx});}
 const deployed=await transact(writerKey,null,artifact.bytecode+coder.encode(['address'],[writer.toString()]).slice(2));assert.equal(deployed.execResult.exceptionError,undefined);assert.ok(deployed.createdAddress);const contract=deployed.createdAddress;
 const stream=id('fixture-public-stream'),first=id('first-fixture-digest'),second=id('second-fixture-digest');
 const anchor=(key,sequence,previous,digest)=>transact(key,contract,abi.encodeFunctionData('anchor',[stream,sequence,previous,digest]));
 async function read(name,args){const result=await vm.evm.runCall({caller:writer,to:contract,data:hexToBytes(abi.encodeFunctionData(name,args)),gasLimit:1000000n,isStatic:true});assert.equal(result.execResult.exceptionError,undefined);return abi.decodeFunctionResult(name,bytesToHex(result.execResult.returnValue));}
 assert.ok((await anchor(attackerKey,1,ZeroHash,first)).execResult.exceptionError);
 assert.equal((await anchor(writerKey,1,ZeroHash,first)).execResult.exceptionError,undefined);
 assert.equal((await read('digests',[solidityPackedKeccak256(['bytes32','uint64'],[stream,1])]))[0],first);
 for(const [sequence,previous] of [[1,ZeroHash],[3,first],[2,ZeroHash]])assert.ok((await anchor(writerKey,sequence,previous,second)).execResult.exceptionError);
 assert.equal((await anchor(writerKey,2,first,second)).execResult.exceptionError,undefined);const checkpoint=await read('streams',[stream]);assert.equal(checkpoint[0],2n);assert.equal(checkpoint[1],second);
});
