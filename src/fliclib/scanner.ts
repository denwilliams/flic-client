import { FlicRawClient } from "./raw-client";
import { TypedEmitter } from "tiny-typed-emitter";
import { FlicCommandOpcodes, FlicEventOpcodes } from "./enum";
import { AdvertisementPacketEvent } from "./events";
import { BDAddress } from "./types";

let counter = 0;

interface FlicScannerEvents {
  advertisementPacket: (
    bdAddr: BDAddress,
    name: string,
    rssi: number,
    isPrivate: boolean,
    alreadyVerified: boolean,
    alreadyConnectedToThisDevice: boolean,
    alreadyConnectedToOtherDevice: boolean
  ) => void;
}

/*
 * FlicScanner
 *
 * First create a FlicScanner, then add it to the FlicClient.
 *
 * Events:
 * advertisementPacket: bdAddr, name, rssi, isPrivate, alreadyVerified, alreadyConnectedToThisDevice, alreadyConnectedToOtherDevice
 */
export class FlicScanner extends TypedEmitter<FlicScannerEvents> {
  private _id: number = counter++;

  constructor() {
    super();
  }

  getId() {
    return this._id;
  }

  attach(rawClient: FlicRawClient) {
    rawClient.sendCommand(FlicCommandOpcodes.CreateScanner, {
      scanId: this._id,
    });
  }

  detach(rawClient: FlicRawClient) {
    rawClient.sendCommand(FlicCommandOpcodes.RemoveScanner, {
      scanId: this._id,
    });
  }

  onEvent(opcode: number, event: AdvertisementPacketEvent) {
    switch (opcode) {
      case FlicEventOpcodes.AdvertisementPacket:
        this.emit(
          "advertisementPacket",
          event.bdAddr,
          event.name,
          event.rssi,
          event.isPrivate,
          event.alreadyVerified,
          event.alreadyConnectedToThisDevice,
          event.alreadyConnectedToOtherDevice
        );
        break;
    }
  }
}
