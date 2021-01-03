import { Collection, FilterQuery, ObjectID, ObjectId } from "mongodb";
import { GenericMongoDatabase } from "@uems/micro-builder";
import { TopicMessage, TopicResponse } from "@uems/uemscommlib";
import ReadTopicMessage = TopicMessage.ReadTopicMessage;
import CreateTopicMessage = TopicMessage.CreateTopicMessage;
import DeleteTopicMessage = TopicMessage.DeleteTopicMessage;
import UpdateTopicMessage = TopicMessage.UpdateTopicMessage;
import InternalTopic = TopicResponse.InternalTopic;

export class TopicDatabase extends GenericMongoDatabase<ReadTopicMessage, CreateTopicMessage, DeleteTopicMessage, UpdateTopicMessage, InternalTopic> {

    private static convertReadRequestToDatabaseQuery(request: ReadTopicMessage): FilterQuery<InternalTopic> {
        const obj: any = {
            color: request.color,
            icon: request.icon,
            name: request.name,
            description: request.description,
        };

        if (request.id) {
            obj._id = new ObjectID(request.id);
        }

        return Object.fromEntries(Object.entries(obj)
            .filter(([, value]) => value !== undefined));
    }

    protected async createImpl(create: TopicMessage.CreateTopicMessage, details: Collection): Promise<string[]> {
        const { msg_id, msg_intention, status, ...document } = create;

        const result = await details.insertOne({
            color: document.color,
            icon: document.icon,
            name: document.name,
            description: document.description,
        });

        if (result.insertedCount !== 1 || result.insertedId === undefined) {
            throw new Error('failed to insert')
        }

        const id = (result.insertedId as ObjectId).toHexString();
        await super.log(id, 'inserted');

        return [id];
    }

    protected deleteImpl(remove: TopicMessage.DeleteTopicMessage): Promise<string[]> {
        return super.defaultDelete(remove);
    }

    protected async queryImpl(query: TopicMessage.ReadTopicMessage, details: Collection): Promise<InternalTopic[]> {
        const result: InternalTopic[] = await details.find(TopicDatabase.convertReadRequestToDatabaseQuery(query)).toArray();

        // Copy _id to id to fit the responsr type.
        for (const r of result) {
            // @ts-ignore
            r.id = r._id.toString();

            // @ts-ignore
            delete r._id;
        }

        return result;
    }

    protected updateImpl(update: TopicMessage.UpdateTopicMessage): Promise<string[]> {
        return super.defaultUpdate(update)
    }

}
