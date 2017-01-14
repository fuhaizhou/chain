const uuid = require('uuid')
const shared = require('./shared')

/**
 * @class
 * Cryptographic private keys are the primary authorization mechanism on a
 * blockchain. For development environments, Chain Core provides a convenient
 * Mock HSM
 * <br/><br/>
 * More info: {@link https://chain.com/docs/core/build-applications/keys}
 */
class MockHsmKeys {
  /**
   * constructor - return MockHsmKeys object configured for specified Chain Core.
   *
   * @param {Client} client Configured Chain client object.
   */
  constructor(client) {

    /**
     * Create a new MockHsm key.
     *
     * @param {Object} [params={}] - Parameters for access token creation.
     * @param {createCallback} [callback] - Optional callback. Use instead of Promise return value as desired.
     * @param {String} params.alias - User specified, unique identifier.
     * @param {objectCallback} [callback] - Optional callback. Use instead of Promise return value as desired.
     * @returns {Promise<Object>} Newly created Mock HSM key
     */
    this.create = (params, cb) => {
      let body = Object.assign({ clientToken: uuid.v4() }, params)
      return shared.tryCallback(
        client.request('/mockhsm/create-key', body).then(data => data),
        cb
      )
    }

    /**
     * Get one page of MockHsm keys, optionally filtered to specified aliases.
     *
     * @param {Query} params={} Filter and pagination information.
     * @param {Array.<string>} [params.aliases] List of requested aliases, max 200.
     * @param {pageCallback} [callback] - Optional callback. Use instead of Promise return value as desired.
     * @returns {Promise<Page>} Requested page of results
     */
    this.query = (params, cb) => {
      if (Array.isArray(params.aliases) && params.aliases.length > 0) {
        params.pageSize = params.aliases.length
      }

      return shared.query(client, this, '/mockhsm/list-keys', params, {cb})
    }

    /**
     * Request all MockHsm keys matching the specified query, calling the
     * supplied processor callback with each item individually.
     *
     * @param {QueryProcessor} processor Processing callback.
     * @returns {Promise} A promise resolved upon processing of all items, or
     *                   rejected on error
     */
    this.queryAll = (processor) => shared.queryAll(this, {}, processor)
  }
}

module.exports = MockHsmKeys