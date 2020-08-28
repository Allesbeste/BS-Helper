var moment = require('moment');
var dynamodb = require('./dynamodb');

class BSUserUnknown extends Error {}

class BSBoerderyUnspecified extends Error {}

class BSBittoelatingsBlokUnspecified extends Error {}

class BSBitmaskUnspecified extends Error {}

exports.IsBoerderyGeldig = (userid, boerderyuuid, bittoelatingsblok, bitmask) => {
    return new Promise((resolve, reject) => {
        try {
            if (typeof userid === 'undefined' || !userid) {
                reject(new BSUserUnknown('Geen gebruiker identifikasie. Probeer weer inteken.'));
            }
            if (typeof boerderyuuid === 'undefined' || !boerderyuuid) {
                reject(new BSBoerderyUnspecified('Geen boerdery identifikasie gespesifiseer.'));
            }
            if (typeof bittoelatingsblok === 'undefined' || bittoelatingsblok === null) {
                reject(new BSBittoelatingsBlokUnspecified('Geen bittoelatingsblok is gespesifiseer.'));
            }
            if (typeof bitmask === 'undefined' || bitmask === null) {
                reject(new BSBitmaskUnspecified('Geen bitmask is gespesifiseer.'));
            }

            let ddbparams = {
                ExpressionAttributeValues: {
                    ":uid": {
                        S: userid.toString()
                    },
                    ":bid": {
                        S: boerderyuuid.toString()
                    }
                },
                KeyConditionExpression: "userid = :uid AND boerderyuuid = :bid",
                TableName: process.env.BoerderyUsersDB
            };
            dynamodb.query(ddbparams, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    if (data.Count > 0) {
                        let rolle = data.Items[0].rolle;
                        if (rolle) {
                            let queryList = [];
                            for (let rolid of rolle["SS"]) {
                                if (rolid.startsWith("t")) {
                                    queryList.push({ "boerderyuuid": { S: "templaat" }, "rolid": { N: rolid.slice(1).toString() } });
                                } else {
                                    queryList.push({ "boerderyuuid": { S: boerderyuuid.toString() }, "rolid": { N: rolid.toString() } });
                                }
                            };
                            var params = {
                                RequestItems: {
                                    [process.env.BoerderyRolleDB]: {
                                        Keys: queryList,
                                        ProjectionExpression: `bittoelatings_${String.fromCharCode('a'.charCodeAt(0) + parseInt(bittoelatingsblok, 10))}`
                                    }
                                }
                            };
                            dynamodb.batchGetItem(params, function(err, data) {
                                if (err) {
                                    console.error(err);
                                    reject(err);
                                } else {
                                    try {
                                        let toelatings = data.Responses[process.env.BoerderyRolleDB].map(rekord => {
                                            if (rekord[`bittoelatings_${String.fromCharCode('a'.charCodeAt(0) + parseInt(bittoelatingsblok, 10))}`]) {
                                                return rekord[`bittoelatings_${String.fromCharCode('a'.charCodeAt(0) + parseInt(bittoelatingsblok, 10))}`].N;
                                            } else {
                                                return 0;
                                            }
                                        });
                                        let bitmaskresult = toelatings.reduce(function(a, b) {
                                            return a | b
                                        });
                                        // console.log("toelatings", toelatings, "bitmask", parseInt(bitmask, 10), "bitmaskresult", bitmaskresult);
                                        // console.log("results", ((parseInt(bitmask, 10) == (parseInt(bitmask, 10) & bitmaskresult))));
                                        resolve((parseInt(bitmask, 10) == (parseInt(bitmask, 10) & bitmaskresult)));
                                    } catch (error) {
                                        console.error(error);
                                        reject(error);
                                    }
                                }
                            });
                        } else {
                            resolve(false); // Het nie toegang nie
                        }
                    } else {
                        resolve(false); // Het nie toegang nie
                    }
                }
            });
        } catch (error) {
            reject(error);
        }
    });
};

exports.LogTransaksie = (boerderyuuid, path, httpMethod, gebruikernaam, hoofafdeling, afdeling, beskrywing, request, params, body, result, itemdata) => {
    return new Promise((resolve, reject) => {
        try {
            let ddbparams = {
                Item: {
                    "boerderyuuid": {
                        S: boerderyuuid.toString()
                    },
                    "datumtyd": {
                        N: moment.utc().unix().toString()
                    },
                    "aksie": {
                        S: httpMethod.toString()
                    },
                    "hoofafdeling": {
                        S: hoofafdeling.toString()
                    },
                    "afdeling": {
                        S: afdeling.toString()
                    },
                    "beskrywing": {
                        S: beskrywing.toString()
                    },
                    "gebruikernaam": {
                        S: gebruikernaam.toString()
                    }
                },
                TableName: process.env.TransaksieLogDB
            };
            if (path != null) {
                ddbparams.Item = {
                    ...ddbparams.Item,
                    "endpoint": {
                        S: path.toString()
                    }
                }
            }
            if (request != null) {
                ddbparams.Item = {
                    ...ddbparams.Item,
                    "request": {
                        S: request.toString()
                    }
                }
            }
            if (params != null) {
                ddbparams.Item = {
                    ...ddbparams.Item,
                    "params": {
                        S: params.toString()
                    }
                }
            }
            if (body != null) {
                ddbparams.Item = {
                    ...ddbparams.Item,
                    "body": {
                        S: body.toString()
                    }
                }
            }
            if (result != null) {
                ddbparams.Item = {
                    ...ddbparams.Item,
                    "result": {
                        S: result.toString()
                    }
                }
            }
            if (itemdata != null) {
                ddbparams.Item = {
                    ...ddbparams.Item,
                    "itemdata": {
                        S: itemdata.toString()
                    }
                }
            }
            console.log(ddbparams);
            dynamodb.putItem(ddbparams, async(err, data) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    console.log(data);
                    resolve();
                }
            });
        } catch (error) {
            reject(error);
        }
    });
};