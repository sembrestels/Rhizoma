var vows = require('vows'),
    assert = require('assert');
    
var Rhizoma_Cache_LRUCache = require('../classes/Rhizoma/Cache/LRUCache');

// Create a Test Suite
vows.describe('Rhizoma LRU Cache').addBatch({
    'LRU Cache': {
        topic: function() {
            var lruCache = new Rhizoma_Cache_LRUCache(10);
            lruCache.set('A', 'a');
            lruCache.set('B', 'b');
            lruCache.set('C', 'c');
            lruCache.set('D', 'd');
            lruCache.set('E', 'e');
            lruCache.set('F', 'f');
            lruCache.set('G', 'g');
            lruCache.set('H', 'h');
            lruCache.set('I', 'i');
            lruCache.set('J', 'j');
            return lruCache;
        },
        'getting values': {
            topic: function(lruCache) {
                return [
                    lruCache.get('A'),
                    lruCache.get('B'),
                    lruCache.get('C'),
                    lruCache.get('D'),
                    lruCache.get('E'),
                ];
            },
            'they are the expected ones': function(result) {
                assert.equal(result[0], 'a');
                assert.equal(result[1], 'b');
                assert.equal(result[2], 'c');
                assert.equal(result[3], 'd');
                assert.equal(result[4], 'e');
            },
            'if we set new ones': {
                topic: function(result, lruCache) {
                    lruCache.set('K', 'k');
                    lruCache.set('L', 'l');
                    lruCache.set('M', 'm');
                    lruCache.set('N', 'n');
                    lruCache.set('O', 'o');
                    return lruCache;
                },
                'least used dissappears': function(lruCache) {
                    assert.isFalse(lruCache.get('F', false));
                    assert.isFalse(lruCache.get('G', false));
                    assert.isFalse(lruCache.get('H', false));
                    assert.isFalse(lruCache.get('I', false));
                    assert.isTrue(lruCache.get('J', true));
                },
                'the size is 10': function(lruCache) {
                    assert.equal(lruCache.size(), 10);
                },
                'if we use elements': {
                    topic: function(lruCache) {
                        lruCache.get('A');
                        lruCache.set('B','bb');
                        
                        lruCache.set('P', 'p');
                        lruCache.set('Q', 'q');console.log(lruCache._order)
                        
                        return [
                            lruCache.get('A', 'zz'),
                            lruCache.get('B', 'zz')
                        ];
                    },
                    'they does not desappear': function(result) {
                        assert.notEqual(result[0], 'zz');
                        assert.notEqual(result[1], 'zz');
                    },
                    'B gets modified': function(result) {
                        assert.equal(result[1], 'bb');
                    }
                },
                'we remove an element': {
                    topic: function(lruCache) {
                        return [
                            lruCache.remove('A'),
                            lruCache.containsKey('A')
                        ];
                    },
                    'returns correct value': function(result) {
                        assert.equal(result[0], 'a');
                    },
                    'key desappears from cache': function(result) {
                        assert.isFalse(result[1]);
                    }
                }
            }
        },
    }
}).export(module);
