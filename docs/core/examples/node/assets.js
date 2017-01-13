const chain = require('chain-sdk')

const client = new chain.Client()
const signer = new chain.HsmSigner()
let assetKey, accountKey

Promise.all([
  client.mockHsm.keys.create(),
  client.mockHsm.keys.create(),
]).then(keys => {
  assetKey = keys[0].xpub
  accountKey = keys[1].xpub

  signer.addKey(assetKey, client.mockHsm.signerUrl)
  signer.addKey(accountKey, client.mockHsm.signerUrl)
}).then(() => Promise.all([
  client.accounts.create({
    alias: 'acme_treasury',
    rootXpubs: [accountKey],
    quorum: 1,
  }),

  // snippet create-asset-acme-common
  client.assets.create({
    alias: 'acme_common',
    rootXpubs: [assetKey],
    quorum: 1,
    tags: {
      internalRating: '1',
    },
    definition: {
      issuer: 'Acme Inc.',
      type: 'security',
      subtype: 'private',
      class: 'common',
    },
  })
  // endsnippet
  ,
  // snippet create-asset-acme-preferred
  client.assets.create({
      alias: 'acme_preferred',
      rootXpubs: [assetKey],
      quorum: 1,
      tags: {
        internalRating: '2',
      },
      definition: {
        issuer: 'Acme Inc.',
        type: 'security',
        subtype: 'private',
        class: 'preferred',
    },
  })
  // endsnippet
])).then(() => {
  // snippet list-local-assets
  client.assets.query({
    filter: 'is_local=$1',
    filterParams: ['yes'],
  }).then(response => {
    for (let asset of response) {
      console.log('Local asset: ' + asset.alias)
    }
  })
  // endsnippet

  // snippet list-private-preferred-securities
  client.assets.query({
    filter: 'definition.type=$1 AND definition.subtype=$2 AND definition.class=$3',
    filterParams: ['security', 'private', 'preferred'],
  }).then(response => {
    for (let asset of response) {
      console.log('Private preferred security: ' + asset.alias)
    }
  })
  // endsnippet
}).then(() => {
  // snippet build-issue
  const issuePromise = client.transactions.build(function (builder) {
    builder.issue({
      assetAlias: 'acme_common',
      amount: 1000
    })
    builder.controlWithAccount({
      accountAlias: 'acme_treasury',
      assetAlias: 'acme_common',
      amount: 1000
    })
  })
  // endsnippet

  return issuePromise.then(issueTx => {
    // snippet sign-issue
    const signingPromise = signer.sign(issueTx)
    // endsnippet

    return signingPromise
  }).then(signedIssueTx =>
    // snippet submit-issue
    client.transactions.submit(signedIssueTx)
    // endsnippet
  )
}).then(() => {
  const externalProgramPromise = client.accounts.createControlProgram({
    alias: 'acme_treasury',
  })

  return externalProgramPromise.then(externalProgram =>
    // snippet external-issue
    client.transactions.build(function (builder) {
      builder.issue({
        assetAlias: 'acme_preferred',
        amount: 2000
      })
      builder.controlWithProgram({
        controlProgram: externalProgram.controlProgram,
        assetAlias: 'acme_preferred',
        amount: 2000
      })
    }).then(template => {
      return signer.sign(template)
    }).then(signed => {
      return client.transactions.submit(signed)
    })
    // endsnippet
  )
}).then(() => {
  // snippet build-retire
  const retirePromise = client.transactions.build(function (builder) {
    builder.spendFromAccount({
      accountAlias: 'acme_treasury',
      assetAlias: 'acme_common',
      amount: 50
    })
    builder.retire({
      assetAlias: 'acme_common',
      amount: 50
    })
  })
  // endsnippet

  return retirePromise.then(retireTx => {
    // snippet sign-retire
    const signingPromise = signer.sign(retireTx)
    // endsnippet

    return signingPromise
  }).then(signedRetireTx =>
    // snippet submit-retire
    client.transactions.submit(signedRetireTx)
    // endsnippet
  )
}).then(() => {
  // snippet list-issuances
  client.transactions.query({
    filter: 'inputs(type=$1 AND asset_alias=$2)',
    filterParams: ['issue', 'acme_common'],
  }).then(response => {
    for (let tx of response) {
      console.log('Acme Common issued in tx ' + tx.id)
    }
  })
  // endsnippet

  // snippet list-transfers
  client.transactions.query({
    filter: 'inputs(type=$1 AND asset_alias=$2)',
    filterParams: ['spend', 'acme_common'],
  }).then(response => {
    for (let tx of response) {
      console.log('Acme Common transferred in tx ' + tx.id)
    }
  })
  // endsnippet

  // snippet list-retirements
  client.transactions.query({
    filter: 'outputs(type=$1 AND asset_alias=$2)',
    filterParams: ['retire', 'acme_common'],
  }).then(response => {
    for (let tx of response) {
      console.log('Acme Common retired in tx ' + tx.id)
    }
  })
  // endsnippet

  // snippet list-acme-common-balance
  client.balances.query({
    filter: 'asset_alias=$1',
    filterParams: ['acme_common'],
  }).then(response => {
    for (let balance of response) {
      console.log('Total circulation of Acme Common: ' + balance.amount)
    }
  })
  // endsnippet

  // snippet list-acme-balance
  client.balances.query({
    filter: 'asset_definition.issuer=$1',
    filterParams: ['Acme Inc.'],
  }).then(response => {
    for (let balance of response) {
      console.log('Total circulation of Acme stock ' + balance.sumBy.assetAlias + ':' + balance.amount)
    }
  })
  // endsnippet

  // snippet list-acme-common-unspents
  client.unspentOutputs.query({
    filter: 'asset_alias=$1',
    filterParams: ['acme_common'],
  }).then(response => {
    for (let unspent of response) {
      console.log('Acme Common held in output ' + unspent.transactionId + ':' + unspent.position)
    }
  })
  // endsnippet
}).catch(err =>
  process.nextTick(() => { throw err })
)
