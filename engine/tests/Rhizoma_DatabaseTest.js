var vows = require('vows'),
    assert = require('assert');
    
var Rhizoma_Database = require('../classes/Rhizoma/Database');
var Rhizoma_Database_Config = require('../classes/Rhizoma/Database/Config.js');
var Rhizoma_Logger = require('../classes/Rhizoma/Logger');
var config = require('../settings.json');
var databaseConfig = new Rhizoma_Database_Config(config);
var logger = new Rhizoma_Logger({});
var database = new Rhizoma_Database(databaseConfig, logger);
database.disableQueryCache();

// Create a Test Suite
vows.describe('Rhizoma Database').addBatch({
    'Database': {
        topic: database,
        
        'can run an script': {
            topic: function (database) {
                database.runSqlScript(__dirname + "/../schema/test.sql", this.callback);
            },
            'and then can fetch created tables': function (err) {
                database.getLink('read', function(err, dblink) {
                    dblink.query("SELECT * FROM " + config.dbprefix + "test_table1", function(err) {
                        assert.isNull(err);
                    });
                });
            },
            'and query count is updated': function() {
                assert.equal(database.getQueryCount(), 2);
            }
        },
    }
}).addBatch({
    'Database': {
        topic: database,
        
        'can insert a row': {
            topic: function(database) {
                database.insertData("INSERT INTO " + config.dbprefix + "test_table1 SET user_guid = '100', access_collection_id = '200'", this.callback);
            },
    
            'and it returns a number': function (id) {
                assert.isNumber(id);
            },
            'and the row is there': function (id) {
                database.getLink('read', function(err, dblink){
                    dblink.query("SELECT * FROM " + config.dbprefix + "test_table1 WHERE id = " + id, function(err, result) {
                        assert.isNull(err);
                        assert.isTrue(result.length > 0);
                    });
                });
            }
        },
        
        'can update a row': {
            topic: function(database) {
                var callback = this.callback;
                database.insertData("INSERT INTO " + config.dbprefix + "test_table1 SET user_guid = '100', access_collection_id = '200'", function(err, id) {
                    database.updateData("UPDATE " + config.dbprefix + "test_table1 SET user_guid = '101' WHERE id = " + id, function(err, result) {
                        callback(err, [result, id]);
                    });
                });
            },
            
            'and it returns true': function(result) {
                assert.isTrue(result[0]);
            },
            'and the row is modified': function(result) {
                var id = result[1];
                database.getLink('read', function(err, dblink){
                    dblink.query("SELECT * FROM " + config.dbprefix + "test_table1 WHERE id = " + id, function(err, result) {
                        assert.isNull(err);
                        assert.isTrue(result.length > 0);
                        assert.equal(result[0].user_guid, 101);
                    });
                });
            },
            'if we set affected rows flag': {
                topic: function() {
                    var callback = this.callback;
                    database.insertData("INSERT INTO " + config.dbprefix + "test_table1 SET user_guid = '100', access_collection_id = '200'", function(err, id) {
                        database.updateData("UPDATE " + config.dbprefix + "test_table1 SET user_guid = '101' WHERE access_collection_id = " + 200, callback, true);
                    });
                },
                
                'it returns affected rows number': function(err, affected) {
                    assert.isTrue(affected > 1);
                }
            }
        },
        
        'can delete a row': {
            topic: function(database) {
                var callback = this.callback;
                database.insertData("INSERT INTO " + config.dbprefix + "test_table1 SET user_guid = '100', access_collection_id = '200'", function(err, id) {
                    database.deleteData("DELETE FROM " + config.dbprefix + "test_table1 WHERE id = " + id, function(err, affected) {
                        callback(err, [affected, id]);
                    });
                });
            },
            
            'and it returns affected rows': function(result) {
                assert.isNumber(result[0]);
            },
            'and the row does not exist any more': function(result) {
                var id = result[1];
                database.getLink('read', function(err, dblink) {
                    dblink.query("SELECT * FROM " + config.dbprefix + "test_table1 WHERE id = " + id, function(err, result) {
                        assert.isNull(err);
                        assert.equal(result.length, 0);
                    });
                });
            }
        },
    },
    'Database Promises': {
        topic: database,
        'on create': {
            topic: function(database) {
                var callback = this.callback;
                database.insertData("INSERT INTO " + config.dbprefix + "test_table1 SET user_guid = '100', access_collection_id = '200'")
                .then(function(result) {
                    callback(null, result);
                });
            },
            'they work': function(result) {
                assert.isNumber(result);
            }
        },
        'on read': {
            topic: function(database) {
                var callback = this.callback;
                database.insertData("INSERT INTO " + config.dbprefix + "test_table1 SET user_guid = '100', access_collection_id = '200'")
                .then(function(id) {
                    return database.getData("SELECT * FROM " + config.dbprefix + "test_table1 WHERE id = " + id);
                })
                .then(function(result) {
                    callback(null, result);
                });
            },
            'they work': function(result) {
                assert.isTrue(result.length == 1);
            }
        },
        'on read (row)': {
            topic: function(database) {
                var callback = this.callback;
                database.insertData("INSERT INTO " + config.dbprefix + "test_table1 SET user_guid = '100', access_collection_id = '200'")
                .then(function(id) {
                    return database.getDataRow("SELECT * FROM " + config.dbprefix + "test_table1 WHERE id = " + id);
                })
                .then(function(result) {
                    callback(null, result);
                });
            },
            'they work': function(result) {
                assert.isNumber(result.id);
            }
        },
        'on update': {
            topic: function(database) {
                var callback = this.callback;
                database.insertData("INSERT INTO " + config.dbprefix + "test_table1 SET user_guid = '100', access_collection_id = '200'")
                .then(function(id) {
                    return database.updateData("UPDATE " + config.dbprefix + "test_table1 SET user_guid = '101' WHERE id = " + id);
                })
                .then(function(result) {
                    callback(null, result);
                });
            },
            'they work': function(result) {
                assert.isTrue(result);
            }
        },
        'on update (affected rows)': {
            topic: function(database) {
                var callback = this.callback;
                database.insertData("INSERT INTO " + config.dbprefix + "test_table1 SET user_guid = '100', access_collection_id = '200'")
                .then(function(id) {
                    return database.updateData("UPDATE " + config.dbprefix + "test_table1 SET user_guid = '101' WHERE id = " + id, null, true);
                })
                .then(function(result) {
                    callback(null, result);
                });
            },
            'they work': function(result) {
                assert.isNumber(result);
            }
        },
        'on delete': {
            topic: function(database) {
                var callback = this.callback;
                database.insertData("INSERT INTO " + config.dbprefix + "test_table1 SET user_guid = '100', access_collection_id = '200'")
                .then(function(id) {
                    return database.deleteData("DELETE FROM " + config.dbprefix + "test_table1 WHERE id = " + id);
                })
                .then(function(result) {
                    callback(null, result);
                });
            },
            'they work': function(result) {
                assert.isNumber(result);
            }
        }
    },
    'Delayed Queries': {
        topic: database,
        
        'on register': {
            topic: function(database) {
                database.registerDelayedQuery("SELECT * FROM " + config.dbprefix + "test_table1", 'read');
                database.registerDelayedQuery("SELECT * FROM " + config.dbprefix + "test_table2", 'read');
                return database;
            },
            'they get registered': function(database) {
                var delayed = database._delayedQueries[database._delayedQueries.length - 2];
                assert.equal(delayed['q'], "SELECT * FROM " + config.dbprefix + "test_table1");
                assert.equal(delayed['l'], 'read');
                
                var delayed2 = database._delayedQueries[database._delayedQueries.length - 1];
                assert.equal(delayed2['q'], "SELECT * FROM " + config.dbprefix + "test_table2");
                assert.equal(delayed2['l'], 'read');
            },
            'they can be executed without error': function (database) {
                database.executeDelayedQueries();
            }
        }
    },
    'Query cache': {
        topic: function() {
            database.enableQueryCache();
            return database;
        },
        'we ask for a query': {
            topic: function(database) {
                database.getData("SELECT * FROM " + config.dbprefix + "test_table1", this.callback);
            },
            'and it is cached': function(err, result) {
                assert.equal(database._queryCache["0SELECT * FROM " + config.dbprefix + "test_table1"], result);
            },
            'and if we ask for it again': {
                topic: function() {
                    var callback = this.callback;
                    var cached = database._queryCache["0SELECT * FROM " + config.dbprefix + "test_table1"];
                    database.getData("SELECT * FROM " + config.dbprefix + "test_table1", function(err, result) {
                        callback(err, [cached, result]);
                    });
                },
                'it returns the same cached result': function(err, result) {
                    assert.equal(result[0], result[1]);
                }
            }
            
        }
    }
}).export(module);
