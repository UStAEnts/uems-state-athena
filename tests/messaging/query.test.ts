// should return return all when query is empty
// should return onyl valid properties
// should only return one matching entry when querying by ID
// query by substring works
// query by invalid id returns no result

import { Db, MongoClient, ObjectId } from "mongodb";
import { defaultAfterAll, defaultAfterEach, defaultBeforeAll, defaultBeforeEach, haveNoAdditionalKeys } from "../utilities/setup";
import { EntStateDatabase } from "../../src/database/EntStateDatabase";
import { TopicDatabase } from "../../src/database/TopicDatabase";
import { StateDatabase } from "../../src/database/StateDatabase";
import { BaseSchema } from "@uems/uemscommlib/build/BaseSchema";
import Intentions = BaseSchema.Intentions;

const empty = <T extends Intentions>(intention: T): { msg_intention: T, msg_id: 0, status: 0, userID: string } => ({
    msg_intention: intention,
    msg_id: 0,
    status: 0,
    userID: 'user',
})

describe('delete messages of states', () => {
    let client!: MongoClient;
    let db!: Db;

    beforeAll(async () => {
        const { client: newClient, db: newDb } = await defaultBeforeAll();
        client = newClient;
        db = newDb;
    });
    afterAll(() => defaultAfterAll(client, db));

    beforeEach(() => defaultBeforeEach([
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
    ], client, db));

    afterEach(() => defaultAfterEach(client, db));

    describe('ent state', () => {
        let entStateDB: EntStateDatabase;

        beforeAll(() => {
            entStateDB = new EntStateDatabase(db, {
                changelog: 'changelog',
                details: 'details',
            });
        })

        it('should return return all when query is empty', async () => {
            const query = await entStateDB.query({ ...empty('READ') });
            expect(query).toHaveLength(2);
            let find = query.find((e) => e.id === '56d9bf92f9be48771d6fe5b4');
            expect(find).not.toBeUndefined();
            expect(find).toEqual({
                id: '56d9bf92f9be48771d6fe5b4',
                name: 'name',
                icon: 'icon',
                color: 'color',
            });
            find = query.find((e) => e.id === '56d9bf92f9be48771d6fe5b5');
            expect(find).not.toBeUndefined();
            expect(find).toEqual({
                id: '56d9bf92f9be48771d6fe5b5',
                name: 'name dup',
                icon: 'icon',
                color: 'color',
            });
        });
        it('should return only valid properties', async () => {
            const query = await entStateDB.query({ ...empty('READ'), id: '56d9bf92f9be48771d6fe5b5' });
            expect(query).toHaveLength(1);
            expect(haveNoAdditionalKeys(query[0], ['name', 'icon', 'color', 'id']));
        });
        it('query by substring works', async () => {
            const query = await entStateDB.query({ ...empty('READ'), name: 'up' });
            expect(query).toHaveLength(1);
            expect(query[0]).toEqual({
                id: '56d9bf92f9be48771d6fe5b5',
                name: 'name dup',
                icon: 'icon',
                color: 'color',
            })
        });
        it('query by invalid id returns no result', async () => {
            const query = await entStateDB.query({ ...empty('READ'), id: '56d9bf92f9be48771d6fe5b9' });
            expect(query).toHaveLength(0);
        });
    })


    describe('topic', () => {
        let topicsDB: TopicDatabase;

        beforeAll(() => {
            topicsDB = new TopicDatabase(db, {
                changelog: 'changelog',
                details: 'details',
            });
        })

        it('should return return all when query is empty', async () => {
            const query = await topicsDB.query({ ...empty('READ') });
            expect(query).toHaveLength(2);
            let find = query.find((e) => e.id === '56d9bf92f9be48771d6fe5b2');
            expect(find).not.toBeUndefined();
            expect(find).toEqual({
                id: '56d9bf92f9be48771d6fe5b2',
                name: 'name',
                icon: 'icon',
                color: 'color',
                description: 'description',
            });
            find = query.find((e) => e.id === '56d9bf92f9be48771d6fe5b7');
            expect(find).not.toBeUndefined();
            expect(find).toEqual({
                id: '56d9bf92f9be48771d6fe5b7',
                name: 'name dup',
                icon: 'icon',
                color: 'color',
                description: 'description',
            });
        });
        it('should return only valid properties', async () => {
            const query = await topicsDB.query({ ...empty('READ'), id: '56d9bf92f9be48771d6fe5b7' });
            expect(query).toHaveLength(1);
            expect(haveNoAdditionalKeys(query[0], ['name', 'icon', 'color', 'id', 'description']));
        });
        it('query by substring works', async () => {
            const query = await topicsDB.query({ ...empty('READ'), name: 'up' });
            expect(query).toHaveLength(1);
            expect(query[0]).toEqual({
                id: '56d9bf92f9be48771d6fe5b7',
                name: 'name dup',
                icon: 'icon',
                color: 'color',
                description: 'description',
            })
        });
        it('query by invalid id returns no result', async () => {
            const query = await topicsDB.query({ ...empty('READ'), id: '56d9bf92f9be48771d6fe5b9' });
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
        });

        it('should return return all when query is empty', async () => {
            const query = await stateDB.query({ ...empty('READ') });
            expect(query).toHaveLength(2);
            let find = query.find((e) => e.id === '56d9bf92f9be48771d6fe5b3');
            expect(find).not.toBeUndefined();
            expect(find).toEqual({
                id: '56d9bf92f9be48771d6fe5b3',
                name: 'name',
                icon: 'icon',
                color: 'color',
            });
            find = query.find((e) => e.id === '56d9bf92f9be48771d6fe5b6');
            expect(find).not.toBeUndefined();
            expect(find).toEqual({
                id: '56d9bf92f9be48771d6fe5b6',
                name: 'name dup',
                icon: 'icon',
                color: 'color',
            });
        });
        it('should return only valid properties', async () => {
            const query = await stateDB.query({ ...empty('READ'), id: '56d9bf92f9be48771d6fe5b6' });
            expect(query).toHaveLength(1);
            expect(haveNoAdditionalKeys(query[0], ['name', 'icon', 'color', 'id']));
        });
        it('query by substring works', async () => {
            const query = await stateDB.query({ ...empty('READ'), name: 'up' });
            expect(query).toHaveLength(1);
            expect(query[0]).toEqual({
                id: '56d9bf92f9be48771d6fe5b6',
                name: 'name dup',
                icon: 'icon',
                color: 'color',
            })
        });
        it('query by invalid id returns no result', async () => {
            const query = await stateDB.query({ ...empty('READ'), id: '56d9bf92f9be48771d6fe5b9' });
            expect(query).toHaveLength(0);
        });

    });

});
