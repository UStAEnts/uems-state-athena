import { Collection, Db, FilterQuery, ObjectID, ObjectId } from "mongodb";
import { GenericMongoDatabase, MongoDBConfiguration } from "@uems/micro-builder";
import { StateMessage, StateResponse } from "@uems/uemscommlib";
import ReadStateMessage = StateMessage.ReadStateMessage;
import CreateStateMessage = StateMessage.CreateStateMessage;
import DeleteStateMessage = StateMessage.DeleteStateMessage;
import UpdateStateMessage = StateMessage.UpdateStateMessage;
import InternalState = StateResponse.InternalState;
import { ClientFacingError } from "../error/ClientFacingError";

export class StateDatabase extends GenericMongoDatabase<ReadStateMessage, CreateStateMessage, DeleteStateMessage, UpdateStateMessage, InternalState> {


    constructor(_configuration: MongoDBConfiguration);
    constructor(_configurationOrDB: MongoDBConfiguration | Db, collections?: MongoDBConfiguration["collections"]);
    constructor(database: Db, collections: MongoDBConfiguration["collections"]);
    constructor(_configuration: MongoDBConfiguration | Db, collections?: MongoDBConfiguration["collections"]) {
        // @ts-ignore
        super(_configuration, collections);

        if (!this._details) throw new Error('failed to initialise database');
        void this._details.createIndex({ name: 1, type: 1 }, { unique: true });
    }

    private static convertReadRequestToDatabaseQuery(request: ReadStateMessage): FilterQuery<InternalState> {
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

        let result;

        try {
            result = await details.insertOne({
                color: document.color,
                icon: document.icon,
                name: document.name,
                type: 'state',
            });
        } catch (e) {
            if (e.code === 11000) {
                throw new ClientFacingError('duplicate state');
            }

            throw e;
        }

        if (result.insertedCount !== 1 || result.insertedId === undefined) {
            throw new Error('failed to insert')
        }

        const id = (result.insertedId as ObjectId).toHexString();
        await this.log(id, 'inserted');

        return [id];
    }

    protected deleteImpl(remove: StateMessage.DeleteStateMessage): Promise<string[]> {
        return this.defaultDelete(remove);
    }

    protected async queryImpl(query: StateMessage.ReadStateMessage, details: Collection): Promise<InternalState[]> {
        const result: InternalState[] = await details.find(StateDatabase.convertReadRequestToDatabaseQuery(query)).toArray();

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
        return this.defaultUpdate(update)
    }

}
