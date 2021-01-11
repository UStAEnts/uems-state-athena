import { Db, MongoClient, ObjectId } from "mongodb";
import { defaultAfterAll, defaultAfterEach, defaultBeforeAll, defaultBeforeEach } from "../utilities/setup";
import { EntStateDatabase } from "../../src/database/EntStateDatabase";
import { StateDatabase } from "../../src/database/StateDatabase";
import { TopicDatabase } from "../../src/database/TopicDatabase";
import { BaseSchema } from "@uems/uemscommlib/build/BaseSchema";
import Intentions = BaseSchema.Intentions;

const empty = <T extends Intentions>(intention: T): { msg_intention: T, msg_id: 0, status: 0, userID: string } => ({
    msg_intention: intention,
    msg_id: 0,
    status: 0,
    userID: 'user',
})

describe('create messages of states', () => {
    let client!: MongoClient;
    let db!: Db;

    beforeAll(async () => {
        const { client: newClient, db: newDb } = await defaultBeforeAll();
        client = newClient;
        db = newDb;
    });
    afterAll(() => defaultAfterAll(client, db));

    beforeEach(() => defaultBeforeEach([{
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
    }], client, db));

    afterEach(() => defaultAfterEach(client, db));

    describe('ent state', () => {
        let entStateDB: EntStateDatabase;

        beforeAll(() => {
            entStateDB = new EntStateDatabase(db, {
                changelog: 'changelog',
                details: 'details',
            });
        })

        it('should allow basic deletes to perform successfully', async () => {
            const id = '56d9bf92f9be48771d6fe5b4';
            const remove = await entStateDB.delete({ ...empty('DELETE'), id });
            expect(remove).toHaveLength(1);
            expect(remove).toEqual([id]);

            const query = await entStateDB.query(empty('READ'));
            expect(query).toHaveLength(0);
        });

        it('should reject when deleting with a non-existent id', async () => {
            const id = '56d9bf92f9be48771d6fe5b9';
            await expect(entStateDB.delete({ ...empty('DELETE'), id })).rejects.toThrowError('failed to delete');

            const query = await entStateDB.query(empty('READ'));
            expect(query).toHaveLength(1);
        });

        it('should support deleting with additional properties', async () => {
            const id = '56d9bf92f9be48771d6fe5b4';
            // @ts-ignore
            const remove = await entStateDB.delete({ ...empty('DELETE'), id, other: 'additional' });
            expect(remove).toHaveLength(1);
            expect(remove).toEqual([id]);

            const query = await entStateDB.query(empty('READ'));
            expect(query).toHaveLength(0);
        });
    });

    describe('topic', () => {
        let topicsDB: TopicDatabase;

        beforeAll(() => {
            topicsDB = new TopicDatabase(db, {
                changelog: 'changelog',
                details: 'details',
            });
        })

        it('should allow basic deletes to perform successfully', async () => {
            const id = '56d9bf92f9be48771d6fe5b2';
            const remove = await topicsDB.delete({ ...empty('DELETE'), id });
            expect(remove).toHaveLength(1);
            expect(remove).toEqual([id]);

            const query = await topicsDB.query(empty('READ'));
            expect(query).toHaveLength(0);
        });

        it('should reject when deleting with a non-existent id', async () => {
            const id = '56d9bf92f9be48771d6fe5b9';
            await expect(topicsDB.delete({ ...empty('DELETE'), id })).rejects.toThrowError('failed to delete');

            const query = await topicsDB.query(empty('READ'));
            expect(query).toHaveLength(1);
        });

        it('should support deleting with additional properties', async () => {
            const id = '56d9bf92f9be48771d6fe5b2';
            // @ts-ignore
            const remove = await topicsDB.delete({ ...empty('DELETE'), id, other: 'additional' });
            expect(remove).toHaveLength(1);
            expect(remove).toEqual([id]);

            const query = await topicsDB.query(empty('READ'));
            expect(query).toHaveLength(0);
        });

    });

    describe('state', () => {
        let stateDB: StateDatabase;

        beforeAll(() => {
            stateDB = new StateDatabase(db, {
                changelog: 'changelog',
                details: 'details',
            });
        })

        it('should allow basic deletes to perform successfully', async () => {
            const id = '56d9bf92f9be48771d6fe5b3';
            const remove = await stateDB.delete({ ...empty('DELETE'), id });
            expect(remove).toHaveLength(1);
            expect(remove).toEqual([id]);

            const query = await stateDB.query(empty('READ'));
            expect(query).toHaveLength(0);
        });

        it('should reject when deleting with a non-existent id', async () => {
            const id = '56d9bf92f9be48771d6fe5b9';
            await expect(stateDB.delete({ ...empty('DELETE'), id })).rejects.toThrowError('failed to delete');

            const query = await stateDB.query(empty('READ'));
            expect(query).toHaveLength(1);
        });

        it('should support deleting with additional properties', async () => {
            const id = '56d9bf92f9be48771d6fe5b3';
            // @ts-ignore
            const remove = await stateDB.delete({ ...empty('DELETE'), id, other: 'additional' });
            expect(remove).toHaveLength(1);
            expect(remove).toEqual([id]);

            const query = await stateDB.query(empty('READ'));
            expect(query).toHaveLength(0);
        });


    });

});
