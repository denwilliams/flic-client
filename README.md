# flic-client

Client library for the Flic linux daemon, ported to Typescript and Promises from the official one

## Why?

Because the [original one](https://raw.githubusercontent.com/50ButtonsEach/fliclib-linux-hci/master/clientlib/nodejs/fliclibNodeJs.js) is lacking types, and uses callbacks, and I don't like that 👎

## Requirements

Uses Typescript compilation target ES2017, so requires NodeJS >= 8.10.

## Usage

```js
import { FlicClient } from "./client";

var client = new FlicClient("192.168.1.23", 5551);
// Start connects to the service and connects to all buttons
await client.start();

client.on("ButtonSingleClick", console.log);
client.on("ButtonDoubleClick", console.log);
client.on("ButtonHold", console.log);
client.on("ButtonUp", console.log);
client.on("ButtonDown", console.log);
client.on("ButtonClick", console.log);
client.on("ButtonStatusChanged", console.log);
client.on("ButtonBatteryPercentage", console.log);

// Disconnect from all buttons
await client.stop();
```
