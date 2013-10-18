var Q = require('q');
var mysql = require('mysql');
var Rhizoma_Logger = require('./Logger');
var Rhizoma_Cache_LRUCache = require('./Cache/LRUCache');
var DatabaseException = require('./../DatabaseException');
var InstallationException = require('./../InstallationException');

/**
 * An object representing a single Rhizoma database.
 *
 * WARNING: THIS API IS IN FLUX. PLUGIN AUTHORS SHOULD NOT USE. See lib/database.js instead.
 *
 * @param {Rhizoma_Database_Config} config Database configuration
 * @param {Rhizoma_Logger}          logger The logger
 * 
 * @private
 *
 */
function Rhizoma_Database(config, logger) {

    /** @property {String} tablePrefix Prefix for database tables */
    this._tablePrefix;

    /** @property {Array} dbLinks Database connection resources */
    this._dbLinks = [];

    /** @property {Number} queryCount The number of queries made */
    this._queryCount = 0;

    /**
     * Query cache for select queries.
     *
     * Queries and their results are stored in this cache as:
     * 
     * <pre>this._queryCache[query hash] => [result1, result2, ... resultN]</pre>
     * 
     * {@link Rhizoma_Database#_getResults} for details on the hash.
     *
     * @property {Rhizoma_Cache_LRUCache} queryCache
     */
    this._queryCache = null;

    /**
     * @property {Number} queryCacheSize The number of queries to cache
     */
    this._queryCacheSize = 50;

    /**
     * Queries are saved to an array and executed using
     * a function registered by register_shutdown_function().
     *
     * Queries are saved as an array in the format:
     * <pre>
     * delayedQueries.push({
     *     'q': string query,
     *     'l': string query_type,
     *     'h': function handler // a callback function
     * });
     * </pre>
     *
     * @property {Array} delayedQueries Queries to be run during shutdown
     */
    this._delayedQueries = [];

    /** @property {Boolean} installed Is the database installed? */
    this._installed = false;

    /** @property {Rhizoma_Database_Config} config Database configuration */
    this._config;

    /** @property {Rhizoma_Logger} logger The logger */
    this._logger;

    this._logger = logger;
    this._config = config;

    this._tablePrefix = config.getTablePrefix();

    this.enableQueryCache();
}

Rhizoma_Database.prototype = {

    /**
     * Gets (if required, also creates) a database link resource.
     *
     * The database link resources are created by
     * {@link Rhizoma_Database#setupConnections}, which is called if no links exist.
     *
     * @param {String} type The type of link we want: "read", "write" or "readwrite".
     * @param {Function} cb Callback that runs when the link is available
     *
     * @return {Object} Database link
     * @throws {DatabaseException}
     */
    getLink: function(type, cb) {
        var deferred = Q.defer();
        
        if (typeof this._dbLinks[type] != 'undefined') {
            deferred.resolve(this._dbLinks[type]);
        } else if (typeof this._dbLinks['readwrite'] != 'undefined') {
            deferred.resolve(this._dbLinks['readwrite']);
        } else {
            this.setupConnections(function(err, dblink) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(dblink);
                }
            });
        }
        return deferred.promise.nodeify(cb);
    },

    /**
     * Establish database connections
     *
     * If the configuration has been set up for multiple read/write databases, set those
     * links up separately; otherwise just create the one database link.
     * 
     * @param {Function} cb Callback that runs when connection is established
     *
     * @throws {DatabaseException}
     */
    setupConnections: function(cb) {
        if (this._config.isDatabaseSplit()) {
            this.establishLink('read', cb);
            this.establishLink('write', cb);
        } else {
            this.establishLink('readwrite', cb);
        }
    },


    /**
     * Establish a connection to the database server
     *
     * Connect to the database server and use the Rhizoma database for a particular database link
     *
     * @param {String} dblinkname The type of database connection. Used to identify the
     * resource: "read", "write", or "readwrite".
     * @param {Function} cb Callback that runs when link is established
     *
     * @throws {DatabaseException}
     */
    establishLink: function(dblinkname, cb) {

        dblinkname = dblinkname || "readwrite";
        var conf = this._config.getConnectionConfig(dblinkname);
        var self = this;
        
        this._dbLinks[dblinkname] = mysql.createConnection({
            host: conf.host,
            user: conf.user,
            password: conf.password,
            database: conf.database
        });
        
        // Set DB for UTF8 (connection is implicitly established invoking a query).
        this._dbLinks[dblinkname].query("SET NAMES utf8", function(err) {
            if (err) {
                var msg = "Rhizoma couldn't connect to the database using the given credentials. Check the settings file.";
                err = new DatabaseException(msg);
            }
            cb(err, self._dbLinks[dblinkname]);
        });
    },

    /**
     * Retrieve rows from the database.
     *
     * Queries are executed with {@link Rhizoma_Database#executeQuery} and result
     * is an array containing the rows of the query.  If a callback
     * function callback is defined, each row will be passed as a single
     * argument to callback.  If no callback function is defined, the
     * entire result set is returned as an array.
     *
     * @param {String}  query    The query being passed.
     * @param {Function} cb Callback that returns the result
     * @param {Function} [transform] Optionally, the function to call back to on each row
     *
     * @return {Array} An array of database result objects or transform function results. If the query
     *               returned nothing, an empty array.
     * @throws {DatabaseException}
     */
    getData: function(query, cb, transform) {
        return this._getResults(query, cb, transform, false);
    },
    /**
     * Retrieve a single row from the database.
     *
     * Similar to {@link Rhizoma_Database#getData} but returns only the first row
     * matched.  If a callback function callback is specified, the row will be passed
     * as the only argument to callback.
     *
     * @param {String}  query    The query to execute.
     * @param {Function} cb Callback that runs when the data is available
     * @param {Function} [transform] A callback function
     *
     * @return A single database result object or the result of the transform function.
     * @throws {DatabaseException}
     */
    getDataRow: function(query, cb, transform) {
        return this._getResults(query, cb, transform, true);
    },

    /**
     * Insert a row into the database.
     *
     * *Note: Altering the DB invalidates all queries in the query cache.*
     *
     * @param {String} query The query to execute.
     * @param {Function} cb Callback that runs when the data is inserted
     *
     * @return {Number/Boolean} The database id of the inserted row if a AUTO_INCREMENT field is
     *                   defined, 0 if not, and false on failure.
     * @throws {DatabaseException}
     */
    insertData: function(query, cb) {
        
        var deferred = Q.defer();
        var self = this;

        this._logger.log("DB query " + query, Rhizoma_Logger.INFO);

        var dblink = this.getLink('write');
        self._invalidateQueryCache();

        self.executeQuery(query, dblink, function(err, result) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(result.insertId);
            }
        });
        
        return deferred.promise.nodeify(cb);
    },

    /**
     * Update the database.
     *
     * *Note: Altering the DB invalidates all queries in the query cache.*
     *
     * @param {String}   query      The query to run.
     * @param {Function} cb         Callback that runs when the data is updated
     * @param {Boolean}  [getNumRows=false] Return the number of rows affected
     *
     * @return {Boolean/Number}
     * @throws {DatabaseException}
     */
    updateData: function(query, cb, getNumRows) {
        
        var deferred = Q.defer();
        var self = this;

        this._logger.log("DB query " + query, Rhizoma_Logger.INFO);

        var dblink = this.getLink('write');
            
        self._invalidateQueryCache();
        
        self.executeQuery(query, dblink, function(err, result) {
            if (err) {
                deferred.reject(err);
            } else if (getNumRows) {
                deferred.resolve(result.affectedRows);
            } else {
                deferred.resolve(true);
            }
        }); 
        
        return deferred.promise.nodeify(cb);
    },

    /**
     * Delete data from the database
     *
     * *Note: Altering the DB invalidates all queries in query cache.*
     *
     * @param {String}   query The SQL query to run
     * @param {Function} cb    Callback that runs when the data is deleted
     *
     * @return {Number} The number of affected rows
     * @throws {DatabaseException}
     */
    deleteData: function(query, cb) {
        
        var deferred = Q.defer();
        var self = this;

        this._logger.log("DB query " + query, Rhizoma_Logger.INFO);

        var dblink = this.getLink('write');
            
        self._invalidateQueryCache();

        self.executeQuery(query, dblink, function(err, result) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(result.affectedRows);
            }
        }); 
        
        return deferred.promise.nodeify(cb);
    },

    /**
     * Handles queries that return results, running the results through a
     * an optional callback function. This is for R queries (from CRUD).
     *
     * @param {String}   query    The select query to execute
     * @param {Function} cb       Callback that runs when the data is fetched
     * @param {String}   [transform] An optional callback function to run on each row
     * @param {Boolean}  [single=false]   Return only a single result?
     * 
     * @private
     * @return {Array} An array of database result objects or transform function results. If the query
     *               returned nothing, an empty array.
     * @throws {DatabaseException}
     */
    _getResults: function(query, cb, transform, single) {
        
        var deferred = Q.defer();
        var self = this;

        // Since we want to cache results of running the callback, we need to
        // need to namespace the query with the callback and single result request.
        // http://trac.elgg.org/ticket/4049
        var transform_hash = transform ? String(transform) : "";
        var hash = transform_hash + (single ? 1 : 0) + query;

        // Is cached?
        if (this._queryCache) {
            if (typeof this._queryCache[hash] != "undefined") {
                this._logger.log("DB query " + query + " results returned from cache (hash: " + hash + ")", Rhizoma_Logger.INFO);
                deferred.resolve(this._queryCache[hash]);
                return deferred.promise.nodeify(cb);
            }
        }

        var dblink = this.getLink('read');
            
        var _return = [];

        self.executeQuery(query, dblink, function(err, result) {
            
            if (err) {
                deferred.reject(err);
                return;
            }

            // test for callback once instead of on each iteration.
            var is_callable = typeof transform === 'function';
            
            
            result.some(function(row) {
                if (is_callable) {
                    row = transform(row);
                }

                if (single) {
                    _return = row;
                    return true; // break
                } else {
                    _return.push(row);
                }
            });
            
            if (!_return.length) {
                self._logger.log("DB query " + query + " returned no results.", Rhizoma_Logger.INFO);
            }
            // Cache result
            if (self._queryCache) {
                self._queryCache[hash] = _return;
                self._logger.log("DB query " + query + " results cached (hash: " + hash + ")", Rhizoma_Logger.INFO);
            }
            deferred.resolve(_return);
        });
        
        return deferred.promise.nodeify(cb);
    },

    /**
     * Execute a query.
     *
     * query is executed via mysql.query.  If there is an SQL error,
     * a {@link DatabaseException} is thrown.
     *
     * @param {String}   query  The query
     * @param {Object}   dblink The DB link
     * @param {Function} cb     Callback that runs when the query is completed
     *
     * @return {Array} The result of mysql.query
     * @throws {DatabaseException}
     */
    executeQuery: function(query, dblink, cb) {
        
        var deferred = Q.defer();

        if (query === null || dblink === null) {
            deferred.reject(new DatabaseException("Query and dblink cannot be null"));
        }

        this._queryCount++;
        
        var onQuery = function(err, result) {
            if (err) {
                if (err.code == 'PROTOCOL_CONNECTION_LOST' || err.code == 'ECONNREFUSED') {
                    err = new DatabaseException("Connection to database was lost.");
                } else {
                    err = new DatabaseException(err.message + "\n\n QUERY: " + query);
                }
                deferred.reject(err);
            } else {
                deferred.resolve(result);
            }
        }

        // If dblink is promise
        if (dblink.then) {
            dblink.then(function(dblink) {
                dblink.query(query, onQuery);
            })
            .catch(function(err) {
                onQuery(err);
            });
        } else {
            dblink.query(query, onQuery);
        }
        
        return deferred.promise.nodeify(cb);
    },

    /**
     * Runs a full database script from disk.
     *
     * The file specified should be a standard SQL file as created by
     * mysqldump or similar.  Statements must be terminated with ;
     * and a newline character (\n or \r\n) with only one statement per line.
     *
     * The special string 'prefix_' is replaced with the database prefix
     * as defined in {@link #tablePrefix}.
     *
     * **Warning:** Errors do not halt execution of the script.  If a line
     * generates an error, the error message is saved and the
     * next line is executed.  After the file is run, any errors
     * are displayed as a {@link DatabaseException}
     *
     * @param {String}   scriptlocation The full path to the script
     * @param {Function} cb             Callback that runs when the script is complete
     *
     * @throws {DatabaseException}
     */
    runSqlScript: function(scriptlocation, cb) {
        var fs = require('fs');
        var self = this;
        
        fs.readFile(scriptlocation, 'utf8', function (err, script) {
            if (err) {
                err.message = "Rhizoma couldn't find the requested database script at " + scriptlocation + ".";
                cb(err);
                return;
            }
            var errors = [];
            var promises = [];
    
            // Remove MySQL -- style comments
            script = script.replace(/\-\-.*[\n\r]+/g, '');
    
            // Statements must end with ; and a newline
            var sql_statements = script.split(/;[\n\r]+/);
    
            sql_statements.forEach(function(statement) {
                statement = statement.trim();
                statement = statement.replace("prefix_", self._tablePrefix);
                if (statement.length) {
                    var deferred = Q.defer();
                    self.updateData(statement, function(err) {
                        if (err) {
                            errors.push(err.message);
                        }
                        deferred.resolve();
                    });
                    promises.push(deferred.promise);
                }
            });
            Q.all(promises).then(function() {
                if (errors.length) {
                    var errortxt = "";
                    errors.forEach(function(error) {
                        errortxt += " {" + error.message + "};";
                    });
        
                    var msg = "There were a number of issues: " + errortxt;
                    err = new DatabaseException(msg);
                } else {
                    err = null;
                }
                cb(err);
            });
        });
    },

    /**
     * Queue a query for execution upon shutdown.
     *
     * You can specify a handler function if you care about the result. This function will accept
     * the array from mysql.query.
     *
     * @param {String} query       The query to execute
     * @param {String} type        The query type ('read' or 'write')
     * @param {Function} [handler] A callback function to pass the results array to
     *
     * @return {Boolean} Whether registering was successful.
     */
    registerDelayedQuery: function(query, type, handler) {

        if (typeof type != 'object' && type != 'read' && type != 'write') {
            return false;
        }

        // Construct delayed query
        var delayed_query = [];
        delayed_query['q'] = query;
        delayed_query['l'] = type;
        delayed_query['h'] = handler;

        this._delayedQueries.push(delayed_query);

        return true;
    },


    /**
     * Trigger all queries that were registered as "delayed" queries. This is
     * called by the system automatically on shutdown.
     *
     * @private
     */
    executeDelayedQueries: function() {
        
        var self = this;
        
        this._delayedQueries.forEach(function(query_details) {

            var link = query_details['l'];

            if (link == 'read' || link == 'write') {
                link = self.getLink(link);
            } else if (typeof link != 'object') {
                var msg = "Link for delayed query not valid resource or db_link type. Query: " + query_details['q'];
                self._logger.log(msg, Rhizoma_Logger.WARNING);
            }
            
            self.executeQuery(query_details['q'], link, function(err, result) {
                if (err) {
                    // Suppress all exceptions since page already sent to requestor
                    self._logger.log(err.message, Rhizoma_Logger.ERROR);
                }
                if (typeof query_details['h'] === 'function') {
                    query_details['h'](result);
                }
            });
        });
    },

    /**
     * Enable the query cache
     * 
     * This does not take precedence over the Rhizoma_Database_Config setting.
     * 
     */
    enableQueryCache: function() {
        if (this._config.isQueryCacheEnabled() && this._queryCache === null) {
            this._queryCache = new Rhizoma_Cache_LRUCache(this._queryCacheSize);
        }
    },

    /**
     * Disable the query cache
     * 
     * This is useful for special scripts that pull large amounts of data back
     * in single queries.
     * 
     */
    disableQueryCache: function() {
        this._queryCache = null;
    },

    /**
     * Invalidate the query cache
     */
    _invalidateQueryCache: function() {
        if (this._queryCache) {
            this._queryCache.clear();
            this._logger.log("Query cache invalidated", Rhizoma_Logger.INFO);
        }
    },

    /**
     * Test that the Rhizoma database is installed
     * 
     * @param {Function} cb  Callback that runs when the result is available
     *
     * @throws {InstallationException}
     */
    assertInstalled: function(cb) {

        if (this._installed) {
            cb();
            return;
        }

        var dblink = this.getLink('read');
        var self = this;
        dblink.query("SELECT value FROM " + self._tablePrefix + "datalists WHERE name = 'installed'", function(err) {
            if (err) {
                err = new InstallationException("Unable to handle this request. This site is not configured or the database is down.");
            }
            self._installed = true;
            cb(err);
        });
    },

    /**
     * Get the number of queries made to the database
     *
     * @return {Number}
     */
    getQueryCount: function() {
        return this._queryCount;
    },

    /**
     * Get the prefix for Rhizoma's tables
     *
     * @return {String}
     */
    getTablePrefix: function() {
        return this._tablePrefix;
    },

    /**
     * Sanitizes an integer value for use in a query
     *
     * @param {Number}  value  Value to sanitize
     * @param {Boolean} [signed=true] Whether negative values are allowed
     * @return {Number}
     */
    sanitizeInt: function(value, signed) {
        value = parseInt(value, 10);

        if (signed === false) {
            if (value < 0) {
                value = 0;
            }
        }

        return value;
    },

    /**
     * Sanitizes a string for use in a query
     *
     * @param {String} value Value to escape
     * @return {String}
     */
    sanitizeString: function(value) {
        return mysql.escape(value);
    }
};

module.exports = Rhizoma_Database;