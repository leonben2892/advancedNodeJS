const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const keys = require('../config/keys');

const redisClient = redis.createClient(keys.redisUrl);
redisClient.hget = util.promisify(redisClient.hget);
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function(options = {}) {
    this.useCache = true;
    this.hashKey = JSON.stringify(options.key || '');
    return this;
}

mongoose.Query.prototype.exec = async function () {
    if (!this.useCache) {
        return exec.apply(this, arguments);
    }

    const key = JSON.stringify(Object.assign({}, this.getQuery(), { collection: this.mongooseCollection.name }));

    // See if we have value for 'key' in redis
    const cachedValue = await redisClient.hget(this.hashKey, key);

    // If we do, return that
    if (cachedValue) {
        const doc = JSON.parse(cachedValue);

        return Array.isArray(doc) ? doc.map(doc => new this.model(doc)) : new this.model(doc);
    }

    // Otherwise, issue the query and store the result in redis
    const result = await exec.apply(this, arguments);

    redisClient.hmset(this.hashKey, key, JSON.stringify(result), 'EX', 10); // hmset is redundant in redis 4.0.0+, should use only hset

    return result;
}

module.exports = {
    clearHash(hashKey) {
        redisClient.del(JSON.stringify(hashKey));
    }
};