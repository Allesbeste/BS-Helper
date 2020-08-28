var AWSDynamoDB = require('aws-sdk/clients/dynamodb');
var dynamodb = new AWSDynamoDB({ apiVersion: '2012-08-10' });

class BSUserUnknown extends Error {}

class BSBoerderyUnspecified extends Error {}

exports.IsBoerderyGeldig = (userid, boerderyuuid) => {

    return new Promise((resolve, reject) => {
        try {
            if (typeof userid === 'undefined' || !userid) {
                reject(new BSUserUnknown('Geen gebruiker identifikasie. Probeer weer inteken.'));
                return;
            }
            if (typeof boerderyuuid === 'undefined' || !boerderyuuid) {
                reject(new BSBoerderyUnspecified('Geen boerdery identifikasie gespesifiseer.'));
                return;
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
            dynamodb.query(ddbparams, async(err, data) => {
                if (err) {
                    reject(err);
                } else {
                    if (data.Count > 0) {
                        // Het toegang - return BitToelatings
                        resolve(parseInt(data.Items[0].bittoelating.N), 10);
                    } else {
                        // Het nie toegang nie - return 0
                        resolve(0);
                    }
                }
            });
        } catch (error) {
            reject(error);
        }
    });
};