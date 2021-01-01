import { Collection, FilterQuery, ObjectID, ObjectId } from "mongodb";
import { GenericMongoDatabase } from "@uems/micro-builder";
import { StateMessage } from "@uems/uemscommlib";
import ReadStateMessage = StateMessage.ReadStateMessage;
import CreateStateMessage = StateMessage.CreateStateMessage;
import DeleteStateMessage = StateMessage.DeleteStateMessage;
import UpdateStateMessage = StateMessage.UpdateStateMessage;
import { StateValidators } from "@uems/uemscommlib/build/state/StateValidators";
import StateRepresentation = StateValidators.StateRepresentation;

export class StateDatabase extends GenericMongoDatabase<ReadStateMessage, CreateStateMessage, DeleteStateMessage, UpdateStateMessage, StateRepresentation> {

    private static convertReadRequestToDatabaseQuery(request: ReadStateMessage): FilterQuery<StateRepresentation> {
        const obj: any = {
            color: request.color,
            icon: request.icon,
            name: request.name,
            type: 'state',
        };

        if (request.id) {
            obj._id = new ObjectID(request.id);
        }

        return Object.fromEntries(Object.entries(obj)
            .filter(([, value]) => value !== undefined));
    }

    protected async createImpl(create: StateMessage.CreateStateMessage, details: Collection): Promise<string[]> {
        const { msg_id, msg_intention, status, ...document } = create;

        const result = await details.insertOne({
            color: document.color,
            icon: document.icon,
            name: document.name,
            type: 'state',
        });

        if (result.insertedCount !== 1 || result.insertedId === undefined) {
            throw new Error('failed to insert')
        }

        const id = (result.insertedId as ObjectId).toHexString();
        await super.log(id, 'inserted');

        return [id];
    }

    protected deleteImpl(remove: StateMessage.DeleteStateMessage): Promise<string[]> {
        return super.defaultDelete(remove);
    }

    protected async queryImpl(query: StateMessage.ReadStateMessage, details: Collection): Promise<StateValidators.StateRepresentation[]> {
        const result: StateRepresentation[] = await details.find(StateDatabase.convertReadRequestToDatabaseQuery(query)).toArray();

        // Copy _id to id to fit the responsr type.
        for (const r of result) {
            // @ts-ignore
            r.id = r._id.toString();

            // @ts-ignore
            delete r._id;
            // This is how we differentiate the types
            // @ts-ignore
            delete r.type;
        }

        return result;
    }

    protected updateImpl(update: StateMessage.UpdateStateMessage): Promise<string[]> {
        return super.defaultUpdate(update)
    }

}
