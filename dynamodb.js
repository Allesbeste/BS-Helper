var AWSDynamoDB = require('aws-sdk/clients/dynamodb');
var dynamodb = new AWSDynamoDB({ apiVersion: '2012-08-10' });

exports.query = (params, callback) => {
    try {
        dynamodb.query(params, (err, data) => {
            if (err) {
                callback(err);
            } else {
                callback(null, data);
            }
        });
    } catch (err) {
        callback(err);
    }
};

exports.batchGetItem = (params, callback) => {
    try {
        dynamodb.batchGetItem(params, (err, data) => {
            if (err) {
                callback(err);
            } else {
                callback(null, data);
            }
        });
    } catch (err) {
        callback(err);
    }
};