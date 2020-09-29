import { BDAddress, UUID } from "./types";
import {
  ClickTypeValues,
  CreateConnectionChannelErrorValues,
  ConnectionStatusValues,
  BluetoothControllerStateValues,
  BdAddrTypeValues,
  ScanWizardResultValues,
  DisconnectReasonValues,
  RemovedReasonValues,
} from "./enum";

export interface BatteryStatusEvent {
  listenerId: number;
  batteryPercentage: number;
  timestamp: Date;
}

export interface ScanWizardFoundPublicButtonEvent {
  bdAddr: BDAddress;
  name: string;
}

export interface ScanWizardCompletedEvent {
  scanWizardId: number;
  result?: ScanWizardResultValues;
}

export interface AdvertisementPacketEvent {
  bdAddr: BDAddress;
  name: string;
  rssi: number;
  isPrivate: boolean;
  alreadyVerified: boolean;
  alreadyConnectedToThisDevice: boolean;
  alreadyConnectedToOtherDevice: boolean;
}

export interface ButtonEvent {
  connId: number;
  clickType: ClickTypeValues;
  wasQueued: boolean;
  timeDiff: number;
}

export interface ButtonDeletedEvent {
  bdAddr: BDAddress;
  deletedByThisClient: boolean;
}

export interface NewVerifiedButtonEvent {
  bdAddr: BDAddress;
}

export interface ScanWizardButtonConnectedEvent {
  scanWizardId: number;
}

export interface ScanWizardFoundPrivateButton {
  scanWizardId: number;
}

export interface PingResponseEvent {
  pingId: number;
}

export interface AdvertisementPacketEvent {
  scanId: number;
  bdAddr: BDAddress;
  name: string;
  rssi: number;
  isPrivate: boolean;
  alreadyVerified: boolean;
  alreadyConnectedToThisDevice: boolean;
  alreadyConnectedToOtherDevice: boolean;
}

export interface CreateConnectionChannelResponseEvent {
  connId: number;
  error: CreateConnectionChannelErrorValues;
  connectionStatus: ConnectionStatusValues;
}

export interface BluetoothControllerStateChangeEvent {
  state?: BluetoothControllerStateValues;
}

export interface GetInfoResponseEvent {
  bluetoothControllerState?: BluetoothControllerStateValues;
  myBdAddr: BDAddress;
  myBdAddrType: BdAddrTypeValues;
  maxPendingConnections: number;
  maxConcurrentlyConnectedButtons: number;
  currentPendingConnections: number;
  currentlyNoSpaceForNewConnection: boolean;
  bdAddrOfVerifiedButtons: BDAddress[];
}

export interface GetButtonInfoResponseEvent {
  bdAddr: BDAddress;
  uuid: UUID | null;
  color: string | null;
  serialNumber: string | null;
}

export interface ConnectionChannelRemovedEvent {
  connId: number;
  removedReason?: RemovedReasonValues;
}

export interface SpaceForNewConnectionEvent {
  maxConcurrentlyConnectedButtons: number;
}

export interface ConnectionStatusChangedEvent {
  connId: number;
  connectionStatus: ConnectionStatusValues;
  disconnectReason: DisconnectReasonValues;
}

export type FlicEvent =
  | AdvertisementPacketEvent
  | BluetoothControllerStateChangeEvent
  | ConnectionStatusChangedEvent
  | CreateConnectionChannelResponseEvent
  | ButtonEvent
  | ButtonDeletedEvent
  | NewVerifiedButtonEvent
  | BatteryStatusEvent
  | GetInfoResponseEvent
  | GetButtonInfoResponseEvent
  | ScanWizardFoundPublicButtonEvent
  | ScanWizardButtonConnectedEvent
  | ScanWizardFoundPrivateButton
  | ScanWizardCompletedEvent
  | ConnectionChannelRemovedEvent
  | PingResponseEvent
  | SpaceForNewConnectionEvent;
