/**
 * WARNING: API IN FLUX. DO NOT USE DIRECTLY.
 * 
 * @param {Object} config Elgg's CONFIG object
 * 
 * @private
 * @since      1.9.0
 */
function Rhizoma_Database_Config(conf) {

    /** @property {Object} config Rhizoma's config object */
    this._config = conf;
}

Rhizoma_Database_Config.prototype = {
    
    /** @static */
    READ: 'read',
    /** @static */
    WRITE: 'write',
    /** @static */
    READ_WRITE: 'readwrite',
    
    /**
     * Get the database table prefix
     *
     * @return string
     */
    getTablePrefix: function() {
        return this._config.dbprefix;
    },

    /**
     * Is the query cache enabled?
     *
     * @return bool
     */
    isQueryCacheEnabled: function() {
        if (typeof this._config.db_disable_query_cache != 'undefined') {
            return !this._config.db_disable_query_cache;
        }

        return true;
    },

    /**
     * Are the read and write connections separate?
     *
     * @return bool
     */
    isDatabaseSplit: function() {
        if (typeof this._config.db != 'undefined' && typeof this._config.db['split'] != 'undefined') {
            return this._config.db['split'];
        }
        return false;
    },

    /**
     * Get the connection configuration
     *
     * The parameters are in an object like this:
     * <pre>
     * {
     *    'host': 'xxx',
     *  'user': 'xxx',
     *  'password': 'xxx',
     *  'database': 'xxx',
     * }
     * </pre>
     *
     * @param int type The connection type: READ, WRITE, READ_WRITE
     * @return array
     */
    getConnectionConfig: function(type) {
        var config = [];
        type = type ||  Rhizoma_Database_Config.READ_WRITE
        switch (type) {
            case Rhizoma_Database_Config.READ:
            case Rhizoma_Database_Config.WRITE:
                config = this.getParticularConnectionConfig(type);
                break;
            default:
                config = this.getGeneralConnectionConfig();
                break;
        }

        return config;
    },

    /**
     * Get the read/write database connection information
     *
     * @return array
     */
    getGeneralConnectionConfig: function() {
        return {
            'host': this._config.dbhost,
            'user': this._config.dbuser,
            'password': this._config.dbpass,
            'database': this._config.dbname,
        };
    },

    /**
     * Get connection information for reading or writing
     *
     * @param string type Connection type: 'write' or 'read'
     * @return array
     */
    getParticularConnectionConfig: function(type) {
        if (!Array.isArray(this._config.db[type])) {
            // single connection
            this._config = {
                'host': this._config.db[type]['dbhost'],
                'user': this._config.db[type]['dbuser'],
                'password': this._config.db[type]['dbpass'],
                'database': this._config.db[type]['dbname'],
            };
        } else {
            // multiple connections
            var index = this._config.db[type][Math.floor(Math.random() * this._config.db[type].length)];
            this._config = {
                'host': this._config.db[type][index]['dbhost'],
                'user': this._config.db[type][index]['dbuser'],
                'password': this._config.db[type][index]['dbpass'],
                'database': this._config.db[type][index]['dbname'],
            };
        }

        return this._config;
    }
};

// Shortcuts
Rhizoma_Database_Config.READ = Rhizoma_Database_Config.prototype.READ;
Rhizoma_Database_Config.WRITE = Rhizoma_Database_Config.prototype.WRITE;
Rhizoma_Database_Config.READ_WRITE = Rhizoma_Database_Config.prototype.READ_WRITE;

module.exports = Rhizoma_Database_Config;
