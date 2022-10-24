import ActiveInstance from "../core/ActiveInstance.js"
import {constants} from "ethers"
import PetArtifacts from "../abi/EvoPet.json";
import exec from "child_process"

//initialize the new Instance
const petColl = new ActiveInstance({
    RPC: "https://cronos-testnet-3.crypto.org:8545" //baseConfig.RPC
})


//mounting contract and related ABI
petColl.mountContract(
    "0x7EeFe647C6ae391b63930BF1cFa64fa30FEeD1dc",
    PetArtifacts.abi
)
//register events callbacks 
//eventName => callBackFunction()
petColl.addEventCallback(
    {
        Transfer: async (args) => {
            await revealMetadata(args)
        }
    } 
)

let { contract } = petColl

const revealMetadata = async (args) => {
    const from = args.a
    const tokenId = args.c.toString()
    if( from == constants.AddressZero ) {
        console.log( `minted ${tokenId}`)
        exec(`./reveal.sh build/json/${tokenId}.json`, (error, stdout, stderr) => {
            if( error )
                console.error(error)
            
            console.log(`Reveal Metadata`, stdout)
        })
        exec(`./reveal.sh build/images/${tokenId}.webp`, (error, stdout, stderr) => {
            if( error )
                console.error(error)
            
            console.log(`Reveal Image`, stdout)
        })
    }
}

await petColl.start()