import { Db, MongoClient, ObjectId } from "mongodb";
import { defaultAfterAll, defaultAfterEach, defaultBeforeAll, defaultBeforeEach } from "../utilities/setup";
import { BindingBroker } from "../utilities/BindingBroker";
import { RabbitNetworkHandler } from "@uems/micro-builder";
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
// delete works
// delete unknown fails
const empty = <T extends Intentions>(intention: T): { msg_intention: T, msg_id: 0, status: 0, userID: string } => ({
    msg_intention: intention,
    msg_id: 0,
    status: 0,
    userID: 'user',
})

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
        defaultBeforeEach([{
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
        }], client, db)
    });
    afterEach(() => defaultAfterEach(client, db));

    const stateID = '56d9bf92f9be48771d6fe5b3'
    const entID = '56d9bf92f9be48771d6fe5b4';
    const topicID = '56d9bf92f9be48771d6fe5b2';

    describe('state', () => {
        it('should allow valid delete instructions', async (done) => {
            broker.emit('delete', {
                ...empty('DELETE'),
                id: stateID,
            }, 'states.details.delete', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.SUCCESS);
                expect(message.result).toHaveLength(1);
                expect(message.result[0]).toEqual(stateID);

                broker.emit('query', { ...empty('READ') }, 'states.details.read', (read) => {
                    expect(read).toHaveProperty('result');
                    expect(read).toHaveProperty('status');

                    expect(read.status).toEqual(MsgStatus.SUCCESS);
                    expect(read.result).toHaveLength(0);

                    done();
                });
            });
        });

        it('should reject on invalid delete', async (done) => {
            broker.emit('delete', {
                ...empty('DELETE'),
                id: entID,
            }, 'states.details.delete', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.FAIL);
                expect(message.result).toHaveLength(1);

                broker.emit('query', { ...empty('READ') }, 'states.details.read', (read) => {
                    expect(read).toHaveProperty('result');
                    expect(read).toHaveProperty('status');

                    expect(read.status).toEqual(MsgStatus.SUCCESS);
                    expect(read.result).toHaveLength(1);
                    expect(read.result[0]).toHaveProperty('id', stateID);

                    done();
                });
            });
        });
    });

    describe('ents state', () => {
        it('should allow valid delete instructions', async (done) => {
            broker.emit('delete', {
                ...empty('DELETE'),
                id: entID,
            }, 'ents.details.delete', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.SUCCESS);
                expect(message.result).toHaveLength(1);
                expect(message.result[0]).toEqual(entID);

                broker.emit('query', { ...empty('READ') }, 'ents.details.read', (read) => {
                    expect(read).toHaveProperty('result');
                    expect(read).toHaveProperty('status');

                    expect(read.status).toEqual(MsgStatus.SUCCESS);
                    expect(read.result).toHaveLength(0);

                    done();
                });
            });
        });

        it('should reject on invalid delete', async (done) => {
            broker.emit('delete', {
                ...empty('DELETE'),
                id: stateID,
            }, 'ents.details.delete', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.FAIL);
                expect(message.result).toHaveLength(1);

                broker.emit('query', { ...empty('READ') }, 'ents.details.read', (read) => {
                    expect(read).toHaveProperty('result');
                    expect(read).toHaveProperty('status');

                    expect(read.status).toEqual(MsgStatus.SUCCESS);
                    expect(read.result).toHaveLength(1);
                    expect(read.result[0]).toHaveProperty('id', entID);

                    done();
                });
            });
        });
    });

    describe('topics', () => {
        it('should allow valid delete instructions', async (done) => {
            broker.emit('delete', {
                ...empty('DELETE'),
                id: topicID,
            }, 'topics.details.delete', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.SUCCESS);
                expect(message.result).toHaveLength(1);
                expect(message.result[0]).toEqual(topicID);

                broker.emit('query', { ...empty('READ') }, 'topics.details.read', (read) => {
                    expect(read).toHaveProperty('result');
                    expect(read).toHaveProperty('status');

                    expect(read.status).toEqual(MsgStatus.SUCCESS);
                    expect(read.result).toHaveLength(0);

                    done();
                });
            });
        });

        it('should reject on invalid delete', async (done) => {
            broker.emit('delete', {
                ...empty('DELETE'),
                id: entID,
            }, 'topics.details.delete', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.FAIL);
                expect(message.result).toHaveLength(1);

                broker.emit('query', { ...empty('READ') }, 'topics.details.read', (read) => {
                    expect(read).toHaveProperty('result');
                    expect(read).toHaveProperty('status');

                    expect(read.status).toEqual(MsgStatus.SUCCESS);
                    expect(read.result).toHaveLength(1);
                    expect(read.result[0]).toHaveProperty('id', topicID);

                    done();
                });
            });
        });
    });

});
