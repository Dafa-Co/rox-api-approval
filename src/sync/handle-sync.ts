import { DriversFactory } from "src/Classes/DriversFactory";
import { IApiApprovalSyncInterface } from "src/Interfaces/api-approval-sync.interface";



export function handleSync(payload: IApiApprovalSyncInterface, driversFactory : DriversFactory) {
    const { keysIds, publicKey, syncId } = payload;

}


