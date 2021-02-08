"use strict";

var moment = require('moment');

class BSUserUnknown extends Error {}

class BSBoerderyUnspecified extends Error {}

class BSSPUnspecified extends Error {}

class BSBittoelatingsBlokUnspecified extends Error {}

class BSBitmaskUnspecified extends Error {}

class BSHelper {

    constructor(dynamodb) {
        this.dynamodb = dynamodb;
        this.dataTransformer = new DataTransformer();
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

    IsSPGeldig(userid, spuuid, bittoelatingsblok, bitmask) {
        return new Promise((resolve, reject) => {
            try {
                if (typeof userid === 'undefined' || !userid) {
                    reject(new BSUserUnknown('Geen gebruiker identifikasie. Probeer weer inteken.'));
                }
                if (typeof spuuid === 'undefined' || !spuuid) {
                    reject(new BSSPUnspecified('Geen diensverskaffer identifikasie gespesifiseer.'));
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
                            S: spuuid.toString()
                        }
                    },
                    KeyConditionExpression: "userid = :uid AND spuuid = :bid",
                    TableName: process.env.SPUsersDB
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
                                        queryList.push({ "spuuid": { S: "templaat" }, "rolid": { S: rolid.slice(1).toString() } });
                                    } else {
                                        queryList.push({ "spuuid": { S: spuuid.toString() }, "rolid": { S: rolid.toString() } });
                                    }
                                };
                                var params = {
                                    RequestItems: {
                                        [process.env.SPRolleDB]: {
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
                                            let toelatings = data.Responses[process.env.SPRolleDB].map(rekord => {
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

    KryToelatings(boerderyuuid, gebruikernaam, module) {
        return new Promise((resolve, reject) => {
            try {
                let ddbparams = {
                    ExpressionAttributeValues: {
                        ":bid": {
                            S: boerderyuuid.toString()
                        },
                        ":uid": {
                            S: gebruikernaam.toString()
                        },
                        ":mid": {
                            S: module.toString()
                        }
                    },
                    ExpressionAttributeNames: {
                        "#sk": "gebruikernaam-module-weergawe",
                        '#mid': 'module'
                    },
                    FilterExpression: "#mid = :mid",
                    KeyConditionExpression: "boerderyuuid = :bid AND begins_with(#sk, :uid)",
                    TableName: process.env.ModuleToelatingsDB,
                    ProjectionExpression: "boerderyuuid, toelatings, weergawe"
                };

                // console.log(JSON.stringify(ddbparams));
                this.dynamodb.query(ddbparams, (err, data) => {
                    if (err) {
                        console.error(err);
                        reject(err);
                    } else {
                        if (data.Count > 0) {
                            this.dataTransformer.ConvertDynamoDBData(data.Items).then(results => {
                                let finalresult = results.map(item => {
                                    let newData = {...item };
                                    delete newData.boerderyuuid;
                                    return newData;
                                });
                                let biggest = Math.max.apply(Math, finalresult.map(item => parseInt(item.weergawe, 10)));
                                finalresult = finalresult.filter(item => parseInt(item.weergawe, 10) === biggest);
                                resolve(finalresult[0].toelatings);
                            }).catch(error => {
                                console.error(error);
                                reject(error);
                            });
                        } else {
                            resolve(false);
                        }
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    ModuleToelatings(boerderyuuid, gebruikernaam, module, toelatingbenodig) {
        return new Promise((resolve, reject) => {
            try {
                this.KryToelatings(boerderyuuid, gebruikernaam, module).then(results => {
                    const permissionsowned = JSON.parse(results);
                    if (permissionsowned) {
                        let allowed = false;
                        const permissionAfdeling = toelatingbenodig.substr(
                            0,
                            toelatingbenodig.indexOf(":")
                        );
                        const requiredPermissions = toelatingbenodig.substr(
                            toelatingbenodig.indexOf(":") + 1,
                            toelatingbenodig.length + 1
                        );
                        if (permissionsowned[permissionAfdeling][requiredPermissions] === true) {
                            allowed = true;
                        } else if (
                            permissionsowned[permissionAfdeling][requiredPermissions] === false
                        ) {
                            allowed = false;
                        } else {
                            allowed = permissionsowned[permissionAfdeling][requiredPermissions];
                        }

                        resolve(allowed);
                    } else {
                        resolve(false);
                    }
                }).catch(error => {
                    console.error(error);
                    reject(error);
                })
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
                (async() => {
                    for await (const returndata of data) {
                        let result = {};
                        for (const [k, v] of Object.entries(returndata)) {
                            let key = Object.keys(v)[0];
                            let value = Object.values(v);
                            if (key === "N") {
                                value = !isNaN(value[0]) && value[0].toString().indexOf(".") !== -1 ?
                                    parseFloat(value[0]) :
                                    parseInt(value[0], 10);
                            }
                            if (key === "NS") {
                                value = value[0].map(item => !isNaN(item) && item.toString().indexOf(".") !== -1 ?
                                    parseFloat(item) :
                                    parseInt(item, 10));
                            }
                            if (key === "L") {
                                value = await this.ConvertDynamoDBData(value);
                                let val = [];
                                for (var i = 0; i < value.length; i++) {
                                    val.push(Object.values(Object.values(value)[i]));
                                }
                                value = val[0];
                            }
                            if (key === "M") {
                                let values = [];
                                for (const [k, v] of Object.entries(value[0])) {
                                    values.push({
                                        [k]: v
                                    });
                                }
                                value = await this.ConvertDynamoDBData(values);
                                let val = {};
                                for (var i = 0; i < value.length; i++) {
                                    val[Object.keys(Object.values(value)[i])[0]] = Object.values(Object.values(value)[i])[0];
                                }
                                value = val;
                            }
                            if (key === "S" || key === "BOOL") {
                                value = value[0];
                            }
                            result[k] = value;
                        }
                        results.push(result);
                    }
                    resolve(results);
                })().catch(error => {
                    console.error("Caught: " + error);
                    reject(error);
                });
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