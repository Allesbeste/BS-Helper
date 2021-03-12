/* jslint node: true */
"use strict";

var moment = require('moment');

class Logger {

    constructor(dynamodb, boerderyuuid, gebruikernaam, httpMethod, path, spuuid) {
        this.dynamodb = dynamodb;
        this.boerderyuuid = boerderyuuid;
        this.gebruikernaam = gebruikernaam;
        this.httpMethod = httpMethod;
        this.path = path;
        this.spuuid = spuuid;
    }

    LogTransaksie(hoofafdeling, afdeling, beskrywing, request, params, body, result, itemdata) {
        return new Promise((resolve, reject) => {
            try {
                let ddbparams = {
                    Item: {
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
                if (this.spuuid == null) {
                    ddbparams.Item = {
                        ...ddbparams.Item,
                        "boerderyuuid": {
                            S: this.boerderyuuid.toString()
                        }
                    }
                } else {
                    ddbparams.Item = {
                        ...ddbparams.Item,
                        "spuuid": {
                            S: this.spuuid.toString()
                        }
                    }
                }
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
                            if (key === "SS") {
                                value = value[0];
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
                    item = JSON.parse(item);
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
                        case "radio":
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

exports.Logger = Logger;
exports.DataTransformer = DataTransformer;