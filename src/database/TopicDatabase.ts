import { Collection, Db, FilterQuery, ObjectID, ObjectId } from "mongodb";
import { GenericMongoDatabase, MongoDBConfiguration } from "@uems/micro-builder/build/src";
import { TopicMessage, TopicResponse } from "@uems/uemscommlib";
import { ClientFacingError } from "../error/ClientFacingError";
import { genericCreate, genericDelete, genericEntityConversion, genericUpdate } from "./GenericDatabaseFunctions";
import ReadTopicMessage = TopicMessage.ReadTopicMessage;
import CreateTopicMessage = TopicMessage.CreateTopicMessage;
import DeleteTopicMessage = TopicMessage.DeleteTopicMessage;
import UpdateTopicMessage = TopicMessage.UpdateTopicMessage;
import InternalTopic = TopicResponse.InternalTopic;

type InDatabaseTopic = {
    _id: ObjectId,
    type: 'topic',
    name: string,
    icon: string,
    color: string,
    description: string,
}

type CreateInDatabaseEntState = Omit<InDatabaseTopic, '_id'>;

const dbToInternal = (data: InDatabaseTopic): InternalTopic => genericEntityConversion(
    data,
    {
        color: 'color',
        icon: 'icon',
        name: 'name',
        _id: 'id',
        description: 'description',
    },
    '_id',
);

const createToDB = (data: CreateTopicMessage): CreateInDatabaseEntState => ({
    ...genericEntityConversion(
        data,
        {
            name: 'name',
            icon: 'icon',
            color: 'color',
            description: 'description',
        }
    ),
    type: 'topic',
});

export class TopicDatabase extends GenericMongoDatabase<ReadTopicMessage, CreateTopicMessage, DeleteTopicMessage, UpdateTopicMessage, InternalTopic> {


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

    private static convertReadRequestToDatabaseQuery(request: ReadTopicMessage): FilterQuery<InternalTopic> {
        const obj: any = {
            color: request.color,
            icon: request.icon,
            type: 'topic',
        };

        let text = [];
        if (request.name) text.push(request.name);
        if (request.description) text.push(request.description);
        if (text.length > 0) obj.$text = { $search: text.join(' ') };

        if (request.id) {
            if (typeof (request.id) === 'string') {
                obj._id = new ObjectID(request.id);
            } else {
                obj._id = {
                    $in: request.id.map((e) => new ObjectID(e)),
                };
            }
        }

        return Object.fromEntries(Object.entries(obj)
            .filter(([, value]) => value !== undefined));
    }

    protected async createImpl(create: TopicMessage.CreateTopicMessage, details: Collection): Promise<string[]> {
        return genericCreate(create, createToDB, details, (e) => {
            throw new ClientFacingError('duplicate topic');
        }, this.log.bind(this));
    }

    protected deleteImpl(remove: TopicMessage.DeleteTopicMessage, details: Collection): Promise<string[]> {
        return genericDelete<InDatabaseTopic>({
            _id: new ObjectId(remove.id),
            type: 'topic',
        }, remove.id, details, this.log.bind(this));
    }

    protected async queryImpl(query: TopicMessage.ReadTopicMessage, details: Collection): Promise<InternalTopic[]> {
        return (await details.find(TopicDatabase.convertReadRequestToDatabaseQuery(query)).toArray()).map(dbToInternal);
    }

    protected updateImpl(update: TopicMessage.UpdateTopicMessage, details: Collection): Promise<string[]> {
        return genericUpdate(update, ['name', 'icon', 'color', 'description'], details, { type: 'topic' }, () => {
            throw new ClientFacingError('cannot update to existing name');
        });
    }

}
