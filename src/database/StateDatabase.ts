import { Collection, Db, FilterQuery, ObjectID, ObjectId } from "mongodb";
import { GenericMongoDatabase, MongoDBConfiguration } from "@uems/micro-builder";
import { StateMessage, StateResponse } from "@uems/uemscommlib";
import ReadStateMessage = StateMessage.ReadStateMessage;
import CreateStateMessage = StateMessage.CreateStateMessage;
import DeleteStateMessage = StateMessage.DeleteStateMessage;
import UpdateStateMessage = StateMessage.UpdateStateMessage;
import InternalState = StateResponse.InternalState;
import { ClientFacingError } from "../error/ClientFacingError";
import { genericCreate, genericEntityConversion, genericUpdate } from "./GenericDatabaseFunctions";

type InDatabaseState = {
    _id: ObjectId,
    type: 'state',
    name: string,
    icon: string,
    color: string,
}

type CreateInDatabaseState = Omit<InDatabaseState, '_id'>;

const dbToInternal = (data: InDatabaseState): InternalState => genericEntityConversion(
    data,
    {
        color: 'color',
        icon: 'icon',
        name: 'name',
        _id: 'id',
    },
    '_id',
);

const createToDB = (data: CreateStateMessage): CreateInDatabaseState => ({
    ...genericEntityConversion(
        data,
        {
            name: 'name',
            icon: 'icon',
            color: 'color'
        }
    ),
    type: 'state',
});

export class StateDatabase extends GenericMongoDatabase<ReadStateMessage, CreateStateMessage, DeleteStateMessage, UpdateStateMessage, InternalState> {


    constructor(_configuration: MongoDBConfiguration);
    constructor(_configurationOrDB: MongoDBConfiguration | Db, collections?: MongoDBConfiguration["collections"]);
    constructor(database: Db, collections: MongoDBConfiguration["collections"]);
    constructor(_configuration: MongoDBConfiguration | Db, collections?: MongoDBConfiguration["collections"]) {
        // @ts-ignore
        super(_configuration, collections);

        if (!this._details) throw new Error('failed to initialise database');
        void this._details.createIndex({ name: 1, type: 1 }, { unique: true });
        void this._details.createIndex({ name: 'text', description: 'text' });
    }

    private static convertReadRequestToDatabaseQuery(request: ReadStateMessage): FilterQuery<InternalState> {
        const obj: any = {
            color: request.color,
            icon: request.icon,
            type: 'state',
        };

        if (request.id) {
            obj._id = new ObjectID(request.id);
        }

        if (request.name) obj.$text = { $search: request.name };

        return Object.fromEntries(Object.entries(obj)
            .filter(([, value]) => value !== undefined));
    }

    protected async createImpl(create: StateMessage.CreateStateMessage, details: Collection): Promise<string[]> {
        return genericCreate(create, createToDB, details, (e) => {
            throw new ClientFacingError('duplicate state')
        }, this.log.bind(this))
    }

    protected deleteImpl(remove: StateMessage.DeleteStateMessage): Promise<string[]> {
        return this.defaultDelete(remove);
    }

    protected async queryImpl(query: StateMessage.ReadStateMessage, details: Collection): Promise<InternalState[]> {
        return (await details.find(StateDatabase.convertReadRequestToDatabaseQuery(query)).toArray()).map(dbToInternal);
    }

    protected updateImpl(update: StateMessage.UpdateStateMessage, details: Collection): Promise<string[]> {
        return genericUpdate(update, ['name', 'icon', 'color'], details, { type: 'state' }, () => {
            throw new ClientFacingError('cannot update to existing name');
        });
    }

}
