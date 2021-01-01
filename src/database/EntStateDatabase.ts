import { Collection, FilterQuery, ObjectID, ObjectId } from "mongodb";
import { GenericMongoDatabase } from "@uems/micro-builder";
import { EntStateMessage, EntStateResponse } from "@uems/uemscommlib";
import ReadEntStateMessage = EntStateMessage.ReadEntStateMessage;
import CreateEntStateMessage = EntStateMessage.CreateEntStateMessage;
import DeleteEntStateMessage = EntStateMessage.DeleteEntStateMessage;
import UpdateEntStateMessage = EntStateMessage.UpdateEntStateMessage;
import InternalEntState = EntStateResponse.InternalEntState;

export class EntStateDatabase extends GenericMongoDatabase<ReadEntStateMessage, CreateEntStateMessage, DeleteEntStateMessage, UpdateEntStateMessage, InternalEntState> {

    private static convertReadRequestToDatabaseQuery(request: ReadEntStateMessage): FilterQuery<InternalEntState> {
        const obj: any = {
            color: request.color,
            icon: request.icon,
            name: request.name,
            type: 'ent',
        };

        if (request.id) {
            obj._id = new ObjectID(request.id);
        }

        return Object.fromEntries(Object.entries(obj)
            .filter(([, value]) => value !== undefined));
    }

    protected async createImpl(create: EntStateMessage.CreateEntStateMessage, details: Collection): Promise<string[]> {
        const { msg_id, msg_intention, status, ...document } = create;

        const result = await details.insertOne({
            color: document.color,
            icon: document.icon,
            name: document.name,
            type: 'ent',
        });

        if (result.insertedCount !== 1 || result.insertedId === undefined) {
            throw new Error('failed to insert')
        }

        const id = (result.insertedId as ObjectId).toHexString();
        await super.log(id, 'inserted');

        return [id];
    }

    protected deleteImpl(remove: EntStateMessage.DeleteEntStateMessage): Promise<string[]> {
        return super.defaultDelete(remove);
    }

    protected async queryImpl(query: EntStateMessage.ReadEntStateMessage, details: Collection): Promise<InternalEntState[]> {
        const result: InternalEntState[] = await details.find(EntStateDatabase.convertReadRequestToDatabaseQuery(query)).toArray();

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

    protected updateImpl(update: EntStateMessage.UpdateEntStateMessage): Promise<string[]> {
        return super.defaultUpdate(update)
    }

}
