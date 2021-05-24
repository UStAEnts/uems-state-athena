import { Db, MongoClient, ObjectId } from "mongodb";
import { defaultAfterAll, defaultAfterEach, defaultBeforeAll, defaultBeforeEach } from "../utilities/setup";
import { BindingBroker } from "../utilities/BindingBroker";
import { RabbitNetworkHandler } from "@uems/micro-builder/build/src";
import { StateDatabase } from "../../src/database/StateDatabase";
import { TopicDatabase } from "../../src/database/TopicDatabase";
import { EntStateDatabase } from "../../src/database/EntStateDatabase";
import bind from "../../src/Binding";
import { BaseSchema, EntStateMessage, MsgStatus, StateMessage, TopicMessage } from "@uems/uemscommlib";
import Intentions = BaseSchema.Intentions;
import UpdateEntStateMessage = EntStateMessage.UpdateEntStateMessage;
import CreateEntStateMessage = EntStateMessage.CreateEntStateMessage;
import UpdateStateMessage = StateMessage.UpdateStateMessage;
import CreateTopicMessage = TopicMessage.CreateTopicMessage;
import ReadStateMessage = StateMessage.ReadStateMessage;
import ReadEntStateMessage = EntStateMessage.ReadEntStateMessage;
import DeleteStateMessage = StateMessage.DeleteStateMessage;
import DeleteTopicMessage = TopicMessage.DeleteTopicMessage;
import ReadTopicMessage = TopicMessage.ReadTopicMessage;
import DeleteEntStateMessage = EntStateMessage.DeleteEntStateMessage;
import UpdateTopicMessage = TopicMessage.UpdateTopicMessage;
import CreateStateMessage = StateMessage.CreateStateMessage;

const empty = <T extends Intentions>(intention: T): { msg_intention: T, msg_id: 0, status: 0, userID: string } => ({
    msg_intention: intention,
    msg_id: 0,
    status: 0,
    userID: 'user',
})
// query for invalid returns nothing
// query for id returns one
// empty queries allowed

const INIT_DATA = [{
    _id: new ObjectId('56d9bf92f9be48771d6fe5b2'),
    name: 'name',
    icon: 'icon',
    color: 'color',
    description: 'description',
    type: 'topic',
}, {
    _id: new ObjectId('56d9bf92f9be48771d6fe5b3'),
    name: 'name',
    icon: 'icon',
    color: 'color',
    type: 'state',
}, {
    _id: new ObjectId('56d9bf92f9be48771d6fe5b4'),
    name: 'name',
    icon: 'icon',
    color: 'color',
    type: 'ent',
}]

describe('create messages of states', () => {
    let client!: MongoClient;
    let db!: Db;

    let broker!: BindingBroker<ReadEntStateMessage | ReadStateMessage | ReadTopicMessage,
        DeleteEntStateMessage | DeleteStateMessage | DeleteTopicMessage,
        UpdateEntStateMessage | UpdateStateMessage | UpdateTopicMessage,
        CreateEntStateMessage | CreateStateMessage | CreateTopicMessage,
        EntStateMessage.EntStateMessage | StateMessage.StateMessage | TopicMessage.TopicMessage>;
    let fakeBroker!: RabbitNetworkHandler<any, any, any, any, any, any>;

    let stateDB!: StateDatabase;
    let entDB!: EntStateDatabase;
    let topicDB!: TopicDatabase;

    beforeAll(async () => {
        const { client: newClient, db: newDb } = await defaultBeforeAll();
        client = newClient;
        db = newDb;

        broker = new BindingBroker();
        fakeBroker = broker as unknown as RabbitNetworkHandler<any, any, any, any, any, any>;

        stateDB = new StateDatabase(db, { details: 'details', changelog: 'details' });
        entDB = new EntStateDatabase(db, { details: 'details', changelog: 'details' });
        topicDB = new TopicDatabase(db, { details: 'details', changelog: 'details' });
    });
    afterAll(() => defaultAfterAll(client, db));
    beforeEach(() => {
        broker.clear();
        bind(stateDB, entDB, topicDB, fakeBroker);
        defaultBeforeEach(INIT_DATA, client, db)
    });
    afterEach(() => defaultAfterEach(client, db));

    describe('state', () => {
        it('should not allow querying for invalid properties', async (done) => {
            // @ts-ignore
            broker.emit('query', {
                ...empty('READ'),
                invalid: 'something',
            }, 'states.details.read', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.FAIL);
                expect(message.result).toHaveLength(1);

                done();
            })
        });

        it('should support querying by id', async (done) => {
            broker.emit('query', {
                ...empty('READ'),
                id: INIT_DATA[1]._id.toHexString(),
            }, 'states.details.read', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.SUCCESS);
                expect(message.result).toHaveLength(1);

                const { _id, type, ...data } = INIT_DATA[1];
                expect(message.result[0]).toEqual({
                    ...data,
                    id: _id.toHexString(),
                });

                done();
            })
        });

        it('should support empty queries', async (done) => {
            broker.emit('query', {
                ...empty('READ'),
            }, 'states.details.read', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.SUCCESS);
                expect(message.result).toHaveLength(1);

                const { _id, type, ...data } = INIT_DATA[1];
                expect(message.result[0]).toEqual({
                    ...data,
                    id: _id.toHexString(),
                });

                done();
            })
        });
    });

    describe('ents state', () => {
        it('should not allow querying for invalid properties', async (done) => {
            // @ts-ignore
            broker.emit('query', {
                ...empty('READ'),
                invalid: 'something',
            }, 'ents.details.read', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.FAIL);
                expect(message.result).toHaveLength(1);

                done();
            })
        });

        it('should support querying by id', async (done) => {
            broker.emit('query', {
                ...empty('READ'),
                id: INIT_DATA[2]._id.toHexString(),
            }, 'ents.details.read', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.SUCCESS);
                expect(message.result).toHaveLength(1);

                const { _id, type, ...data } = INIT_DATA[2];
                expect(message.result[0]).toEqual({
                    ...data,
                    id: _id.toHexString(),
                });

                done();
            })
        });

        it('should support empty queries', async (done) => {
            broker.emit('query', {
                ...empty('READ'),
            }, 'ents.details.read', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.SUCCESS);
                expect(message.result).toHaveLength(1);

                const { _id, type, ...data } = INIT_DATA[2];
                expect(message.result[0]).toEqual({
                    ...data,
                    id: _id.toHexString(),
                });

                done();
            })
        });
    });

    describe('topics', () => {
        it('should not allow querying for invalid properties', async (done) => {
            // @ts-ignore
            broker.emit('query', {
                ...empty('READ'),
                invalid: 'something',
            }, 'topics.details.read', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.FAIL);
                expect(message.result).toHaveLength(1);

                done();
            })
        });

        it('should support querying by id', async (done) => {
            broker.emit('query', {
                ...empty('READ'),
                id: INIT_DATA[0]._id.toHexString(),
            }, 'topics.details.read', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.SUCCESS);
                expect(message.result).toHaveLength(1);

                const { _id, type, ...data } = INIT_DATA[0];
                expect(message.result[0]).toEqual({
                    ...data,
                    id: _id.toHexString(),
                });

                done();
            })
        });

        it('should support empty queries', async (done) => {
            broker.emit('query', {
                ...empty('READ'),
            }, 'topics.details.read', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.SUCCESS);
                expect(message.result).toHaveLength(1);

                const { _id, type, ...data } = INIT_DATA[0];
                expect(message.result[0]).toEqual({
                    ...data,
                    id: _id.toHexString(),
                });

                done();
            })
        });
    });

});
