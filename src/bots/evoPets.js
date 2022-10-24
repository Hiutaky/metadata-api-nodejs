import ActiveInstance from "../core/ActiveInstance.js"
import {utils, BigNumber} from "ethers"
import { CNS } from '@cnsdomains/core'
import baseConfig from "../constants.json"
import evoUtils from "../utils/evoUtils.js"
import PetArtifacts from "../abi/EvoPet.json";


//initialize the new Instance
const petColl = new ActiveInstance({
    apiKey: baseConfig.API_KEY,
    baseURI: baseConfig.BASE_URI,
    RPC: baseConfig.RPC,
    type: "collections",
    slug: "seasonalpet",
})


//mounting contract and related ABI
petColl.mountContract(
    "0xB77959DC7a12F7549ACC084Af01259Fc48813c89",
    PetArtifacts.abi
)
//registering beforeStart callbacks
petColl.beforeStart(
    async () => {
        //update total supply
        await updateTotalSupply()
        await updateAllEvoPets()
    }
)
//register events callbacks 
//eventName => callBackFunction()
petColl.addEventCallback(
    {
        Transfer: async (args) => {
            //await TransferCallBack(args)
        },
        EvoLevelUp: async (args) => {
            await EvoLevelUp(args)
        }
    } 
)

let { apiAdapter, config, contract, provider } = petColl
const cns = new CNS("0x19", provider)

const updateAllEvoPets = async () => {
    console.log(`- Updating all EvoPets`)
    let supply = (await contract.totalSupply()).toString()
    let timer = 5
    for( let i = 1; i <= supply; i++) {
        setTimeout( async () => {
            let tokenId = i// args.a.toString()
            let entryId = await apiAdapter.get({
                ...config,
                payload: {
                    "filter": {
                        "tokenId": tokenId
                    }
                }
            })
            let token = await getPet(contract,tokenId)
            let ownerOf = await evoUtils.getOwner(contract, tokenId)
            let cnsDomain = await cns.getName(ownerOf)
            let payload = token
            if( entryId.entries[0]  ){ //tokenExist in API
                payload = {
                    ...payload,
                    "_id": entryId.entries[0]._id
                }
            }else{//get tokenId and metadata
                let metadata = await fetch(`https://croskull.mypinata.cloud/ipfs/QmdsfQtarHc8BMkfHqyfX7gnoxHHeXeeLjMxY7qFHEZ3WP/${i}.json`)
                    metadata = (await metadata.json())
                payload = { 
                    ...payload,
                    "tokenId": i,
                    "metadata": metadata,
                }
            }
            payload = {
                ...payload,
                "cns": cnsDomain ? cnsDomain : false,
                "owner": ownerOf
            }
            await apiAdapter.save({
                ...config,
                payload: {
                    "data": payload
                }
            })
            console.log( `EvoPet ${i} updated` )
        } , `${ timer }50`)
        timer += 2
    }
}

const EvoLevelUp = async (args) => {
    console.log(`EvoLevelUp - EvoPet #${args}`)
}

const getPet = async (contract, tokenId) => {
    let keys = []
    let rawToken = await contract.getToken(tokenId)
    let token = rawToken.currentToken
    Object.keys(token).forEach((e, key) => {
        if( parseInt(e) <= 15 ) return
        keys.push(e)
    })
    let cleanEvo = []
    for(let i = 0; i < keys.length; i++){
        let k = keys[i]
        cleanEvo[k] =  token[k] instanceof BigNumber ? token[k].toString() : token[k]
    }
    return cleanEvo
}

const updateTotalSupply = async () => {
    let config = {
        type: "singletons",
        slug: "evoskull" 
    }
    let supply = (await petColl.contract.totalSupply()).toString()
    apiAdapter.save({
        ...config,
        payload: {
            "data": {
                "totalSupply": supply
            }
        }
    })
    console.log(
        `Total Supply updated to ${supply}.`
    )
}


export default petColl