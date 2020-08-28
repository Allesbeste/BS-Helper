jest.mock('../dynamodb', () => {
    return {
        query: jest.fn((params, callback) => {
            var result = {
                Count: 0
            };
            callback(null, result);
        }),
        batchGetItem: jest.fn((params, callback) => {
            var result = {
                Responses: {

                }
            };
            callback(null, result);
        })
    };
});

var dynamodb = require("../dynamodb");
var bshelper = require("../bshelper");

test("Unknown User exception is thrown", async () => {
    await expect(bshelper.IsBoerderyGeldig(undefined, "1234")).rejects.toThrowError(bshelper.BSUnknownError);
    await expect(bshelper.IsBoerderyGeldig("", "1234")).rejects.toThrowError(bshelper.BSUnknownError);
});

test("Boerdery Unspecified exception is thrown", async () => {
    await expect(bshelper.IsBoerderyGeldig("qwerty", undefined)).rejects.toThrowError(bshelper.BSBoerderyUnspecified);
    await expect(bshelper.IsBoerderyGeldig("qwerty", "")).rejects.toThrowError(bshelper.BSBoerderyUnspecified);
});

describe('DynamoDB call test', () => {
    afterEach(() => jest.resetAllMocks());

    it('fetches permissions', async () => {
        const result = await bshelper.IsBoerderyGeldig("qwerty", "1234", 0, "32");
        expect(dynamodb.query).toHaveBeenCalled();
        expect(result).toBe(false);
    });
});