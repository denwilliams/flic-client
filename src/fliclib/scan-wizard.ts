import { FlicRawClient } from "./raw-client";
import { TypedEmitter } from "tiny-typed-emitter";
import {
  FlicCommandOpcodes,
  FlicEventOpcodes,
  ScanWizardResult,
  ScanWizardResultValues,
} from "./enum";
import { BDAddress } from "./types";
import {
  ScanWizardCompletedEvent,
  ScanWizardFoundPublicButtonEvent,
} from "./events";

let counter = 0;

interface FlicScanWizardEvents {
  foundPrivateButton: () => void;
  foundPublicButton: (bdAddr: BDAddress, name: string) => void;
  buttonConnected: (bdAddr: BDAddress, name: string) => void;
  completed: (
    result: ScanWizardResultValues,
    bdAddr: BDAddress,
    name: string
  ) => void;
}

/*
 * FlicScanWizard
 *
 * First create a FlicScanWizard, then add it to the FlicClient.
 *
 * Events:
 * foundPrivateButton: (no parameters)
 * foundPublicButton: bdAddr, name
 * buttonConnected: bdAddr, name
 * completed: result, bdAddr, name
 */
export class FlicScanWizard extends TypedEmitter<FlicScanWizardEvents> {
  private _id: number = counter++;
  private _bdaddr: BDAddress | null = null;
  private _name: string | null = null;

  constructor() {
    super();
  }

  public getId(): number {
    return this._id;
  }

  public attach(rawClient: FlicRawClient): void {
    rawClient.sendCommand(FlicCommandOpcodes.CreateScanWizard, {
      scanWizardId: this._id,
    });
  }

  public detach(rawClient: FlicRawClient): void {
    rawClient.sendCommand(FlicCommandOpcodes.CancelScanWizard, {
      scanWizardId: this._id,
    });
  }

  public onEvent(
    opcode: number,
    event: ScanWizardCompletedEvent | ScanWizardFoundPublicButtonEvent
  ): void {
    switch (opcode) {
      case FlicEventOpcodes.ScanWizardFoundPrivateButton:
        this.emit("foundPrivateButton");
        break;
      case FlicEventOpcodes.ScanWizardFoundPublicButton:
        const scanWizardFoundPublicButton = event as ScanWizardFoundPublicButtonEvent;
        this._bdaddr = scanWizardFoundPublicButton.bdAddr;
        this._name = scanWizardFoundPublicButton.name;
        if (this._bdaddr && this._name) {
          this.emit("foundPublicButton", this._bdaddr, this._name);
        }
        break;
      case FlicEventOpcodes.ScanWizardButtonConnected:
        if (this._bdaddr && this._name) {
          this.emit("buttonConnected", this!._bdaddr, this._name);
        }
        break;
      case FlicEventOpcodes.ScanWizardCompleted:
        const scanWizardCompletedEvent = event as ScanWizardCompletedEvent;
        const bdaddr = this._bdaddr;
        const name = this._name;
        this._bdaddr = null;
        this._name = null;
        if (scanWizardCompletedEvent.result && bdaddr && name) {
          this.emit("completed", scanWizardCompletedEvent.result, bdaddr, name);
        }
        break;
    }
  }
}
