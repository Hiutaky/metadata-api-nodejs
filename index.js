const path = require('path')
const { HOST } = require('./src/constants')
const db = require('./src/database')
const ethers = require('ethers')
var request = require('request');
const {utils} = ethers
const PORT = process.env.PORT || 5000
const contractAddress = "0xbf4E430cD0ce8b93d4760958fe4ae66cDaCDB6c6"
const RPC = `https://gateway.nebkas.ro`
const provider = new ethers.providers.JsonRpcProvider(RPC)
const evoContract = new ethers.Contract(
  contractAddress,
  [
    'function ownerOf(uint256 tokenId) external view returns(address owner)',
    'function totalSupply() external view returns(uint256 supply)'
  ],
  provider
)

const cockpit = {
  api: "account-b567bb51be460ba2db3181632f20e3",
  collectionEndpoint: "https://api.croskull.com/api/collections/",
  singletonsEndpoint: "https://api.croskull.com/api/singletons/",
  evoskull: "evoskull",
  bank: "bank"
}

const skullApi = {
  getToken: () => `${cockpit.collectionEndpoint}get/${cockpit.evoskull}`,
  saveToken: () => `${cockpit.collectionEndpoint}save/${cockpit.evoskull}?token=${cockpit.api}`,
  getEvoInfo: () => `${cockpit.singletonsEndpoint}get/${cockpit.evoskull}`,
  saveEvoInfo: () => `${cockpit.singletonsEndpoint}save/${cockpit.evoskull}?token=${cockpit.api}`,
  getBankInfo: () => `${cockpit.singletonsEndpoint}get/${cockpit.bank}`,
  saveBankInfo: () => `${cockpit.singletonsEndpoint}save/${cockpit.bank}?token=${cockpit.api}`,
}

const getTotalSupply = async () => {
  let supply = (await evoContract.totalSupply()).toString()
  return supply
}

const evoEndpoint = {
  updateTotalSupply: async () => {
    let supply = await getTotalSupply()
    const payload = {
      method: "POST",
      url: skullApi.saveEvoInfo(),
      body: JSON.stringify({
        "data": {
          "totalSupply": supply
        }
      }),
      headers: {
        'Content-Type': 'application/json'
      },
    }
    request(payload, (e, res) => {
      if (e) throw new Error(e);
      console.log(res)
      console.log(`Token Supply updated Succesful: ${supply}`)
    })
  }
}

async function  main () {
  //fist token refresh
  await updateTokensMetadata()
  initEventListner()

}

/***
 * 
    event Evocation( uint indexed tokenId, uint power, address owner, uint timestamp );
    event EvoOutOfStamina( uint indexed tokenId, uint timestamp );
    event EvoLevelUp( uint indexed tokenId, uint level, uint timestamp );
    event EvoBattle( uint indexed tokenWinner, uint indexed tokenLoser);
    event EvoSadMalus( uint indexed tokenId, uint power );
    event EvoFreezeMalus( uint indexed tokenId, uint unfreezeTimestamp );
    event EvoHungryMalus( uint indexed tokenId, uint stamina );
 */
const evoEvents = [
  "Evocation( uint, uint, address, uint )",
  "EvoOutOfStamina( uint, uint )",
  "EvoLevelUp( uint, uint, uint )",
  "EvoBattle( uint, uint )",
  "EvoSadMalus( uint, uint )",
  "EvoFreezeMalus( uint, uint )",
  "EvoHungryMalus( uint, uint )",
];

const loadEvents = () => {
  return evoEvents.map( (event) => utils.id(event) )
}

const initEventListner = async () => {
  console.log(loadEvents())
  filter = {
    address: contractAddress,
    topics: [
        loadEvents()
        // the name of the event, parnetheses containing the data type of each event, no spaces
        //utils.id("Transfer(address,address,uint256)")
    ]
  }
  provider.on(filter, (a,b,c) => {
    console.log(a,b,c)
      // do whatever you want here
      // I'm pretty sure this returns a promise, so don't forget to resolve it
  })
}

const updateTokensMetadata =  async () => {
  request({
    'method': 'GET',
    'url': skullApi.getEvoInfo()
    }, async (e, res) => {
      res = JSON.parse(res.body)
      let apiSupply = res.totalSupply
      let supply = await getTotalSupply()
      console.log(apiSupply, supply)
      if( apiSupply == supply ) {
        console.log(`Evo Tokens already updated.`)
        return
      }
      await evoEndpoint.updateTotalSupply()
      for( let i = 1; apiSupply <= supply; apiSupply++, i++ ){
        let tokenId = apiSupply
        const tokenMetadata = db[apiSupply-1]
        let options = {
          'method': 'POST',
          'url': skullApi.getToken(),
          'headers': {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            "filter": {
              "tokenId": `${tokenId}`
            }
          })
        }
        setTimeout(() => {
          request(options, function (error, response) {
            if (error) throw new Error(error);
            response = JSON.parse(response.body)
            if( ! response.total ) {
              console.log(`Adding Token: ${tokenId}`)
              let reqOption = {
                'method': 'POST',
                'url': skullApi.saveToken(),
                'headers': {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  "data": {
                    "tokenId": `${tokenId}`,
                    "metadata": tokenMetadata
                  }
                })
              }
      
              request(reqOption, function (error, response) {
                if (error) throw new Error(error); 
                  console.log( `success `)
              })
            }else{
              console.log(`Token ${tokenId} already exist`)
            }
          })
        }, `${i}000`)
      }
    }
  )
}



/*
const app = express()
  .set('port', PORT)
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')

// Static public files
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', function(req, res) {
  res.send('CroSkull API v0.1');
})

app.get('/api/evoskull/:token_id', async function(req, res) {
  const tokenId = parseInt(req.params.token_id).toString()
  let data = {};
  if( tokenId ) {
    await getTotalSupply().then(
      (supply) => {
        console.log( supply )
        if( supply && tokenId <= supply ){
            const { description, name, image } = db[tokenId]
          
            data = {
              'name': name,
              'description': description,
              'image': `${image}`
          }
        }else{
          data = {
            'error': 'Token not minted yet.' 
          }
        }
      }
    )
  }
  
  console.log(supply)
  
  
  res.send(data)
})

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
})*/



main()