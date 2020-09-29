import { Socket } from "net";
import {
  FlicEventOpcodes,
  FlicCommandOpcodes,
  BluetoothControllerStateValues,
  ScanWizardResultValues,
} from "./enum";
import { FlicEvent } from "./events";
import { BDAddress, FlicCommandOpcode } from "./types";

import {
  CreateConnectionChannelError,
  ConnectionStatus,
  DisconnectReason,
  RemovedReason,
  ClickType,
  BdAddrType,
  LatencyMode,
  ScanWizardResult,
  BluetoothControllerState,
} from "./enum";

const enumValues = {
  CreateConnectionChannelError,
  ConnectionStatus,
  DisconnectReason,
  RemovedReason,
  ClickType,
  BdAddrType,
  LatencyMode,
  ScanWizardResult,
  BluetoothControllerState,
};

/**
 * FlicRawClient
 *
 * This is a low level client that is used by the high level FlicClient below.
 *
 */
export class FlicRawClient {
  public onOpen = function (event: any) {};
  public onClose = function (hadError: boolean) {};
  public onEvent = function (opcode: FlicCommandOpcode, evt: FlicEvent) {};
  public onError = function (error: Error) {};

  private _socket: Socket;
  private _connecting: boolean = false;

  constructor(
    private _inetAddress: string = "localhost",
    private _port: number = 5551
  ) {
    let currentPacketData: Buffer | null = null;

    this._socket = new Socket();
    this._socket.on("close", (hadError: boolean) => {
      this._connecting = false;
      this.onClose(hadError);
    });
    this._socket.on("error", (error: Error) => {
      this._connecting = false;
      this.onError(error);
    });
    this._socket.on("data", (data: Buffer) => {
      currentPacketData =
        currentPacketData == null
          ? data
          : Buffer.concat(
              [currentPacketData, data],
              currentPacketData.length + data.length
            );
      while (currentPacketData.length >= 2) {
        const len = currentPacketData[0] | (currentPacketData[1] << 8);
        if (currentPacketData.length >= 2 + len) {
          const packet: Buffer = currentPacketData.slice(2, 2 + len);
          currentPacketData = currentPacketData.slice(2 + len);
          if (packet.length > 0) {
            this._onMessage(packet);
          }
        } else {
          break;
        }
      }
    });
    this._socket.on("connect", (event: any) => {
      this._connecting = false;
      this.onOpen(event);
    });

    this.reconnect();
  }

  reconnect() {
    if (this._connecting) return;

    this._connecting = true;
    this._socket = this._socket.connect({
      host: this._inetAddress,
      port: this._port,
    });
  }

  sendCommand(opcode: number, obj: any) {
    const arrayBuffer = new ArrayBuffer(100);
    const arr = new Uint8Array(arrayBuffer);
    let pos = 2;
    function writeUInt8(v: number) {
      arr[pos++] = v;
    }
    function writeInt16(v: number) {
      arr[pos++] = v;
      arr[pos++] = v >> 8;
    }
    function writeInt32(v: number) {
      writeInt16(v);
      writeInt16(v >> 16);
    }
    function writeBdAddr(v: BDAddress) {
      for (let i = 15; i >= 0; i -= 3) {
        writeUInt8(parseInt(v.substr(i, 2), 16));
      }
    }
    function writeEnum(type: keyof typeof enumValues, v: string) {
      const value: number = (enumValues[type] as any)[v] as number;
      writeUInt8(value);
    }

    writeUInt8(opcode);
    switch (opcode) {
      case FlicCommandOpcodes.GetInfo: {
        break;
      }
      case FlicCommandOpcodes.CreateScanner:
      case FlicCommandOpcodes.RemoveScanner: {
        writeInt32(obj.scanId);
        break;
      }
      case FlicCommandOpcodes.CreateConnectionChannel: {
        writeInt32(obj.connId);
        writeBdAddr(obj.bdAddr);
        writeEnum("LatencyMode", obj.latencyMode);
        writeInt16(obj.autoDisconnectTime);
        break;
      }
      case FlicCommandOpcodes.RemoveConnectionChannel: {
        writeInt32(obj.connId);
        break;
      }
      case FlicCommandOpcodes.ForceDisconnect:
      case FlicCommandOpcodes.GetButtonInfo:
      case FlicCommandOpcodes.DeleteButton: {
        writeBdAddr(obj.bdAddr);
        break;
      }
      case FlicCommandOpcodes.ChangeModeParameters: {
        writeInt32(obj.connId);
        writeEnum("LatencyMode", obj.latencyMode);
        writeInt16(obj.autoDisconnectTime);
        break;
      }
      case FlicCommandOpcodes.Ping: {
        writeInt32(obj.pingId);
        break;
      }
      case FlicCommandOpcodes.CreateScanWizard:
      case FlicCommandOpcodes.CancelScanWizard: {
        writeInt32(obj.scanWizardId);
        break;
      }
      case FlicCommandOpcodes.CreateBatteryStatusListener: {
        writeInt32(obj.listenerId);
        writeBdAddr(obj.bdAddr);
        break;
      }
      case FlicCommandOpcodes.RemoveBatteryStatusListener: {
        writeInt32(obj.listenerId);
        break;
      }
      default:
        return;
    }
    arr[0] = (pos - 2) & 0xff;
    arr[1] = (pos - 2) >> 8;
    var buffer = createBuffer(arrayBuffer, 0, pos);
    this._socket.write(buffer);
  }

  close() {
    this._socket.destroy();
  }

  private _onMessage(pkt: Buffer) {
    var pos = 0;
    function readUInt8() {
      return pkt[pos++];
    }
    function readInt8() {
      return (readUInt8() << 24) >> 24;
    }
    function readUInt16() {
      return pkt[pos++] | (pkt[pos++] << 8);
    }
    function readInt16() {
      return (readUInt16() << 16) >> 16;
    }
    function readInt32() {
      return readUInt16() | (readUInt16() << 16);
    }
    function readUInt32() {
      return readInt32() >>> 0;
    }
    function readUInt64() {
      // Can not really handle 64 bits since Javascript only supports 64-bit floating point values
      return readUInt32() + readUInt32() * 0x100000000;
    }
    function readBdAddr() {
      var str = "";
      for (var i = 5; i >= 0; i--) {
        str += (0x100 + pkt[pos + i]).toString(16).substr(-2);
        if (i != 0) {
          str += ":";
        }
      }
      pos += 6;
      return str;
    }
    function readString() {
      var len = readUInt8();
      var s = pkt.slice(pos, pos + len).toString();
      pos += 16;
      return s;
    }
    function readBoolean() {
      return readUInt8() != 0;
    }
    function readEnum<T extends string>(
      type: keyof typeof enumValues
    ): T | undefined {
      var value = readUInt8();
      var values = enumValues[type];
      for (var key in values) {
        if (values.hasOwnProperty(key)) {
          const enumValue: number = values[key] as any;
          if (enumValue == value) {
            return key as T;
          }
        }
      }
    }
    function readUuid() {
      let str: string | null = "";
      for (var i = 0; i < 16; i++) {
        str += (0x100 + pkt[pos + i]).toString(16).substr(-2);
      }
      pos += 16;
      if (str == "00000000000000000000000000000000") {
        str = null;
      }
      return str;
    }

    var opcode = readUInt8();
    let evt: FlicEvent;
    switch (opcode) {
      case FlicEventOpcodes.AdvertisementPacket: {
        evt = {
          scanId: readInt32(),
          bdAddr: readBdAddr(),
          name: readString(),
          rssi: readInt8(),
          isPrivate: readBoolean(),
          alreadyVerified: readBoolean(),
          alreadyConnectedToThisDevice: readBoolean(),
          alreadyConnectedToOtherDevice: readBoolean(),
        };
        this.onEvent(opcode, evt);
        break;
      }
      case FlicEventOpcodes.CreateConnectionChannelResponse: {
        evt = {
          connId: readInt32(),
          error: readEnum("CreateConnectionChannelError"),
          connectionStatus: readEnum("ConnectionStatus"),
        };
        this.onEvent(opcode, evt);
        break;
      }
      case FlicEventOpcodes.ConnectionStatusChanged: {
        evt = {
          connId: readInt32(),
          connectionStatus: readEnum("ConnectionStatus"),
          disconnectReason: readEnum("DisconnectReason"),
        };
        this.onEvent(opcode, evt);
        break;
      }
      case FlicEventOpcodes.ConnectionChannelRemoved: {
        evt = {
          connId: readInt32(),
          removedReason: readEnum("RemovedReason"),
        };
        this.onEvent(opcode, evt);
        break;
      }
      case FlicEventOpcodes.ButtonUpOrDown:
      case FlicEventOpcodes.ButtonClickOrHold:
      case FlicEventOpcodes.ButtonSingleOrDoubleClick:
      case FlicEventOpcodes.ButtonSingleOrDoubleClickOrHold: {
        evt = {
          connId: readInt32(),
          clickType: readEnum("ClickType"),
          wasQueued: readBoolean(),
          timeDiff: readInt32(),
        };
        this.onEvent(opcode, evt);
        break;
      }
      case FlicEventOpcodes.NewVerifiedButton: {
        evt = {
          bdAddr: readBdAddr(),
        };
        this.onEvent(opcode, evt);
        break;
      }
      case FlicEventOpcodes.GetInfoResponse: {
        const giEvent = {
          bluetoothControllerState: readEnum<BluetoothControllerStateValues>(
            "BluetoothControllerState"
          ),
          myBdAddr: readBdAddr(),
          myBdAddrType: readEnum("BdAddrType"),
          maxPendingConnections: readUInt8(),
          maxConcurrentlyConnectedButtons: readInt16(),
          currentPendingConnections: readUInt8(),
          currentlyNoSpaceForNewConnection: readBoolean(),
          bdAddrOfVerifiedButtons: new Array(readUInt16()),
        };
        for (var i = 0; i < giEvent.bdAddrOfVerifiedButtons.length; i++) {
          giEvent.bdAddrOfVerifiedButtons[i] = readBdAddr();
        }
        evt = giEvent;
        this.onEvent(opcode, evt);
        break;
      }
      case FlicEventOpcodes.NoSpaceForNewConnection:
      case FlicEventOpcodes.GotSpaceForNewConnection: {
        evt = {
          maxConcurrentlyConnectedButtons: readUInt8(),
        };
        this.onEvent(opcode, evt);
        break;
      }
      case FlicEventOpcodes.BluetoothControllerStateChange: {
        evt = {
          state: readEnum<BluetoothControllerStateValues>(
            "BluetoothControllerState"
          ),
        };
        this.onEvent(opcode, evt);
        break;
      }
      case FlicEventOpcodes.PingResponse: {
        evt = {
          pingId: readInt32(),
        };
        this.onEvent(opcode, evt);
        break;
      }
      case FlicEventOpcodes.GetButtonInfoResponse: {
        evt = {
          bdAddr: readBdAddr(),
          uuid: readUuid(),
          color: readString() || null,
          serialNumber: readString() || null,
        };
        this.onEvent(opcode, evt);
        break;
      }
      case FlicEventOpcodes.ScanWizardFoundPrivateButton:
      case FlicEventOpcodes.ScanWizardButtonConnected: {
        evt = {
          scanWizardId: readInt32(),
        };
        this.onEvent(opcode, evt);
        break;
      }
      case FlicEventOpcodes.ScanWizardFoundPublicButton: {
        evt = {
          scanWizardId: readInt32(),
          bdAddr: readBdAddr(),
          name: readString(),
        };
        this.onEvent(opcode, evt);
        break;
      }
      case FlicEventOpcodes.ScanWizardCompleted: {
        evt = {
          scanWizardId: readInt32(),
          result: readEnum<ScanWizardResultValues>("ScanWizardResult"),
        };
        this.onEvent(opcode, evt);
        break;
      }
      case FlicEventOpcodes.ButtonDeleted: {
        evt = {
          bdAddr: readBdAddr(),
          deletedByThisClient: readBoolean(),
        };
        this.onEvent(opcode, evt);
        break;
      }
      case FlicEventOpcodes.BatteryStatus: {
        evt = {
          listenerId: readInt32(),
          batteryPercentage: readInt8(),
          timestamp: new Date(readUInt64() * 1000),
        };
        this.onEvent(opcode, evt);
        break;
      }
    }
  }
}

function createBuffer(arr: ArrayBuffer, offset?: number, len?: number) {
  arr = new Uint8Array(arr, offset, len);
  // return Buffer.allocUnsafe ? Buffer.from(arr) : new Buffer(arr);
  return Buffer.from(arr);
}
