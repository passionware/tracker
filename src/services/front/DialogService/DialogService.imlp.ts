import { Messaging } from "@passionware/platform-js";
import { DialogService, MountElementHandler } from "./DialogService";
import { MountElementMessage } from "./DialogService.impl.connected";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createDialogService(event: Messaging<MountElementMessage<any>>): DialogService
 {
    return {
        show:<T = object>(handler: MountElementHandler<T>) => {
            event.sendRequest({
                    handler
            })
        }
    }
 }
