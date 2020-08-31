jest.mock('../dynamodb', () => {
    return {
        query: jest.fn((params, callback) => {
            if (params.ExpressionAttributeValues[":uid"].S == "oneuser") {
                var result = {
                    Count: 1,
                    Items: [
                        {
                            boerderyuuid: {
                                S: "1234-5678"
                            },
                            rolle: {
                                SS: [
                                    "t2"
                                ]
                            },
                            userid: {
                                S: "oneuser"
                            }
                        } 
                    ]
                };
                callback(null, result);
            } else if (params.ExpressionAttributeValues[":uid"].S == "twouser") {
                var result = {
                    Count: 2
                };
                callback(null, result);
            } else {
                var result = {
                    Count: 0
                };
                callback(null, result);
            }
        }),
        batchGetItem: jest.fn((params, callback) => {
            var result = {
                Responses: {
                    BoerderyRolleDB: [
                        {
                            bittoelatings_b: {
                                N: "4160"
                            },
                            boerderyuuid: {
                            S: "templaat"
                            },
                            rolid: {
                            N: "2"
                            },
                            rolnaam: {
                            S: "Test role 2"
                            }
                        }
                    ]
                }
            };
            callback(null, result);
        })
    };
});

var dynamodb = require("../dynamodb");
var bshelper = require("../bshelper");
process.env.BoerderyRolleDB = "BoerderyRolleDB";

describe("Validation checks", () => {
    test("Unknown User exception thrown", async () => {
        await expect(bshelper.IsBoerderyGeldig(undefined, "1234")).rejects.toThrowError(bshelper.BSUnknownError);
        await expect(bshelper.IsBoerderyGeldig("", "1234")).rejects.toThrowError(bshelper.BSUnknownError);
    });
    
    test("Boerdery Unspecified exception thrown", async () => {
        await expect(bshelper.IsBoerderyGeldig("qwerty", undefined)).rejects.toThrowError(bshelper.BSBoerderyUnspecified);
        await expect(bshelper.IsBoerderyGeldig("qwerty", "")).rejects.toThrowError(bshelper.BSBoerderyUnspecified);
    });

    test("Bittoelatingsblok Unspecified exception thrown", async () => {
        await expect(bshelper.IsBoerderyGeldig("qwerty", "1234", undefined)).rejects.toThrowError(bshelper.BSBittoelatingsBlokUnspecified);
        await expect(bshelper.IsBoerderyGeldig("qwerty", "1234", "")).rejects.toThrowError(bshelper.BSBittoelatingsBlokUnspecified);
    });
});

describe("Databases", () => {
    test("have been called", async () => {
        const result = await bshelper.IsBoerderyGeldig("oneuser", "1234-5678", 0, "0");
        expect(dynamodb.query).toHaveBeenCalled();
        expect(dynamodb.batchGetItem).toHaveBeenCalled();
    });
});

describe("User with access to one business", () => {
    test("is allowed", async () => {
        const result = await bshelper.IsBoerderyGeldig("oneuser", "1234-5678", 1, "64");
        expect(result).toBe(true);
    });

    test("is not allowed", async () => {
        const result = await bshelper.IsBoerderyGeldig("oneuser", "1234-5678", 1, "1");
        expect(result).toBe(false);
    });
});