# BS-Helper

BS-Helper is a package with "helper" functions to perform certain tasks such as:
* Convert DynamoDB raw data into a "normalised" array of json objects.
* Convert custom form data into a way that the user can draw a form item. 
* Do logging into a DynamoDB table (specific to the creaters of the package).

## Installation

Use the package manager npm to install BS-Helper.

```bash
npm install @allesbeste/bshelper
```

## Usage

### ConvertDynamoDBData
You can pass in an array of DynamoDB result objects and an array of "normalised" json data will be returned.

Tested conversions include: **S, SS, N, NS, L, M, BOOL**

```nodejs
var Helper = require("@allesbeste/bshelper");
var dataTransformer = new Helper.DataTransformer();

await dataTransformer.ConvertDynamoDBData([
{
    "mystring": {
        "S": "10_1615533454"
    },
    "mynumberset": {
        "NS": [
            "15",
            "191",
            "190"
        ]
    },
    "mynumber": {
        "N": "13"
    }
}]);

/* The result:
[{
    "mystring": "10_1615533454",
    "mynumberset": [
        15,
        191,
        190
    ],
    "mynumber": 13
}]
*/
```

### ConvertFormData
You can pass in an array of a stringified JSON object that describes the form item and the function returns the form item data in a way that it can be drawn by the user.

```nodejs
var Helper = require("@allesbeste/bshelper");
var dataTransformer = new Helper.DataTransformer();

await dataTransformer.ConvertFormData(["{\"label\":\"Aantal uitgepen\",\"type\":\"input\",\"name\":\"c_aantal_uitgepen\",\"placeholder\":\"100\",\"validations\":{\"required\":false}}","{\"label\":\"Spasieering\",\"type\":\"radio\",\"name\":\"c_spasieering\",\"validations\":{},\"options\":[{\"key\":1,\"value\":\"1x4\",\"text\":\"1x4\"},{\"key\":2,\"value\":\"2x3\",\"text\":\"2x3\"},{\"key\":3,\"value\":\"3x5\",\"text\":\"3x5\"}]}"]);

/* The result:
"{\"c_aantal_uitgepen\":{\"name\":\"c_aantal_uitgepen\",\"elementType\":\"input\",\"label\":\"Aantal uitgepen\",\"elementConfig\":{\"placeholder\":\"100\"},\"value\":\"\",\"validation\":{\"required\":false},\"valid\":true,\"touched\":false},\"c_spasieering\":{\"name\":\"c_spasieering\",\"elementType\":\"radio\",\"label\":\"Spasieering\",\"elementConfig\":{\"options\":[{\"key\":1,\"value\":\"1x4\",\"text\":\"1x4\"},{\"key\":2,\"value\":\"2x3\",\"text\":\"2x3\"},{\"key\":3,\"value\":\"3x5\",\"text\":\"3x5\"}]},\"value\":\"\",\"validation\":{},\"valid\":true,\"touched\":false}}"
*/
```

### Logger 
This logs your data to the dynamoDB table you provided.

```nodejs
var Helper = require("@allesbeste/bshelper");
var dynamodb = new DynamoDB({ apiVersion: "" });

var logger = new Helper.Logger(dynamodb, boerderyuuid, gebruiker_username, httpMethod, path, spuuid);

await logger.LogTransaksie(
 "Hoofafdeling",
 "Afdeling",
 "Beskrywing",
 "Request",
 "Params",
 "Body",
 "Result",
 "Itemdata"
);
```


## License
Copyright (C) AH Ernst en Seuns (Pty) Ltd - All Rights Reserved
Unauthorized copying of this file, via any medium is strictly prohibited

Proprietary and confidential
Written by Edrean Ernst <edrean@allesbeste.com> and team, 2020