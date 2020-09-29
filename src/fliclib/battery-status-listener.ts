import { TypedEmitter } from "tiny-typed-emitter";
import { FlicEventOpcodes, FlicCommandOpcodes } from "./enum";
import { FlicRawClient } from "./raw-client";
import { BatteryStatusEvent } from "./events";
import { BDAddress, FlicCommandOpcode } from "./types";

let counter = 0;

interface FlicBatteryStatusListenerEvents {
  batteryStatus: (batteryPercentage: number, timestamp: Date) => void;
}

/*
 * FlicBatteryStatusListener
 *
 * First create a FlicBatteryStatusListener, then add it to the FlicClient.
 *
 * Events:
 * batteryStatus: batteryPercentage, timestamp (JS Date object)
 */
export class FlicBatteryStatusListener extends TypedEmitter<
  FlicBatteryStatusListenerEvents
> {
  private _id: number = counter++;

  constructor(private _bdAddr: BDAddress) {
    super();
  }

  public getId(): number {
    return this._id;
  }

  public attach(rawClient: FlicRawClient) {
    rawClient.sendCommand(FlicCommandOpcodes.CreateBatteryStatusListener, {
      listenerId: this._id,
      bdAddr: this._bdAddr,
    });
  }
  public detach(rawClient: FlicRawClient) {
    rawClient.sendCommand(FlicCommandOpcodes.RemoveBatteryStatusListener, {
      listenerId: this._id,
    });
  }
  public onEvent(opcode: FlicCommandOpcode, event: BatteryStatusEvent) {
    switch (opcode) {
      case FlicEventOpcodes.BatteryStatus:
        this.emit("batteryStatus", event.batteryPercentage, event.timestamp);
        break;
    }
  }
}
