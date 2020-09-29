import { TypedEmitter } from "tiny-typed-emitter";
import {
  FlicBatteryStatusListener,
  FlicClient,
  FlicConnectionChannel,
} from "./fliclib";
import { ConnectionStatusValues } from "./fliclib/enum";
import { GetButtonInfoResponseEvent } from "./fliclib/events";

export type ButtonEventNames =
  | "ButtonClick"
  | "ButtonSingleClick"
  | "ButtonDoubleClick"
  | "ButtonHold"
  | "ButtonDown"
  | "ButtonUp";

export interface ButtonEventParams {
  eventType: ButtonEventNames;
  wasQueued: boolean;
  timeDiff: number;
}

type ButtonEvents = Record<
  ButtonEventNames,
  (params: ButtonEventParams) => void
> & {
  ButtonStatusChanged: (params: {
    connectionStatus: ConnectionStatusValues;
  }) => void;
  ButtonBatteryPercentage: (params: { percentage: number }) => void;
};

export class Button extends TypedEmitter<ButtonEvents> {
  private channel?: FlicConnectionChannel;
  private battery?: FlicBatteryStatusListener;
  private status: ConnectionStatusValues = "Disconnected";
  private percentage: number = -1;

  constructor(private info: GetButtonInfoResponseEvent) {
    super();
  }

  get connectionStatus() {
    return this.status;
  }

  get batteryPercentage() {
    return this.percentage;
  }

  private setStatus(connectionStatus: ConnectionStatusValues) {
    this.status = connectionStatus;
    this.emit("ButtonStatusChanged", { connectionStatus: this.status });
  }

  private setBattery(percentage: number) {
    this.percentage = percentage;
    this.emit("ButtonBatteryPercentage", { percentage });
  }

  async start(client: FlicClient) {
    this.channel = new FlicConnectionChannel(this.info.bdAddr);
    client.addConnectionChannel(this.channel);

    this.battery = new FlicBatteryStatusListener(this.info.bdAddr);
    client.addBatteryStatusListener(this.battery);

    this.channel.on("buttonUpOrDown", (clickType, wasQueued, timeDiff) => {
      switch (clickType) {
        case "ButtonDown":
        case "ButtonUp":
          this.emit(clickType, {
            eventType: clickType,
            wasQueued,
            timeDiff,
          });
          break;
      }
    });

    this.channel.on("buttonClickOrHold", (clickType, wasQueued, timeDiff) => {
      switch (clickType) {
        case "ButtonClick":
          this.emit(clickType, {
            eventType: clickType,
            wasQueued,
            timeDiff,
          });
          break;
      }
    });

    this.channel.on(
      "buttonSingleOrDoubleClickOrHold",
      (clickType, wasQueued, timeDiff) => {
        switch (clickType) {
          case "ButtonSingleClick":
          case "ButtonDoubleClick":
          case "ButtonHold":
            this.emit(clickType, {
              eventType: clickType,
              wasQueued,
              timeDiff,
            });
            break;
        }
      }
    );
    this.channel.on(
      "connectionStatusChanged",
      (connectionStatus, disconnectReason) => {
        this.setStatus(connectionStatus);
        // console.log(
        //   "connectionStatusChanged",
        //   connectionStatus,
        //   disconnectReason
        // );
        // TODO: support disconnectReason
      }
    );
    this.channel.on("createResponse", (error, connectionStatus) => {
      this.setStatus(connectionStatus);
      // console.log("createResponse", error, connectionStatus);
      // TODO: support error=MaxPendingConnectionsReached
    });
    this.channel.on("removed", (removedReason) => {
      // console.log("removed", removedReason);
      // TODO: handle removed
    });
    this.battery.on("batteryStatus", (batteryPercentage, timestamp) => {
      this.setBattery(batteryPercentage);
      // console.log("batteryStatus", batteryPercentage, timestamp);
    });
  }

  async stop(client: FlicClient) {
    if (this.channel) client.removeConnectionChannel(this.channel);
    if (this.battery) client.removeBatteryStatusListener(this.battery);
    this.removeAllListeners();
  }
}
