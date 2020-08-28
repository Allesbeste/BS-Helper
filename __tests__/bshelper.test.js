var bshelper = require("../bshelper");

test("Unknown User exception is thrown", async () => {
    await expect(bshelper.IsBoerderyGeldig(undefined, "1234")).rejects.toThrowError(bshelper.BSUnknownError);
    await expect(bshelper.IsBoerderyGeldig("", "1234")).rejects.toThrowError(bshelper.BSUnknownError);
});

test("Boerdery Unspecified exception is thrown", async () => {
    await expect(bshelper.IsBoerderyGeldig("qwerty", undefined)).rejects.toThrowError(bshelper.BSBoerderyUnspecified);
    await expect(bshelper.IsBoerderyGeldig("qwerty", "")).rejects.toThrowError(bshelper.BSBoerderyUnspecified);
});