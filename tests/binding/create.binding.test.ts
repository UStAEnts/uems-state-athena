import { Db, MongoClient } from "mongodb";
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
// creating normal works
// creating duplicate fails
// undefined db fails successfully

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
        defaultBeforeEach([], client, db)
    });
    afterEach(() => defaultAfterEach(client, db));

    describe('state', () => {
        it('should allow creates to take place', async (done) => {
            broker.emit('create', {
                ...empty('CREATE'),
                name: 'name',
                icon: 'icon',
                color: '#aaaaaa',
            }, 'states.details.create', (creation) => {
                expect(creation).toHaveProperty('result');
                expect(creation).toHaveProperty('status');

                expect(creation.status).toEqual(MsgStatus.SUCCESS);
                expect(creation.result).toHaveLength(1);

                broker.emit('query', { ...empty('READ'), id: creation.result[0] }, 'states.details.read', (data) => {
                    expect(data).toHaveProperty('result');
                    expect(data).toHaveProperty('status');

                    expect(data.status).toEqual(MsgStatus.SUCCESS);
                    expect(data.result).toHaveLength(1);
                    expect(data.result[0]).toHaveProperty('color', '#aaaaaa');
                    expect(data.result[0]).toHaveProperty('icon', 'icon');
                    expect(data.result[0]).toHaveProperty('name', 'name');

                    done();
                });
            });
        });

        it('should prevent creating duplicate entries', async (done) => {
            broker.emit('create', {
                ...empty('CREATE'),
                name: 'name',
                icon: 'icon',
                color: '#aaaaaa',
            }, 'states.details.create', (creation) => {
                expect(creation).toHaveProperty('result');
                expect(creation).toHaveProperty('status');

                expect(creation.status).toEqual(MsgStatus.SUCCESS);
                expect(creation.result).toHaveLength(1);

                broker.emit('create', {
                    ...empty('CREATE'),
                    name: 'name',
                    icon: 'icon',
                    color: '#aaaaaa',
                }, 'states.details.create', (second) => {
                    expect(second).toHaveProperty('result');
                    expect(second).toHaveProperty('status');

                    expect(second.status).toEqual(MsgStatus.FAIL);
                    expect(second.result).toHaveLength(1);
                    expect(second.result[0]).toContain('duplicate');

                    done();
                });
            });
        });

        it('should fail gracefully if the database is dead', async (done) => {
            let db: StateDatabase = new Proxy(stateDB, {
                get(target: StateDatabase, p: PropertyKey, receiver: any): any {
                    console.log('???x2');
                    throw new Error('proxied database throwing error');
                },
            });

            broker.clear();
            bind(db, entDB, topicDB, fakeBroker);

            broker.emit('create', {
                ...empty('CREATE'),
                color: '#aaaaaa',
                name: 'name',
                icon: 'icon',
            }, 'states.details.create', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.result).toHaveLength(1);
                expect(message.status).not.toEqual(MsgStatus.SUCCESS);
                expect(message.result[0]).toEqual('internal server error');

                done();
            });
        });
    });

    describe('ents state', () => {
        it('should allow creates to take place', async (done) => {
            broker.emit('create', {
                ...empty('CREATE'),
                name: 'name',
                icon: 'icon',
                color: '#aaaaaa',
            }, 'ents.details.create', (creation) => {
                expect(creation).toHaveProperty('result');
                expect(creation).toHaveProperty('status');

                expect(creation.status).toEqual(MsgStatus.SUCCESS);
                expect(creation.result).toHaveLength(1);

                broker.emit('query', { ...empty('READ'), id: creation.result[0] }, 'ents.details.read', (data) => {
                    expect(data).toHaveProperty('result');
                    expect(data).toHaveProperty('status');

                    expect(data.status).toEqual(MsgStatus.SUCCESS);
                    expect(data.result).toHaveLength(1);
                    expect(data.result[0]).toHaveProperty('color', '#aaaaaa');
                    expect(data.result[0]).toHaveProperty('icon', 'icon');
                    expect(data.result[0]).toHaveProperty('name', 'name');

                    done();
                });
            });
        });

        it('should prevent creating duplicate entries', async (done) => {
            broker.emit('create', {
                ...empty('CREATE'),
                name: 'name',
                icon: 'icon',
                color: '#aaaaaa',
            }, 'ents.details.create', (creation) => {
                expect(creation).toHaveProperty('result');
                expect(creation).toHaveProperty('status');

                expect(creation.status).toEqual(MsgStatus.SUCCESS);
                expect(creation.result).toHaveLength(1);

                broker.emit('create', {
                    ...empty('CREATE'),
                    name: 'name',
                    icon: 'icon',
                    color: '#aaaaaa',
                }, 'ents.details.create', (second) => {
                    expect(second).toHaveProperty('result');
                    expect(second).toHaveProperty('status');

                    expect(second.status).toEqual(MsgStatus.FAIL);
                    expect(second.result).toHaveLength(1);
                    expect(second.result[0]).toContain('duplicate');

                    done();
                });
            });
        });

        it('should fail gracefully if the database is dead', async (done) => {
            let db: EntStateDatabase = new Proxy(entDB, {
                get(target: EntStateDatabase, p: PropertyKey, receiver: any): any {
                    console.log('???x2');
                    throw new Error('proxied database throwing error');
                },
            });

            broker.clear();
            bind(stateDB, db, topicDB, fakeBroker);

            broker.emit('create', {
                ...empty('CREATE'),
                color: '#aaaaaa',
                name: 'name',
                icon: 'icon',
            }, 'ents.details.create', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.result).toHaveLength(1);
                expect(message.status).not.toEqual(MsgStatus.SUCCESS);
                expect(message.result[0]).toEqual('internal server error');

                done();
            });
        });
    });

    describe('topics', () => {
        it('should allow creates to take place', async (done) => {
            broker.emit('create', {
                ...empty('CREATE'),
                name: 'name',
                icon: 'icon',
                description: 'description',
                color: '#aaaaaa',
            }, 'topics.details.create', (creation) => {
                expect(creation).toHaveProperty('result');
                expect(creation).toHaveProperty('status');

                expect(creation.status).toEqual(MsgStatus.SUCCESS);
                expect(creation.result).toHaveLength(1);

                broker.emit('query', { ...empty('READ'), id: creation.result[0] }, 'topics.details.read', (data) => {
                    expect(data).toHaveProperty('result');
                    expect(data).toHaveProperty('status');

                    expect(data.status).toEqual(MsgStatus.SUCCESS);
                    expect(data.result).toHaveLength(1);
                    expect(data.result[0]).toHaveProperty('color', '#aaaaaa');
                    expect(data.result[0]).toHaveProperty('icon', 'icon');
                    expect(data.result[0]).toHaveProperty('name', 'name');
                    expect(data.result[0]).toHaveProperty('description', 'description');

                    done();
                });
            });
        });

        it('should prevent creating duplicate entries', async (done) => {
            broker.emit('create', {
                ...empty('CREATE'),
                name: 'name',
                icon: 'icon',
                color: '#aaaaaa',
                description: 'description one',
            }, 'topics.details.create', (creation) => {
                expect(creation).toHaveProperty('result');
                expect(creation).toHaveProperty('status');

                expect(creation.status).toEqual(MsgStatus.SUCCESS);
                expect(creation.result).toHaveLength(1);

                broker.emit('create', {
                    ...empty('CREATE'),
                    name: 'name',
                    icon: 'icon',
                    color: '#aaaaaa',
                    description: 'description two',
                }, 'topics.details.create', (second) => {
                    expect(second).toHaveProperty('result');
                    expect(second).toHaveProperty('status');

                    expect(second.status).toEqual(MsgStatus.FAIL);
                    expect(second.result).toHaveLength(1);
                    expect(second.result[0]).toContain('duplicate');

                    done();
                });
            });
        });

        it('should fail gracefully if the database is dead', async (done) => {
            let db: TopicDatabase = new Proxy(topicDB, {
                get(target: TopicDatabase, p: PropertyKey, receiver: any): any {
                    throw new Error('proxied database throwing error');
                },
            });

            broker.clear();
            bind(stateDB, entDB, db, fakeBroker);

            broker.emit('create', {
                ...empty('CREATE'),
                color: '#aaaaaa',
                name: 'name',
                description: 'description',
                icon: 'icon',
            }, 'topics.details.create', (message) => {
                expect(message).toHaveProperty('result');
                expect(message).toHaveProperty('status');

                expect(message.result).toHaveLength(1);
                expect(message.status).not.toEqual(MsgStatus.SUCCESS);
                expect(message.result[0]).toEqual('internal server error');

                done();
            });
        });
    });

});
