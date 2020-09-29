import { TypedEmitter } from "tiny-typed-emitter";

import { FlicBatteryStatusListener } from "./battery-status-listener";
import { FlicConnectionChannel } from "./connection-channel";
import { FlicScanWizard } from "./scan-wizard";
import { FlicScanner } from "./scanner";
import { EventEmitter } from "events";
import { FlicRawClient } from "./raw-client";
import {
  FlicEventOpcodes,
  FlicCommandOpcodes,
  BluetoothControllerStateValues,
} from "./enum";
import { GetButtonInfoResponseEvent, GetInfoResponseEvent } from "./events";
import { BDAddress } from "./types";

interface Dict<T> {
  [index: string]: T;
}

interface ClientEvents {
  ready: () => void;
  close: (hadError: boolean) => void;
  error: (error: Error) => void;
  newVerifiedButton: (bdAddr: BDAddress) => void;
  noSpaceForNewConnection: (maxConcurrentlyConnectedButtons: number) => void;
  gotSpaceForNewConnection: (maxConcurrentlyConnectedButtons: number) => void;
  bluetoothControllerStateChange: (
    state: BluetoothControllerStateValues
  ) => void;
  buttonDeleted: (bdAddr: BDAddress, deletedByThisClient: boolean) => void;
}

/**
 * FlicClient
 *
 * High level class for communicating with flicd through a WebSocket proxy.
 *
 * Constructor: host, [port]
 *
 * Methods:
 * addScanner: FlicScanner
 * removeScanner: FlicScanner
 * addScanWizard: FlicScanWizard
 * cancelScanWizard: FlicScanWizard
 * addConnectionChannel: FlicConnectionChannel
 * removeConnectionChannel: FlicConnectionChannel
 * addBatteryStatusListener: FlicBatteryStatusListener
 * removeBatteryStatusListener: FlicBatteryStatusListener
 * getInfo: a callback function with one parameter "info", where info is a dictionary containing:
 *   bluetoothControllerState,
 *   myBdAddr,
 *   myBdAddrType,
 *   maxPendingConnections,
 *   maxConcurrentlyConnectedButtons,
 *   currentPendingConnections,
 *   bdAddrOfVerifiedButtons
 * getButtonInfo: bdAddr, callback
 *   Callback parameters: bdAddr, uuid, color, serialNumber
 * deleteButton: bdAddr
 * close
 *
 *
 * Events:
 * ready: (no parameters)
 * close: hadError
 * error: error
 * newVerifiedButton: bdAddr
 * noSpaceForNewConnection: maxConcurrentlyConnectedButtons
 * gotSpaceForNewConnection: maxConcurrentlyConnectedButtons
 * bluetoothControllerState: state
 * buttonDeleted: bdAddr, deletedByThisClient
 */
export class FlicClient extends TypedEmitter<ClientEvents> {
  private _rawClient: FlicRawClient;
  private _scanners: Dict<FlicScanner> = {};
  private _scanWizards: Dict<FlicScanWizard> = {};
  private _connectionChannels: Dict<FlicConnectionChannel> = {};
  private _batteryStatusListeners: Dict<FlicBatteryStatusListener> = {};

  private _getInfoResponseCallbackQueue: Array<Function> = [];
  private _getButtonInfoCallbackQueue: Array<Function> = [];

  constructor(host?: string, port?: number) {
    super();
    this._rawClient = new FlicRawClient(host, port);

    this._rawClient.onOpen = () => {
      this.emit("ready");
    };

    this._rawClient.onClose = (hadError) => {
      for (let connId in this._connectionChannels) {
        if (this._connectionChannels.hasOwnProperty(connId)) {
          this._connectionChannels[connId].detached();
        }
      }
      this.emit("close", hadError);
    };

    this._rawClient.onEvent = (opcode, event) => {
      switch (opcode) {
        case FlicEventOpcodes.AdvertisementPacket: {
          if (!("scanId" in event)) return;
          if (this._scanners[event.scanId]) {
            this._scanners[event.scanId].onEvent(opcode, event);
          }
          break;
        }
        case FlicEventOpcodes.CreateConnectionChannelResponse:
        case FlicEventOpcodes.ConnectionStatusChanged:
        case FlicEventOpcodes.ConnectionChannelRemoved:
        case FlicEventOpcodes.ButtonUpOrDown:
        case FlicEventOpcodes.ButtonClickOrHold:
        case FlicEventOpcodes.ButtonSingleOrDoubleClick:
        case FlicEventOpcodes.ButtonSingleOrDoubleClickOrHold: {
          if (!("connId" in event)) return;
          if (this._connectionChannels[event.connId]) {
            const cc: FlicConnectionChannel = this._connectionChannels[
              event.connId
            ];
            if (
              (opcode == FlicEventOpcodes.CreateConnectionChannel &&
                "error" in event &&
                event.error != "NoError") ||
              opcode == FlicEventOpcodes.ConnectionChannelRemoved
            ) {
              delete this._connectionChannels[event.connId];
              cc.detached();
            }
            cc.onEvent(opcode, event);
          }
          break;
        }
        case FlicEventOpcodes.NewVerifiedButton: {
          if (!("bdAddr" in event)) return;
          this.emit("newVerifiedButton", event.bdAddr);
          break;
        }
        case FlicEventOpcodes.GetInfoResponse: {
          const callback = this._getInfoResponseCallbackQueue.shift();
          if (callback) callback(event);
          break;
        }
        case FlicEventOpcodes.NoSpaceForNewConnection: {
          if (!("maxConcurrentlyConnectedButtons" in event)) return;
          this.emit(
            "noSpaceForNewConnection",
            event.maxConcurrentlyConnectedButtons
          );
          break;
        }
        case FlicEventOpcodes.GotSpaceForNewConnection: {
          if (!("maxConcurrentlyConnectedButtons" in event)) return;
          this.emit(
            "gotSpaceForNewConnection",
            event.maxConcurrentlyConnectedButtons
          );
          break;
        }
        case FlicEventOpcodes.BluetoothControllerStateChange: {
          if (!("state" in event)) return;
          if (event.state) {
            this.emit("bluetoothControllerStateChange", event.state);
          }
          break;
        }
        case FlicEventOpcodes.GetButtonInfoResponse: {
          if (!("bdAddr" in event) || !("uuid" in event)) return;
          const callback = this._getButtonInfoCallbackQueue.shift();
          if (callback) callback(event);
          break;
        }
        case FlicEventOpcodes.ScanWizardFoundPrivateButton:
        case FlicEventOpcodes.ScanWizardFoundPublicButton:
        case FlicEventOpcodes.ScanWizardButtonConnected:
        case FlicEventOpcodes.ScanWizardCompleted: {
          if (!("scanWizardId" in event)) return;
          if (this._scanWizards[event.scanWizardId]) {
            const scanWizard: FlicScanWizard = this._scanWizards[
              event.scanWizardId
            ];
            if (
              opcode == FlicEventOpcodes.ScanWizardCompleted &&
              "result" in event
            ) {
              delete this._scanWizards[event.scanWizardId];
            }
            scanWizard.onEvent(opcode, event);
          }
          break;
        }
        case FlicEventOpcodes.ButtonDeleted: {
          if (!("bdAddr" in event) || !("deletedByThisClient" in event)) return;
          this.emit("buttonDeleted", event.bdAddr, event.deletedByThisClient);
          break;
        }
        case FlicEventOpcodes.BatteryStatus: {
          if (!("listenerId" in event)) return;
          if (this._batteryStatusListeners[event.listenerId]) {
            this._batteryStatusListeners[event.listenerId].onEvent(
              opcode,
              event
            );
          }
          break;
        }
      }
    };

    this._rawClient.onError = (error) => {
      this.emit("error", error);
    };
  }

  reconnect(): void {
    this._rawClient.reconnect();
  }

  addScanner(flicScanner: FlicScanner): void {
    if (flicScanner.getId() in this._scanners) {
      return;
    }
    this._scanners[flicScanner.getId()] = flicScanner;
    flicScanner.attach(this._rawClient);
  }

  removeScanner(flicScanner: FlicScanner): void {
    if (!(flicScanner.getId() in this._scanners)) {
      return;
    }
    delete this._scanners[flicScanner.getId()];
    flicScanner.detach(this._rawClient);
  }

  addScanWizard(flicScanWizard: FlicScanWizard): void {
    if (flicScanWizard.getId() in this._scanWizards) {
      return;
    }
    this._scanWizards[flicScanWizard.getId()] = flicScanWizard;
    flicScanWizard.attach(this._rawClient);
  }

  cancelScanWizard(flicScanWizard: FlicScanWizard): void {
    if (!(flicScanWizard.getId() in this._scanWizards)) {
      return;
    }
    flicScanWizard.detach(this._rawClient);
  }

  addConnectionChannel(connectionChannel: FlicConnectionChannel): void {
    if (connectionChannel.getId() in this._connectionChannels) {
      return;
    }
    this._connectionChannels[connectionChannel.getId()] = connectionChannel;
    connectionChannel.attach(this._rawClient);
  }

  removeConnectionChannel(connectionChannel: FlicConnectionChannel): void {
    if (!(connectionChannel.getId() in this._connectionChannels)) {
      return;
    }
    connectionChannel.detach(this._rawClient);
  }

  addBatteryStatusListener(listener: FlicBatteryStatusListener) {
    if (listener.getId() in this._batteryStatusListeners) {
      return;
    }
    this._batteryStatusListeners[listener.getId()] = listener;
    listener.attach(this._rawClient);
  }

  removeBatteryStatusListener(listener: FlicBatteryStatusListener) {
    if (!(listener.getId() in this._batteryStatusListeners)) {
      return;
    }
    listener.detach(this._rawClient);
  }

  async getInfo(): Promise<GetInfoResponseEvent> {
    return new Promise((resolve) => {
      this._getInfoResponseCallbackQueue.push((data: GetInfoResponseEvent) => {
        resolve(data);
      });
      this._rawClient.sendCommand(FlicCommandOpcodes.GetInfo, {});
    });
  }

  async getButtonInfo(
    bdAddr: string
  ): Promise<GetButtonInfoResponseEvent | null> {
    return new Promise((resolve) => {
      this._getButtonInfoCallbackQueue.push(
        (data: GetButtonInfoResponseEvent) => {
          if (!data) return;

          if (data.uuid) resolve(data);
          else resolve(null);
        }
      );
      this._rawClient.sendCommand(FlicCommandOpcodes.GetButtonInfo, {
        bdAddr: bdAddr,
      });
    });
  }

  deleteButton(bdAddr: BDAddress): void {
    this._rawClient.sendCommand(FlicCommandOpcodes.DeleteButton, { bdAddr });
  }

  close(): void {
    this._rawClient.close();
  }
}
