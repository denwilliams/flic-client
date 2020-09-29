export enum CreateConnectionChannelError {
  NoError = 0,
  MaxPendingConnectionsReached = 1,
}

export enum ConnectionStatus {
  Disconnected = 0,
  Connected = 1,
  Ready = 2,
}

export enum DisconnectReason {
  Unspecified = 0,
  ConnectionEstablishmentFailed = 1,
  TimedOut = 2,
  BondingKeysMismatch = 3,
}

export enum RemovedReason {
  RemovedByThisClient = 0,
  ForceDisconnectedByThisClient = 1,
  ForceDisconnectedByOtherClient = 2,

  ButtonIsPrivate = 3,
  VerifyTimeout = 4,
  InternetBackendError = 5,
  InvalidData = 6,

  CouldntLoadDevice = 7,

  DeletedByThisClient = 8,
  DeletedByOtherClient = 9,
  ButtonBelongsToOtherPartner = 10,
  DeletedFromButton = 11,
}

export enum ClickType {
  ButtonDown = 0,
  ButtonUp = 1,
  ButtonClick = 2,
  ButtonSingleClick = 3,
  ButtonDoubleClick = 4,
  ButtonHold = 5,
}

export enum BdAddrType {
  PublicBdAddrType = 0,
  RandomBdAddrType = 1,
}

export enum LatencyMode {
  NormalLatency = 0,
  LowLatency = 1,
  HighLatency = 2,
}

export type LatencyModeValues = keyof typeof LatencyMode;

export enum ScanWizardResult {
  WizardSuccess = 0,
  WizardCancelledByUser = 1,
  WizardFailedTimeout = 2,
  WizardButtonIsPrivate = 3,
  WizardBluetoothUnavailable = 4,
  WizardInternetBackendError = 5,
  WizardInvalidData = 6,
  WizardButtonBelongsToOtherPartner = 7,
  WizardButtonAlreadyConnectedToOtherDevice = 8,
}

export enum BluetoothControllerState {
  Detached = 0,
  Resetting = 1,
  Attached = 2,
}

export enum FlicCommandOpcodes {
  GetInfo = 0,
  CreateScanner = 1,
  RemoveScanner = 2,
  CreateConnectionChannel = 3,
  RemoveConnectionChannel = 4,
  ForceDisconnect = 5,
  ChangeModeParameters = 6,
  Ping = 7,
  GetButtonInfo = 8,
  CreateScanWizard = 9,
  CancelScanWizard = 10,
  DeleteButton = 11,
  CreateBatteryStatusListener = 12,
  RemoveBatteryStatusListener = 13,
}

export enum FlicEventOpcodes {
  AdvertisementPacket = 0,
  CreateConnectionChannel = 1,
  CreateConnectionChannelResponse = 1,
  ConnectionStatusChanged = 2,
  ConnectionChannelRemoved = 3,
  ButtonUpOrDown = 4,
  ButtonClickOrHold = 5,
  ButtonSingleOrDoubleClick = 6,
  ButtonSingleOrDoubleClickOrHold = 7,
  NewVerifiedButton = 8,
  GetInfoResponse = 9,
  NoSpaceForNewConnection = 10,
  GotSpaceForNewConnection = 11,
  BluetoothControllerStateChange = 12,
  PingResponse = 13,
  GetButtonInfoResponse = 14,
  ScanWizardFoundPrivateButton = 15,
  ScanWizardFoundPublicButton = 16,
  ScanWizardButtonConnected = 17,
  ScanWizardCompleted = 18,
  ButtonDeleted = 19,
  BatteryStatus = 20,
}

export type ClickTypeValues = keyof typeof ClickType;
export type CreateConnectionChannelErrorValues = keyof typeof CreateConnectionChannelError;
export type ConnectionStatusValues = keyof typeof ConnectionStatus;
export type DisconnectReasonValues = keyof typeof DisconnectReason;
export type BluetoothControllerStateValues = keyof typeof BluetoothControllerState;
export type BdAddrTypeValues = keyof typeof BdAddrType;
export type ScanWizardResultValues = keyof typeof ScanWizardResult;
export type RemovedReasonValues = keyof typeof RemovedReason;
