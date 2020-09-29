import { FlicRawClient } from "./raw-client";
import { TypedEmitter } from "tiny-typed-emitter";
import {
  ClickTypeValues,
  ConnectionStatusValues,
  CreateConnectionChannelErrorValues,
  DisconnectReasonValues,
  FlicCommandOpcodes,
  FlicEventOpcodes,
  LatencyModeValues,
  RemovedReasonValues,
} from "./enum";
import { BDAddress } from "./types";
import {
  ButtonEvent,
  ConnectionChannelRemovedEvent,
  ConnectionStatusChangedEvent,
  CreateConnectionChannelResponseEvent,
} from "./events";

let counter = 0;

interface ConstructorOptions {
  latencyMode?: LatencyModeValues;
  autoDisconnectTime?: number;
}

interface FlicConnectionChannelEvents {
  createResponse: (
    error: CreateConnectionChannelErrorValues,
    connectionStatus: ConnectionStatusValues
  ) => void;
  removed: (removedReason: RemovedReasonValues) => void;
  connectionStatusChanged: (
    connectionStatus: ConnectionStatusValues,
    disconnectReason: DisconnectReasonValues
  ) => void;
  buttonUpOrDown: (
    clickType: ClickTypeValues,
    wasQueued: boolean,
    timeDiff: number
  ) => void;
  buttonClickOrHold: (
    clickType: ClickTypeValues,
    wasQueued: boolean,
    timeDiff: number
  ) => void;
  buttonSingleOrDoubleClick: (
    clickType: ClickTypeValues,
    wasQueued: boolean,
    timeDiff: number
  ) => void;
  buttonSingleOrDoubleClickOrHold: (
    clickType: ClickTypeValues,
    wasQueued: boolean,
    timeDiff: number
  ) => void;
}

/**
 * FlicConnectionChannel
 *
 * A logical connection to a Flic button.
 * First create a connection channel, then add it to a FlicClient.
 *
 * Events:
 *
 * createResponse: error, connectionStatus
 * removed: removedReason
 * connectionStatusChanged: connectionStatus, disconnectReason
 *
 * buttonUpOrDown: clickType, wasQueued, timeDiff
 * buttonClickOrHold: clickType, wasQueued, timeDiff
 * buttonSingleOrDoubleClick: clickType, wasQueued, timeDiff
 * buttonSingleOrDoubleClickOrHold: clickType, wasQueued, timeDiff
 */
export class FlicConnectionChannel extends TypedEmitter<
  FlicConnectionChannelEvents
> {
  private _client: FlicRawClient | null = null;
  private _id: number = counter++;
  private _latencyMode: LatencyModeValues;
  private _autoDisconnectTime: number;

  constructor(private _bdAddr: BDAddress, options?: ConstructorOptions) {
    super();
    options = options || {};
    this._latencyMode = options.latencyMode || "NormalLatency";
    this._autoDisconnectTime = options.autoDisconnectTime || 511;
  }

  get latencyMode(): LatencyModeValues {
    return this._latencyMode;
  }

  set latencyMode(value: LatencyModeValues) {
    this._latencyMode = value;
    if (this._client != null) {
      this._client.sendCommand(FlicCommandOpcodes.ChangeModeParameters, {
        connId: this._id,
        latencyMode: this._latencyMode,
        autoDisconnectTime: this._autoDisconnectTime,
      });
    }
  }

  get autoDisconnectTime(): number {
    return this._autoDisconnectTime;
  }

  set autoDisconnectTime(value: number) {
    this._autoDisconnectTime = value;
    if (this._client != null) {
      this._client.sendCommand(FlicCommandOpcodes.ChangeModeParameters, {
        connId: this._id,
        latencyMode: this._latencyMode,
        autoDisconnectTime: this._autoDisconnectTime,
      });
    }
  }

  getId() {
    return this._id;
  }

  attach(rawClient: FlicRawClient) {
    this._client = rawClient;
    rawClient.sendCommand(FlicCommandOpcodes.CreateConnectionChannel, {
      connId: this._id,
      bdAddr: this._bdAddr,
      latencyMode: this._latencyMode,
      autoDisconnectTime: this._autoDisconnectTime,
    });
  }

  detach(rawClient: FlicRawClient) {
    rawClient.sendCommand(FlicCommandOpcodes.RemoveConnectionChannel, {
      connId: this._id,
    });
  }

  detached() {
    this._client = null;
  }

  onEvent(
    opcode: number,
    event:
      | CreateConnectionChannelResponseEvent
      | ConnectionStatusChangedEvent
      | ConnectionChannelRemovedEvent
      | ButtonEvent
  ) {
    switch (opcode) {
      case FlicEventOpcodes.CreateConnectionChannelResponse:
        const createConnectionChannelResponseEvent = event as CreateConnectionChannelResponseEvent;
        this.emit(
          "createResponse",
          createConnectionChannelResponseEvent.error,
          createConnectionChannelResponseEvent.connectionStatus
        );
        break;
      case FlicEventOpcodes.ConnectionStatusChanged:
        const connectionStatusChangedEvent = event as ConnectionStatusChangedEvent;
        this.emit(
          "connectionStatusChanged",
          connectionStatusChangedEvent.connectionStatus,
          connectionStatusChangedEvent.disconnectReason
        );
        break;
      case FlicEventOpcodes.ConnectionChannelRemoved:
        const connectionChannelRemovedEvent = event as ConnectionChannelRemovedEvent;
        if (connectionChannelRemovedEvent.removedReason) {
          this.emit("removed", connectionChannelRemovedEvent.removedReason);
        }
        break;
      case FlicEventOpcodes.ButtonUpOrDown:
        const buttonUpOrDownEvent = event as ButtonEvent;
        this.emit(
          "buttonUpOrDown",
          buttonUpOrDownEvent.clickType,
          buttonUpOrDownEvent.wasQueued,
          buttonUpOrDownEvent.timeDiff
        );
        break;
      case FlicEventOpcodes.ButtonClickOrHold:
        const buttonClickOrHold = event as ButtonEvent;
        this.emit(
          "buttonClickOrHold",
          buttonClickOrHold.clickType,
          buttonClickOrHold.wasQueued,
          buttonClickOrHold.timeDiff
        );
        break;
      case FlicEventOpcodes.ButtonSingleOrDoubleClick:
        const buttonSingleOrDoubleClick = event as ButtonEvent;
        this.emit(
          "buttonSingleOrDoubleClick",
          buttonSingleOrDoubleClick.clickType,
          buttonSingleOrDoubleClick.wasQueued,
          buttonSingleOrDoubleClick.timeDiff
        );
        break;
      case FlicEventOpcodes.ButtonSingleOrDoubleClickOrHold:
        const buttonSingleOrDoubleClickOrHold = event as ButtonEvent;
        this.emit(
          "buttonSingleOrDoubleClickOrHold",
          buttonSingleOrDoubleClickOrHold.clickType,
          buttonSingleOrDoubleClickOrHold.wasQueued,
          buttonSingleOrDoubleClickOrHold.timeDiff
        );
        break;
    }
  }
}
