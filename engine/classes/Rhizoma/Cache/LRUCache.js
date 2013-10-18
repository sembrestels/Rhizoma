var LRU = require('lru-cache');

/**
 * Least Recently Used Cache
 *
 * A fixed sized cache that removes the element used last when it reaches its
 * size limit.
 * 
 * @param {Number} size The size of the cache
 * @throws {Error}
 * 
 * @private
 */
function Rhizoma_Cache_LRUCache(size) {

    /**
     * Dictionary containing key-value pairs
     *
     * @property {Object} _data
     */
    this._data;
    
    if (typeof size !== 'number' || size <= 0) {
        throw new Error('invalid argument');
    }
    this._data = LRU(size);
}

Rhizoma_Cache_LRUCache.prototype = {
    /**
     * Get the value cached with this key
     *
     * @param {Number/String} key     The key. Strings that are ints are cast to ints.
     * @param {Object}      default The value to be returned if key not found. (Optional)
     * @return {Object}
     */
    get: function(key, _default) {
        if (this._data.has(key)) {
            return this._data.get(key);
        } else {
            return _default;
        }
    },

    /**
     * Add something to the cache
     *
     * @param {Number/String} key   The key. Strings that are ints are cast to ints.
     * @param {Object}      value The value to cache
     */
    set: function(key, value) {
        this._data.set(key, value);
    },

    /**
     * Get the number of elements in the cache
     *
     * @return {Number}
     */
    size: function() {
        return this._data.keys().length;
    },

    /**
     * Does the cache contain an element with this key
     *
     * @param {Number/String} key The key
     * @return {Boolean}
     */
    containsKey: function(key) {
        return this._data.has(key);
    },

    /**
     * Remove the element with this key.
     *
     * @param {Number/String} key The key
     * @return {Object} Value or null if not set
     */
    remove: function(key) {
        if (this._data.has(key)) {
            var value = this._data.peek(key);
            this._data.del(key);
            
            return value;
        } else {
            return null;
        }
    },

    /**
     * Clear the cache
     */
    clear: function() {
        this._data.reset();
    },

    /**
     * Assigns a value for the specified key
     *
     * @param {Number/String} key   The key to assign the value to.
     * @param {Object}      value The value to set.
     */
    offsetSet: function(key, value) {
        this.set(key, value);
    },

    /**
     * Get the value for specified key
     *
     * @param {Number/String} key The key to retrieve.
     * @return {Object}
     */
    offsetGet: function(key) {
        return this.get(key);
    },

    /**
     * Unsets a key.
     *
     * @param {Number/String} key The key to unset.
     */
    offsetUnset: function(key) {
        this.remove(key);
    },

    /**
     * Does key exist?
     *
     * @param {Number/String} key A key to check for.
     * @return {Boolean}
     */
    offsetExists: function(key) {
        return this.containsKey(key);
    }
};
module.exports = Rhizoma_Cache_LRUCache;
