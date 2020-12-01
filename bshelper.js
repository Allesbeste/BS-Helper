"use strict";

var moment = require('moment');

class BSUserUnknown extends Error {}

class BSBoerderyUnspecified extends Error {}

class BSBittoelatingsBlokUnspecified extends Error {}

class BSBitmaskUnspecified extends Error {}

class BSHelper {

    constructor(dynamodb) {
        this.dynamodb = dynamodb;
    }

    IsBoerderyGeldig(userid, boerderyuuid, bittoelatingsblok, bitmask) {
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
                this.dynamodb.query(ddbparams, (err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        if (data.Count > 0) {
                            let rolle = data.Items[0].rolle;
                            if (rolle["SS"].length > 0) {
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
                                this.dynamodb.batchGetItem(params, function(err, data) {
                                    if (err) {
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
                                                return a | b;
                                            });
                                            // console.log("toelatings", toelatings, "bitmask", parseInt(bitmask, 10), "bitmaskresult", bitmaskresult);
                                            // console.log("results", ((parseInt(bitmask, 10) == (parseInt(bitmask, 10) & bitmaskresult))));
                                            resolve((parseInt(bitmask, 10) == (parseInt(bitmask, 10) & bitmaskresult)));
                                        } catch (error) {
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
    }
}

class Logger {

    constructor(dynamodb, boerderyuuid, gebruikernaam, httpMethod, path) {
        this.dynamodb = dynamodb;
        this.boerderyuuid = boerderyuuid;
        this.gebruikernaam = gebruikernaam;
        this.httpMethod = httpMethod;
        this.path = path;
    }

    LogTransaksie(hoofafdeling, afdeling, beskrywing, request, params, body, result, itemdata) {
        return new Promise((resolve, reject) => {
            try {
                let ddbparams = {
                    Item: {
                        "boerderyuuid": {
                            S: this.boerderyuuid.toString()
                        },
                        "datumtyd": {
                            N: moment.utc().unix().toString()
                        },
                        "aksie": {
                            S: this.httpMethod.toString()
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
                            S: this.gebruikernaam.toString()
                        }
                    },
                    TableName: process.env.TransaksieLogDB
                };
                if (this.path != null) {
                    ddbparams.Item = {
                        ...ddbparams.Item,
                        "endpoint": {
                            S: this.path.toString()
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
                this.dynamodb.putItem(ddbparams, async(err, data) => {
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
    }
}

class DataTransformer {
    ConvertDynamoDBData(data) {
        return new Promise((resolve, reject) => {
            try {
                var results = [];
                for (const returndata of data) {
                    let result = {};
                    for (let i = 0; i < Object.keys(returndata).length; i++) {
                        let keys = returndata[Object.keys(returndata)[i]];
                        let value = Object.values(keys)[0];
                        if (Object.keys(keys) === "N") {
                            value = !isNaN(value) && value.toString().indexOf(".") !== -1 ?
                                parseFloat(value) :
                                parseInt(value, 10);
                        }
                        if (Object.keys(keys) === "SS" || Object.keys(keys) === "NS") {
                            this.ConvertDynamoDBData(value);
                        }
                        if (Object.keys(keys) === "L") {
                            this.ConvertDynamoDBData(
                                    value.map((item) => {
                                        return { myitem: item };
                                    })
                                )
                                .then((response) => {
                                    value = response.map((item) => item.myitem);
                                })
                                .catch((error) => {
                                    reject(error);
                                });
                        }
                        if (Object.keys(keys) === "M") {
                            let values = [];
                            for (const [k, v] of Object.entries(value)) {
                                values.push({
                                    [k]: v
                                });
                            }
                            this.ConvertDynamoDBData(values)
                                .then((response) => {
                                    value = response;
                                })
                                .catch((error) => {
                                    reject(error);
                                });
                        }
                        result[Object.keys(returndata)[i]] = value;
                    }
                    results.push(result);
                }
                resolve(results);
            } catch (error) {
                reject(error);
            }
        });
    }

    ConvertFormData(data) {
        return new Promise((resolve, reject) => {
            try {
                var results = data.map((item) => {
                    item = JSON.parse(item.S);
                    switch (item.type) {
                        case "input":
                            return {
                                name: item.name,
                                elementType: item.type,
                                label: item.label,
                                elementConfig: {
                                    placeholder: item.placeholder || ""
                                },
                                value: item.value || "",
                                validation: {...item.validations },
                                valid: item.validations.required ?
                                    item.value ?
                                    true :
                                    false : true,
                                touched: item.value ? true : false
                            };
                        case "image":
                            return {
                                name: item.name,
                                elementType: item.type,
                                label: item.label,
                                elementConfig: {
                                    maxFiles: item.maxFiles || 1,
                                    fileTypes: item.fileTypes
                                },
                                value: item.value || "",
                                validation: {...item.validations },
                                valid: item.validations.required ?
                                    item.value ?
                                    true :
                                    false : true,
                                touched: item.value ? true : false
                            };
                        case "textarea":
                            return {
                                name: item.name,
                                elementType: item.type,
                                label: item.label,
                                elementConfig: {
                                    placeholder: item.placeholder
                                },
                                value: item.value || "",
                                validation: {...item.validations },
                                valid: item.validations.required ?
                                    item.value ?
                                    true :
                                    false : true,
                                touched: item.value ? true : false
                            };
                        case "phone":
                            return {
                                name: item.name,
                                elementType: item.type,
                                label: item.label,
                                elementConfig: {
                                    // placeholder: item.placeholder,
                                    type: "text"
                                },
                                value: item.value || "",
                                validation: {...item.validations },
                                valid: item.validations.required ?
                                    item.value ?
                                    true :
                                    false : true,
                                touched: item.value ? true : false
                            };
                        case "select":
                            return {
                                name: item.name,
                                elementType: item.type,
                                label: item.label,
                                elementConfig: {
                                    options: item.options
                                },
                                value: item.value || "",
                                validation: {...item.validations },
                                valid: item.validations.required ?
                                    item.value ?
                                    true :
                                    false : true,
                                touched: item.value ? true : false
                            };
                        case "searchselect":
                            return {
                                name: item.name,
                                elementType: item.type,
                                label: item.label,
                                elementConfig: {
                                    options: item.options
                                },
                                value: item.value || "",
                                validation: {...item.validations },
                                valid: item.validations.required ?
                                    item.value ?
                                    true :
                                    false : true,
                                touched: item.value ? true : false
                            };
                        case "multiselect":
                            return {
                                name: item.name,
                                elementType: item.type,
                                label: item.label,
                                elementConfig: {
                                    options: item.options
                                },
                                value: item.value || [],
                                validation: {...item.validations },
                                valid: item.validations.required ?
                                    item.value ?
                                    true :
                                    false : true,
                                touched: item.value ? true : false
                            };
                        case "date":
                            return {
                                name: item.name,
                                elementType: item.type,
                                label: item.label,
                                elementConfig: {
                                    placeholder: item.placeholder,
                                    type: "text"
                                },
                                value: new Date(item.value) || "",
                                validation: {...item.validations },
                                valid: item.validations.required ?
                                    item.value ?
                                    true :
                                    false : true,
                                touched: item.value ? true : false
                            };
                        case "datetime":
                            return {
                                name: item.name,
                                elementType: item.type,
                                label: item.label,
                                elementConfig: {
                                    placeholder: item.placeholder,
                                    type: "text"
                                },
                                value: new Date(item.value) || "",
                                validation: {...item.validations },
                                valid: item.validations.required ?
                                    item.value ?
                                    true :
                                    false : true,
                                touched: item.value ? true : false
                            };
                        case "daterange":
                            return {
                                name: item.name,
                                elementType: item.type,
                                label: item.label,
                                elementConfig: {},
                                value: item.value || [],
                                validation: {...item.validations },
                                valid: item.validations.required ?
                                    item.value ?
                                    true :
                                    false : true,
                                touched: item.value ? true : false
                            };
                        case "checkbox":
                            return {
                                name: item.name,
                                elementType: item.type,
                                label: item.label,
                                elementConfig: {
                                    checked: item.value || false
                                },
                                value: item.value || false,
                                valid: true,
                                touched: true
                            };
                        default:
                            return {
                                name: item.name,
                                elementType: item.type,
                                label: item.label,
                                elementConfig: {
                                    placeholder: item.placeholder,
                                    type: "text"
                                },
                                value: "",
                                validation: {...item.validations },
                                valid: item.validations.required ?
                                    item.value ?
                                    true :
                                    false : true,
                                touched: item.value ? true : false
                            };
                    }
                });

                const initialValue = {};
                var resultsNaObject = results.reduce((obj, item) => {
                    return {
                        ...obj,
                        [item["name"]]: item
                    };
                }, initialValue);

                resolve(JSON.stringify(resultsNaObject));
            } catch (error) {
                reject(error);
            }
        });
    }
}

exports.BSHelper = BSHelper;
exports.Logger = Logger;
exports.DataTransformer = DataTransformer;

exports.BSUserUnknown = BSUserUnknown;
exports.BSBoerderyUnspecified = BSBoerderyUnspecified;
exports.BSBittoelatingsBlokUnspecified = BSBittoelatingsBlokUnspecified;
exports.BSBitmaskUnspecified = BSBitmaskUnspecified;