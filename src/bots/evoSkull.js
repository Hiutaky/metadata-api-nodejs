import ActiveInstance from "../core/ActiveInstance.js"
import {utils, BigNumber} from "ethers"
import { CNS } from '@cnsdomains/core'
import baseConfig from "../constants.json"
import evoUtils from "../utils/evoUtils.js"
import EvoSkullArtifacts from "../abi/ERC721evo.json";


//initialize the new Instance
const evoColl = new ActiveInstance({
    apiKey: baseConfig.API_KEY,
    baseURI: baseConfig.BASE_URI,
    RPC: baseConfig.RPC,
    type: "collections",
    slug: "evoskull",
})


//mounting contract and related ABI
evoColl.mountContract(
    "0xbf4E430cD0ce8b93d4760958fe4ae66cDaCDB6c6",
    EvoSkullArtifacts.abi
)
//registering beforeStart callbacks
evoColl.beforeStart(
    async () => {
        //update total supply
        await updateTotalSupply()
        await updateAllEvoSkull()
    }
)
//register events callbacks 
//eventName => callBackFunction()
evoColl.addEventCallback(
    {
        Transfer: async (args) => {
            //await TransferCallBack(args)
        },
        EvoLevelUp: async (args) => {
            await EvoLevelUp(args)
        }
    } 
)

let { apiAdapter, config, contract, provider } = evoColl
const cns = new CNS("0x19", provider)

const updateAllEvoSkull = async () => {
    console.log(`- Updating all EvoSkulls`)
    let apiSupply = await apiAdapter.get({
        slug: "evoskull",
        type: "singletons"
    })
    apiSupply = apiSupply.totalSupply
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
            let token = await getToken(contract,tokenId)
            let ownerOf = await evoUtils.getOwner(contract, tokenId)
            let cnsDomain = await cns.getName(ownerOf)
            let payload = token
            if( entryId.entries[0]  ){ //tokenExist in API
                payload = {
                    ...payload,
                    "_id": entryId.entries[0]._id
                }
            }else{//get tokenId and metadata
                let hash = utils.keccak256(
                    utils.toUtf8Bytes( `${i}` )
                ).replace('0x','')
                let metadata = await fetch(`https://croskull.mypinata.cloud/ipfs/QmTmqi1k5KWv988iidG4wyu1WBuQBiqYUARB2xsRU2Q4pT/${hash}.json`)
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
            console.log( `EvoSkull ${i} updated` )
        } , `${ timer }00`)
        timer++
    }
}

const EvoLevelUp = async (args) => {
    console.log(`EvoLevelUp - EvoSkull #${args}`)
}


const getToken = async (contract, tokenId) => {
    let keys = []
    let rawToken = await contract.getToken(tokenId)
    let token = rawToken.currentToken
    Object.keys(token).forEach((e, key) => {
        if( parseInt(e) <= 17 ) return
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
    let supply = (await evoColl.contract.totalSupply()).toString()
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


export default evoColl