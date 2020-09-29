import { TypedEmitter } from "tiny-typed-emitter";
import { Button, ButtonEventNames, ButtonEventParams } from "./button";
import { FlicClient as FlicLibClient } from "./fliclib";
import { ConnectionStatusValues } from "./fliclib/enum";
import { GetButtonInfoResponseEvent } from "./fliclib/events";
import { FlicScanWizard } from "./fliclib/scan-wizard";
import { FlicScanner } from "./fliclib/scanner";
import { BDAddress } from "./fliclib/types";

interface ClientButtonEventParams extends ButtonEventParams {
  bdAddr: BDAddress;
}

type ClientButtonEvents = Record<
  ButtonEventNames,
  (params: ClientButtonEventParams) => void
> & {
  ButtonStatusChanged: (params: {
    bdAddr: BDAddress;
    connectionStatus: ConnectionStatusValues;
  }) => void;
  ButtonBatteryPercentage: (params: {
    bdAddr: BDAddress;
    percentage: number;
  }) => void;
};

interface ClientEvents extends ClientButtonEvents {}

export class FlicClient extends TypedEmitter<ClientEvents> {
  private flicLibClient: FlicLibClient;
  private buttonInfo?: GetButtonInfoResponseEvent[];
  private buttons: Button[] = [];
  private whenReady: Promise<void>;

  constructor(host: string, port?: number) {
    super();
    this.flicLibClient = new FlicLibClient(host, port);
    this.whenReady = new Promise((resolve) => {
      this.flicLibClient.once("ready", () => resolve());
    });

    // TODO:
    // this.flicLibClient.on("newVerifiedButton", (bdAddr) => {});
    // this.flicLibClient.on("buttonDeleted", (bdAddr, deletedByThisClient) => {});

    // this.flicLibClient.on("error");
    // this.flicLibClient.on("close");

    // this.flicLibClient.on("noSpaceForNewConnection");
    // this.flicLibClient.on("gotSpaceForNewConnection");

    // this.flicLibClient.on("bluetoothControllerStateChange");
  }

  async start() {
    await this.whenReady;
    const info = await this.flicLibClient.getInfo();
    await Promise.all(
      info.bdAddrOfVerifiedButtons.map((bdAddr) => this.loadButton(bdAddr))
    );
  }

  scanWizard(): Pick<FlicScanWizard, "on"> & { cancel: () => void } {
    const scanWizard = new FlicScanWizard();
    this.flicLibClient.addScanWizard(scanWizard);

    return {
      on: scanWizard.on.bind(scanWizard),
      cancel: () => {
        this.flicLibClient.cancelScanWizard(scanWizard);
      },
    };
  }

  scan(): Pick<FlicScanner, "on"> & { cancel: () => void } {
    const scanner = new FlicScanner();
    this.flicLibClient.addScanner(scanner);

    return {
      on: scanner.on.bind(scanner),
      cancel: () => {
        this.flicLibClient.removeScanner(scanner);
      },
    };
  }

  stop() {
    for (let button of this.buttons) {
      button.stop(this.flicLibClient);
    }
  }

  private async loadButton(bdAddr: BDAddress) {
    const info = await this.flicLibClient.getButtonInfo(bdAddr);
    if (!info) return;

    const button = new Button(info);

    const eventNames = [
      "ButtonClick",
      "ButtonSingleClick",
      "ButtonDoubleClick",
      "ButtonHold",
      "ButtonUp",
      "ButtonDown",
    ] as ButtonEventNames[];

    for (let eventName of eventNames) {
      button.on(eventName, (params) => {
        this.emit(eventName, { ...params, bdAddr: info.bdAddr });
      });
    }

    button.on("ButtonStatusChanged", (params) => {
      this.emit("ButtonStatusChanged", { ...params, bdAddr: info.bdAddr });
    });
    button.on("ButtonBatteryPercentage", (params) => {
      this.emit("ButtonBatteryPercentage", { ...params, bdAddr: info.bdAddr });
    });

    await button.start(this.flicLibClient);
    this.buttons.push(button);
  }
}
