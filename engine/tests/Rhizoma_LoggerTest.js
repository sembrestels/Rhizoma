var vows = require('vows'),
    assert = require('assert');
    
var Rhizoma_Logger = require('../classes/Rhizoma/Logger');

// Create a Test Suite
vows.describe('Rhizoma Logger').addBatch({
    'Logger': {
        topic: new Rhizoma_Logger(),
        
        'when logging is off': {
            topic: function (logger) {
                logger.setLevel(Rhizoma_Logger.OFF);
                return logger.log("hello");
            },
    
            'it does not log': function (topic) {
                assert.equal (topic, false);
            }
        },
        
        'when logging level is too low': {
            topic: function(logger) {
                logger.setLevel(Rhizoma_Logger.WARNING);
                return logger.log("hello", Rhizoma_Logger.NOTICE);
            },
            
            'it does not log': function (topic) {
                assert.equal(topic, false);
            }
        },
        
        'when logging level does not exist': {
            topic: function(logger) {
                return logger.log("hello", 123);
            },
            
            'it does not log': function (topic) {
                assert.equal(topic, false);
            }
        }
    }
}).export(module);
