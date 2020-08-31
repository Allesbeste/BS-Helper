const dynamodb = {
    query(params, callback) {
        if (params.ExpressionAttributeValues[":bid"].S == "1234-5678") {
            var result = {
                Count: 1,
                Items: [
                    {
                        boerderyuuid: {
                            S: "1234-5678"
                        },
                        rolle: {
                            SS: [
                                "1234-5678",
                                "t1"
                            ]
                        },
                        userid: {
                            S: "oneuser"
                        }
                    }
                ]
            };
            callback(null, result);
        } else if (params.ExpressionAttributeValues[":bid"].S == "9876-5432") {
            var result = {
                Count: 2,
                Items: [
                    {
                        boerderyuuid: {
                            S: "9876-5432"
                        },
                        rolle: {
                            SS: [
                                "t1"
                            ]
                        },
                        userid: {
                            S: "oneuser"
                        }
                    } 
                ]
            };
            callback(null, result);
        } else if (params.ExpressionAttributeValues[":bid"].S == "0000") {
            var result = {
                Count: 1,
                Items: [
                    {
                        boerderyuuid: {
                            S: "0000"
                        },
                        rolle: {
                            SS: []
                        },
                        userid: {
                            S: "oneuser"
                        }
                    } 
                ]
            };
            callback(null, result);
        } else if (params.ExpressionAttributeValues[":bid"].S == "error") {
            var err = {
                message: "BoerderyUsersDB error"
            };
            callback(err);
        } else {
            var result = {
                Count: 0
            };
            callback(null, result);
        }
    },
    batchGetItem(params, callback) {
        if (params.RequestItems["BoerderyRolleDB"].ProjectionExpression == "bittoelatings_d") {
            var err = {
                message: "BoerderyRolleDB error"
            };
            callback(err);
        } else if (params.RequestItems["BoerderyRolleDB"].ProjectionExpression == "bittoelatings_e") {
            var result = {};
            callback(null, result);
        } else if (params.RequestItems["BoerderyRolleDB"].Keys.length == 1) {
            var result = {
                Responses: {
                    BoerderyRolleDB: [
                        {
                            bittoelatings_b: {
                                N: "10"
                            },
                            boerderyuuid: {
                            S: "templaat"
                            },
                            rolid: {
                            N: "1"
                            },
                            rolnaam: {
                            S: "Test role 1"
                            }
                        }
                    ]
                }
            };
            callback(null, result);
        } else if (params.RequestItems["BoerderyRolleDB"].Keys.length == 2) {
            var result = {
                Responses: {
                    BoerderyRolleDB: [
                        {
                            bittoelatings_b: {
                                N: "4160"
                            },
                            boerderyuuid: {
                            S: "1234-5678"
                            },
                            rolid: {
                            N: "1"
                            },
                            rolnaam: {
                            S: "Test role"
                            }
                        },
                        {
                            bittoelatings_b: {
                                N: "10"
                            },
                            boerderyuuid: {
                            S: "templaat"
                            },
                            rolid: {
                            N: "1"
                            },
                            rolnaam: {
                            S: "Test role 1"
                            }
                        }
                    ]
                }
            };
            callback(null, result);
        } else {
            var result = {
                Responses: {}
            };
            callback(null, result);
        }
    }
};

var bshelper = require("../bshelper");
var bsHelper = new bshelper.BSHelper(dynamodb);
process.env.BoerderyRolleDB = "BoerderyRolleDB";

describe("Validation checks", () => {
    test("Unknown User exception thrown", async () => {
        await expect(bsHelper.IsBoerderyGeldig(undefined, "1234", 1, "0")).rejects.toThrow(bshelper.BSUserUnknown);
        await expect(bsHelper.IsBoerderyGeldig("", "1234", 1, "0")).rejects.toThrow(bshelper.BSUserUnknown);
    });
    
    test("Boerdery Unspecified exception thrown", async () => {
        await expect(bsHelper.IsBoerderyGeldig("qwerty", undefined, 1, "0")).rejects.toThrow(bshelper.BSBoerderyUnspecified);
        await expect(bsHelper.IsBoerderyGeldig("qwerty", "", 1, "0")).rejects.toThrow(bshelper.BSBoerderyUnspecified);
    });

    test("Bittoelatingsblok Unspecified exception thrown", async () => {
        await expect(bsHelper.IsBoerderyGeldig("qwerty", "1234", undefined, "0")).rejects.toThrow(bshelper.BSBittoelatingsBlokUnspecified);
        await expect(bsHelper.IsBoerderyGeldig("qwerty", "1234", null, "0")).rejects.toThrow(bshelper.BSBittoelatingsBlokUnspecified);
    });

    test("Bitmask Unspecified exception thrown", async () => {
        await expect(bsHelper.IsBoerderyGeldig("qwerty", "1234", 1, undefined)).rejects.toThrow(bshelper.BSBitmaskUnspecified);
        await expect(bsHelper.IsBoerderyGeldig("qwerty", "1234", 1, null)).rejects.toThrow(bshelper.BSBitmaskUnspecified);
    });
});

describe("Databases", () => {
    test("have been called", async () => {
        const querySpy = jest.spyOn(dynamodb, "query");
        const bgiSpy = jest.spyOn(dynamodb, "batchGetItem");
        await bsHelper.IsBoerderyGeldig("oneuser", "1234-5678", 0, "0");
        expect(querySpy).toHaveBeenCalled();
        expect(bgiSpy).toHaveBeenCalled();
    });
});

describe("User with access to one business", () => {
    test("is allowed", async () => {
        const result = await bsHelper.IsBoerderyGeldig("oneuser", "1234-5678", 1, "72");
        expect(result).toBe(true);
    });

    test("is not allowed", async () => {
        var result = await bsHelper.IsBoerderyGeldig("oneuser", "1234-5678", 1, "1");
        expect(result).toBe(false);
        result = await bsHelper.IsBoerderyGeldig("oneuser", "0000", 1, "72");
        expect(result).toBe(false);
    });
});

describe("User with access to two businesses", () => {
    test("is allowed", async () => {
        const result = await bsHelper.IsBoerderyGeldig("oneuser", "9876-5432", 1, "2");
        expect(result).toBe(true);
    });

    test("is not allowed", async () => {
        const result = await bsHelper.IsBoerderyGeldig("oneuser", "9876-5432", 1, "72");
        expect(result).toBe(false);
    });
});

describe("BoerderyUsersDB query", () => {
    test("error is handled", async () => {
        await expect(bsHelper.IsBoerderyGeldig("oneuser", "error", 1, "1")).rejects.toHaveProperty("message", "BoerderyUsersDB error");
    });
});

describe("BoerderyRolleDB query", () => {
    test("error is handled", async () => {
        await expect(bsHelper.IsBoerderyGeldig("oneuser", "1234-5678", 3, "1")).rejects.toHaveProperty("message", "BoerderyRolleDB error");
    });
});

describe("BoerderyRolleDB result", () => {
    test("error is handled", async () => {
        await expect(bsHelper.IsBoerderyGeldig("oneuser", "1234-5678", 4, "1")).rejects.toThrow(TypeError);
    });
});