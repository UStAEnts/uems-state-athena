import { Collection, Db, FilterQuery, ObjectID, ObjectId, UpdateQuery } from "mongodb";
import { GenericMongoDatabase, MongoDBConfiguration } from "@uems/micro-builder/build/src";
import { EntStateMessage, EntStateResponse } from "@uems/uemscommlib";
import { ClientFacingError } from "../error/ClientFacingError";
import ReadEntStateMessage = EntStateMessage.ReadEntStateMessage;
import CreateEntStateMessage = EntStateMessage.CreateEntStateMessage;
import DeleteEntStateMessage = EntStateMessage.DeleteEntStateMessage;
import UpdateEntStateMessage = EntStateMessage.UpdateEntStateMessage;
import InternalEntState = EntStateResponse.InternalEntState;
import { genericCreate, genericDelete, genericEntityConversion, genericUpdate, stripUndefined } from "./GenericDatabaseFunctions";

type InDatabaseEntState = {
    _id: ObjectId,
    type: 'ent',
    name: string,
    icon: string,
    color: string,
}

type CreateInDatabaseEntState = Omit<InDatabaseEntState, '_id'>;

const dbToInternal2 = (data: InDatabaseEntState): InternalEntState => genericEntityConversion(
    data,
    {
        color: 'color',
        icon: 'icon',
        name: 'name',
        _id: 'id',
    },
    '_id',
);

const createToDB = (data: CreateEntStateMessage): CreateInDatabaseEntState => ({
    ...genericEntityConversion(
        data,
        {
            name: 'name',
            icon: 'icon',
            color: 'color'
        }
    ),
    type: 'ent',
});


export class EntStateDatabase extends GenericMongoDatabase<ReadEntStateMessage, CreateEntStateMessage, DeleteEntStateMessage, UpdateEntStateMessage, InternalEntState> {

    constructor(_configuration: MongoDBConfiguration);
    constructor(_configurationOrDB: MongoDBConfiguration | Db, collections?: MongoDBConfiguration["collections"]);
    constructor(database: Db, collections: MongoDBConfiguration["collections"]);
    constructor(_configuration: MongoDBConfiguration | Db, collections?: MongoDBConfiguration["collections"]) {
        // @ts-ignore
        super(_configuration, collections);

        const register = (details: Collection) => {
            void details.createIndex({ name: 1, type: 1 }, { unique: true });
            void details.createIndex({ name: 'text', description: 'text' });
        };

        if (this._details) {
            register(this._details);
        } else {
            this.once('ready', () => {
                if (!this._details) throw new Error('Details db was not initialised on ready');
                register(this._details);
            });
        }

    }

    private static convertReadRequestToDatabaseQuery(request: ReadEntStateMessage): FilterQuery<InternalEntState> {
        const obj: any = stripUndefined({
            color: request.color,
            icon: request.icon,
            type: 'ent',
        });

        if (request.id) {
            if (typeof (request.id) === 'string') {
                obj._id = new ObjectID(request.id);
            } else {
                obj._id = {
                    $in: request.id.map((e) => new ObjectID(e)),
                };
            }
        }

        if (request.name) obj.$text = { $search: request.name };

        return Object.fromEntries(Object.entries(obj)
            .filter(([, value]) => value !== undefined));
    }

    protected async createImpl(create: EntStateMessage.CreateEntStateMessage, details: Collection): Promise<string[]> {
        return genericCreate(create, createToDB, details, (e) => {
            throw new ClientFacingError('duplicate ent state')
        }, this.log.bind(this))
    }

    protected deleteImpl(remove: EntStateMessage.DeleteEntStateMessage, details: Collection): Promise<string[]> {
        return genericDelete<InDatabaseEntState>({
            _id: new ObjectId(remove.id),
            type: 'ent',
        }, remove.id, details, this.log.bind(this));
    }

    protected async queryImpl(query: EntStateMessage.ReadEntStateMessage, details: Collection): Promise<InternalEntState[]> {
        return (await details.find(EntStateDatabase.convertReadRequestToDatabaseQuery(query)).toArray()).map(dbToInternal2);
    }

    protected async updateImpl(update: EntStateMessage.UpdateEntStateMessage, details: Collection): Promise<string[]> {
        return genericUpdate(update, ['name', 'icon', 'color'], details, { type: 'ent' }, () => {
            throw new ClientFacingError('cannot update to existing name');
        });
    }

}
