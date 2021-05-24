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
import ReadEntStateMessage = EntStateMessage.ReadEntStateMessage;
import ReadStateMessage = StateMessage.ReadStateMessage;
import ReadTopicMessage = TopicMessage.ReadTopicMessage;
import DeleteEntStateMessage = EntStateMessage.DeleteEntStateMessage;
import DeleteStateMessage = StateMessage.DeleteStateMessage;
import DeleteTopicMessage = TopicMessage.DeleteTopicMessage;
import UpdateEntStateMessage = EntStateMessage.UpdateEntStateMessage;
import UpdateStateMessage = StateMessage.UpdateStateMessage;
import UpdateTopicMessage = TopicMessage.UpdateTopicMessage;
import CreateEntStateMessage = EntStateMessage.CreateEntStateMessage;
import CreateStateMessage = StateMessage.CreateStateMessage;
import CreateTopicMessage = TopicMessage.CreateTopicMessage;
// updating normal works
// updating duplicate fails

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
        defaultBeforeEach([
            // === TOPICS ==
            {
                _id: new ObjectId('56d9bf92f9be48771d6fe5b7'),
                name: 'name dup',
                icon: 'icon',
                color: 'color',
                description: 'description',
                type: 'topic',
            }, {
                _id: new ObjectId('56d9bf92f9be48771d6fe5b2'),
                name: 'name',
                icon: 'icon',
                color: 'color',
                description: 'description',
                type: 'topic',
            },
            // === STATES ===
            {
                _id: new ObjectId('56d9bf92f9be48771d6fe5b6'),
                name: 'name dup',
                icon: 'icon',
                color: 'color',
                type: 'state',
            }, {
                _id: new ObjectId('56d9bf92f9be48771d6fe5b3'),
                name: 'name',
                icon: 'icon',
                color: 'color',
                type: 'state',
            },
            // === ENT STATES ===
            {
                _id: new ObjectId('56d9bf92f9be48771d6fe5b5'),
                name: 'name dup',
                icon: 'icon',
                color: 'color',
                type: 'ent',
            }, {
                _id: new ObjectId('56d9bf92f9be48771d6fe5b4'),
                name: 'name',
                icon: 'icon',
                color: 'color',
                type: 'ent',
            }
        ], client, db)
    });
    afterEach(() => defaultAfterEach(client, db));

    describe('state', () => {
        it('should allow normal updating', async (done) => {
            const id = '56d9bf92f9be48771d6fe5b6';
            broker.emit('update', {
                ...empty('UPDATE'),
                color: '#aaaaaa',
                icon: 'new icon',
                name: 'new name',
                id,
            }, 'states.details.update', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.SUCCESS);
                expect(message.result).toHaveLength(1);
                expect(message.result[0]).toEqual(id);

                broker.emit('query', { ...empty('READ'), id }, 'states.details.read', (data) => {
                    expect(data).toHaveProperty('result');
                    expect(data).toHaveProperty('status');

                    expect(data.status).toEqual(MsgStatus.SUCCESS);
                    expect(data.result).toHaveLength(1);
                    expect(data.result[0]).toHaveProperty('color', '#aaaaaa');
                    expect(data.result[0]).toHaveProperty('icon', 'new icon');
                    expect(data.result[0]).toHaveProperty('name', 'new name');

                    done();
                });
            });
        });

        it('should prevent duplicating entries', async (done) => {
            const id = '56d9bf92f9be48771d6fe5b3';
            broker.emit('update', {
                ...empty('UPDATE'),
                color: '#aaaaaa',
                icon: 'new icon',
                name: 'name dup',
                id,
            }, 'states.details.update', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.FAIL);
                expect(message.result).toHaveLength(1);
                expect(message.result[0]).toContain('existing');
                done();
            });
        });
    });

    describe('ents state', () => {
        it('should allow normal updating', async (done) => {
            const id = '56d9bf92f9be48771d6fe5b5';
            broker.emit('update', {
                ...empty('UPDATE'),
                color: '#aaaaaa',
                icon: 'new icon',
                name: 'new name',
                id,
            }, 'ents.details.update', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.SUCCESS);
                expect(message.result).toHaveLength(1);
                expect(message.result[0]).toEqual(id);

                broker.emit('query', { ...empty('READ'), id }, 'ents.details.read', (data) => {
                    expect(data).toHaveProperty('result');
                    expect(data).toHaveProperty('status');

                    expect(data.status).toEqual(MsgStatus.SUCCESS);
                    expect(data.result).toHaveLength(1);
                    expect(data.result[0]).toHaveProperty('color', '#aaaaaa');
                    expect(data.result[0]).toHaveProperty('icon', 'new icon');
                    expect(data.result[0]).toHaveProperty('name', 'new name');

                    done();
                });
            });
        });

        it('should prevent duplicating entries', async (done) => {
            const id = '56d9bf92f9be48771d6fe5b4';
            broker.emit('update', {
                ...empty('UPDATE'),
                color: '#aaaaaa',
                icon: 'new icon',
                name: 'name dup',
                id,
            }, 'ents.details.update', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.FAIL);
                expect(message.result).toHaveLength(1);
                expect(message.result[0]).toContain('existing');
                done();
            });
        });
    });

    describe('topics', () => {
        it('should allow normal updating', async (done) => {
            const id = '56d9bf92f9be48771d6fe5b7';
            broker.emit('update', {
                ...empty('UPDATE'),
                color: '#aaaaaa',
                icon: 'new icon',
                name: 'new name',
                description: 'new description',
                id,
            }, 'topics.details.update', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.SUCCESS);
                expect(message.result).toHaveLength(1);
                expect(message.result[0]).toEqual(id);

                broker.emit('query', { ...empty('READ'), id }, 'topics.details.update', (data) => {
                    expect(data).toHaveProperty('result');
                    expect(data).toHaveProperty('status');

                    expect(data.status).toEqual(MsgStatus.SUCCESS);
                    expect(data.result).toHaveLength(1);
                    expect(data.result[0]).toHaveProperty('color', '#aaaaaa');
                    expect(data.result[0]).toHaveProperty('icon', 'new icon');
                    expect(data.result[0]).toHaveProperty('name', 'new name');
                    expect(data.result[0]).toHaveProperty('description', 'new description');

                    done();
                });
            });
        });

        it('should prevent duplicating entries', async (done) => {
            const id = '56d9bf92f9be48771d6fe5b2';
            broker.emit('update', {
                ...empty('UPDATE'),
                color: '#aaaaaa',
                icon: 'new icon',
                name: 'name dup',
                id,
            }, 'topics.details.update', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.status).toEqual(MsgStatus.FAIL);
                expect(message.result).toHaveLength(1);
                expect(message.result[0]).toContain('existing');
                done();
            });
        });
    });

});
