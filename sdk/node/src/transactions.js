const shared = require('./shared')
const errors = require('./errors')

// TODO: replace with default handler in requestSingle/requestBatch variants
function checkForError(resp) {
  if ('code' in resp) {
    throw errors.create(
      errors.types.BAD_REQUEST,
      errors.formatErrMsg(resp, ''),
      {body: resp}
    )
  }
  return resp
}

/**
 * @class
 * A convenience class for building transaction template objects
 */
class TransactionBuilder {
  /**
   * constructor - return a new object used for constructing a transaction.
   */
  constructor() {
    this.actions = []


    /**
     * If true, build the transaction as a partial tranaction.
     * @type {Boolean}
     */
    this.allowAdditionalActions = false

    /**
     * Base transation provided by a third party
     * @type {Object}
     */
    this.baseTransaction = null
  }

  /**
   * Add an issuance action.
   *
   * @param {Object} params - Issuance parameters.
   * @param {String} params.asset_id - Asset ID specifiying the asset to be issued.
   *                                   You must specify either an ID or an alias.
   * @param {String} params.asset_alias - Asset alias specifying the asset to be issued.
   *                                      You must specify either an ID or an alias.
   * @param {String} params.amount - Amount of the asset to be issued.
   */
  issue(params) {
    this.actions.push(Object.assign({}, params, {type: 'issue'}))
  }

  /**
   * controlWithAccount - description
   *
   * @param  {type} params description
   * @option params [String] :asset_id Asset ID specifiying the asset to be controlled.
   #                                   You must specify either an ID or an alias.
   * @param {String} params.asset_alias - Asset alias specifying the asset to be controlled.
   #                                   You must specify either an ID or an alias.
   * @param {String} params.account_id - Account ID specifiying the account controlling the asset.
   #                                   You must specify either an ID or an alias.
   * @param {String} params.account_alias - Account alias specifying the account controlling the asset.
   #                                   You must specify either an ID or an alias.
   * @param {Number} params.amount - Amount of the asset to be controlled.
   */
  controlWithAccount(params) {
    this.actions.push(Object.assign({}, params, {type: 'control_account'}))
  }

  /**
   * controlWithProgram - description
   *
   * @param  {type} params description
   * @param {String} params.asset_id - Asset ID specifiying the asset to be controlled.
   #                                   You must specify either an ID or an alias.
   * @param {String} params.asset_alias - Asset alias specifying the asset to be controlled.
   #                                   You must specify either an ID or an alias.
   * @param {String} params.control_program - The control program to be used
   * @param {Number} params.amount - Amount of the asset to be controlled.
   */
  controlWithProgram(params) {
    this.actions.push(Object.assign({}, params, {type: 'control_program'}))
  }

  /**
   * spendFromAccount - description
   *
   * @param  {type} params description
   * @param {String} params.asset_id - Asset ID specifiying the asset to be spent.
   #                                   You must specify either an ID or an alias.
   * @param {String} params.asset_alias - Asset alias specifying the asset to be spent.
   #                                   You must specify either an ID or an alias.
   * @param {String} params.account_id - Account ID specifiying the account spending the asset.
   #                                   You must specify either an ID or an alias.
   * @param {String} params.account_alias - Account alias specifying the account spending the asset.
   #                                   You must specify either an ID or an alias.
   * @param {Number} params.amount - Amount of the asset to be spent.
   */
  spendFromAccount(params) {
    this.actions.push(Object.assign({}, params, {type: 'spend_account'}))
  }

  /**
   * spendUnspentOutput - description
   *
   * @param  {type} params description
   * @param {String} params.transaction_id - Transaction ID specifying the tranasction to select an output from.
   * @param {Number} params.position - Position of the output within the transaction to be spent.
   */
  spendUnspentOutput(params) {
    this.actions.push(Object.assign({}, params, {type: 'spend_account_unspent_output'}))
  }

  /**
   * retire - description
   *
   * @param  {type} params description
   * @param {String} params.asset_id - Asset ID specifiying the asset to be retired.
   #                                   You must specify either an ID or an alias.
   * @param {String} params.asset_alias - Asset alias specifying the asset to be retired.
   #                                   You must specify either an ID or an alias.
   * @param {Number} params.amount - Amount of the asset to be retired.
   */
  retire(params) {
    this.actions.push(Object.assign({}, params, {type: 'control_program', control_program: '6a'}))
  }
}

/**
 * Processing callback for building a transaction. The instance of
 * {@link TransactionBuilder} modified in the function is used to build a transaction
 * in Chain Core.
 *
 * @callback Transactions~builderCallback
 * @param {TransactionBuilder} builder
 */

/**
 * @class
 * A blockchain consists of an immutable set of cryptographically linked
 * transactions. Each transaction contains one or more actions.
 * <br/><br/>
 * More info: {@link https://chain.com/docs/core/build-applications/transaction-basics}
 */
class Transactions {
  /**
   * constructor - return Transactions object configured for specified Chain Core.
   *
   * @param {Client} client Configured Chain client object.
   */
  constructor(client) {
    /**
     * Get one page of transactions matching the specified query.
     *
     * @param {Query} params={} Filter and pagination information.
     * @param {pageCallback} [callback] - Optional callback. Use instead of Promise return value as desired.
     * @returns {Promise<Page>} Requested page of results.
     */
    this.query = (params, cb) => shared.query(client, this, '/list-transactions', params, {cb})

    /**
     * Request all transactions matching the specified query, calling the
     * supplied processor callback with each item individually.
     *
     * @param {Query} params Filter and pagination information.
     * @param {QueryProcessor} processor Processing callback.
     * @returns {Promise} A promise resolved upon processing of all items, or
     *                   rejected on error.
     */
    this.queryAll = (params, processor) => shared.queryAll(this, params, processor)

    /**
     * Build an unsigned transaction from a set of actions.
     *
     * @param {builderCallback} builderBlock - Function that adds desired actions
     *                                         to a given builder object.
     * @param {objectCallback} [callback] - Optional callback. Use instead of Promise return value as desired.
     * @returns {Promise<Object>} - Unsigned transaction template, or error.
     */
    this.build = (builderBlock, cb) => {
      const builder = new TransactionBuilder()
      builderBlock(builder)

      return shared.tryCallback(
        client.request('/build-transaction', [builder]).then(resp => checkForError(resp[0])),
        cb
      )
    }

    /**
     * Build multiple unsigned transactions from multiple sets of actions.
     *
     * @param {Array<builderCallback>} builderBlocks - Functions that adds desired actions
     *                                                 to a given builder object, one
     *                                                 per transaction.
     * @param {objectCallback} [callback] - Optional callback. Use instead of Promise return value as desired.
     * @returns {Promise<BatchResponse>} - Batch of unsigned transaction templates, or errors.
     */
    this.buildBatch = (builderBlocks, cb) => {
      const builders = builderBlocks.map((builderBlock) => {
        const builder = new TransactionBuilder()
        builderBlock(builder)
        return builder
      })

      return shared.createBatch(client, '/build-transaction', builders, {cb})
    }

    /**
     * Submit a signed transaction to the blockchain.
     *
     * @param {Object} signed - A fully signed transaction template.
     * @returns {Promise<Object>} Transaction ID of the successful transaction, or error.
     */
    this.submit = (signed, cb) => shared.tryCallback(
      client.request('/submit-transaction', {transactions: [signed]}).then(resp => checkForError(resp[0])),
      cb
    )

    /**
     * Submit multiple signed transactions to the blockchain.
     *
     * @param {Array<Object>} signed - An array of fully signed transaction templates.
     * @returns {Promise<BatchResponse>} - Batch response of transaction IDs, or errors.
     */
    this.submitBatch = (signed, cb) => shared.tryCallback(
      client.request('/submit-transaction', {transactions: signed})
            .then(resp => new shared.BatchResponse(resp)),
      cb
    )
  }
}

module.exports = Transactions