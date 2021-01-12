// basic
// adding properties does not work
// no changes should not work

import { Db, MongoClient, ObjectId } from "mongodb";
import { defaultAfterAll, defaultAfterEach, defaultBeforeAll, defaultBeforeEach } from "../utilities/setup";
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

        it('should allow updates', async () => {
            const update = await entStateDB.update({
                ...empty('UPDATE'),
                color: 'new color',
                icon: 'new icon',
                name: 'new name',
                id: '56d9bf92f9be48771d6fe5b4',
            });
            expect(update).toHaveLength(1);
            expect(update).toEqual(['56d9bf92f9be48771d6fe5b4']);

            const query = await entStateDB.query({ ...empty('READ') });
            expect(query).toHaveLength(2);
            let find = query.find((e) => e.id === '56d9bf92f9be48771d6fe5b4');
            expect(find).not.toBeUndefined();
            expect(find).toEqual({
                id: '56d9bf92f9be48771d6fe5b4',
                name: 'new name',
                icon: 'new icon',
                color: 'new color',
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

        it('should reject updates with an invalid ID', async () => {
            await expect(entStateDB.update({
                ...empty('UPDATE'),
                color: 'new color',
                icon: 'new icon',
                name: 'new name',
                id: '56d9bf92f9be48771d6fe5b9',
            })).rejects.toThrowError('invalid entity ID');

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

        it('should reject with no operations', async () => {
            await expect(entStateDB.update({
                ...empty('UPDATE'),
                id: '56d9bf92f9be48771d6fe5b4',
            })).rejects.toThrowError('no operations provided');

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

        it('should not allow changing additional properties via update', async () => {
            await expect(entStateDB.update({
                ...empty('UPDATE'),
                id: '56d9bf92f9be48771d6fe5b4',
                name: 'new name',
                // @ts-ignore
                add: 'adding a property',
            })).resolves.toEqual(['56d9bf92f9be48771d6fe5b4']);

            const query = await entStateDB.query({ ...empty('READ') });
            expect(query).toHaveLength(2);
            let find = query.find((e) => e.id === '56d9bf92f9be48771d6fe5b4');
            expect(find).not.toBeUndefined();
            expect(find).toEqual({
                id: '56d9bf92f9be48771d6fe5b4',
                name: 'new name',
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
    });

    describe('topic', () => {
        let topicsDB: TopicDatabase;

        beforeAll(() => {
            topicsDB = new TopicDatabase(db, {
                changelog: 'changelog',
                details: 'details',
            });
        })


        it('should allow updates', async () => {
            const update = await topicsDB.update({
                ...empty('UPDATE'),
                color: 'new color',
                icon: 'new icon',
                name: 'new name',
                description: 'new description',
                id: '56d9bf92f9be48771d6fe5b2',
            });
            expect(update).toHaveLength(1);
            expect(update).toEqual(['56d9bf92f9be48771d6fe5b2']);

            const query = await topicsDB.query({ ...empty('READ') });
            expect(query).toHaveLength(2);
            let find = query.find((e) => e.id === '56d9bf92f9be48771d6fe5b2');
            expect(find).not.toBeUndefined();
            expect(find).toEqual({
                id: '56d9bf92f9be48771d6fe5b2',
                name: 'new name',
                icon: 'new icon',
                color: 'new color',
                description: 'new description',
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

        it('should reject updates with an invalid ID', async () => {
            await expect(topicsDB.update({
                ...empty('UPDATE'),
                color: 'new color',
                icon: 'new icon',
                name: 'new name',
                id: '56d9bf92f9be48771d6fe5b9',
                description: 'new description',
            })).rejects.toThrowError('invalid entity ID');

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

        it('should reject with no operations', async () => {
            await expect(topicsDB.update({
                ...empty('UPDATE'),
                id: '56d9bf92f9be48771d6fe5b2',
            })).rejects.toThrowError('no operations provided');

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

        it('should not allow changing additional properties via update', async () => {
            await expect(topicsDB.update({
                ...empty('UPDATE'),
                id: '56d9bf92f9be48771d6fe5b2',
                name: 'new name',
                // @ts-ignore
                add: 'adding a property',
            })).resolves.toEqual(['56d9bf92f9be48771d6fe5b2']);

            const query = await topicsDB.query({ ...empty('READ') });
            expect(query).toHaveLength(2);
            let find = query.find((e) => e.id === '56d9bf92f9be48771d6fe5b2');
            expect(find).not.toBeUndefined();
            expect(find).toEqual({
                id: '56d9bf92f9be48771d6fe5b2',
                name: 'new name',
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
    });

    describe('state', () => {
        let stateDB: StateDatabase;

        beforeAll(() => {
            stateDB = new StateDatabase(db, {
                changelog: 'changelog',
                details: 'details',
            });
        });

        it('should allow updates', async () => {
            const update = await stateDB.update({
                ...empty('UPDATE'),
                color: 'new color',
                icon: 'new icon',
                name: 'new name',
                id: '56d9bf92f9be48771d6fe5b3',
            });
            expect(update).toHaveLength(1);
            expect(update).toEqual(['56d9bf92f9be48771d6fe5b3']);

            const query = await stateDB.query({ ...empty('READ') });
            expect(query).toHaveLength(2);
            let find = query.find((e) => e.id === '56d9bf92f9be48771d6fe5b3');
            expect(find).not.toBeUndefined();
            expect(find).toEqual({
                id: '56d9bf92f9be48771d6fe5b3',
                name: 'new name',
                icon: 'new icon',
                color: 'new color',
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

        it('should reject updates with an invalid ID', async () => {
            await expect(stateDB.update({
                ...empty('UPDATE'),
                color: 'new color',
                icon: 'new icon',
                name: 'new name',
                id: '56d9bf92f9be48771d6fe5b9',
            })).rejects.toThrowError('invalid entity ID');

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

        it('should reject with no operations', async () => {
            await expect(stateDB.update({
                ...empty('UPDATE'),
                id: '56d9bf92f9be48771d6fe5b3',
            })).rejects.toThrowError('no operations provided');

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

        it('should not allow changing additional properties via update', async () => {
            await expect(stateDB.update({
                ...empty('UPDATE'),
                id: '56d9bf92f9be48771d6fe5b3',
                name: 'new name',
                // @ts-ignore
                add: 'adding a property',
            })).resolves.toEqual(['56d9bf92f9be48771d6fe5b3']);

            const query = await stateDB.query({ ...empty('READ') });
            expect(query).toHaveLength(2);
            let find = query.find((e) => e.id === '56d9bf92f9be48771d6fe5b3');
            expect(find).not.toBeUndefined();
            expect(find).toEqual({
                id: '56d9bf92f9be48771d6fe5b3',
                name: 'new name',
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

    });

    describe('all', () => {
        let stateDB: StateDatabase;
        let topicsDB: TopicDatabase;
        let entStateDB: EntStateDatabase;

        beforeAll(() => {
            stateDB = new StateDatabase(db, {
                changelog: 'changelog',
                details: 'details',
            });
            topicsDB = new TopicDatabase(db, {
                changelog: 'changelog',
                details: 'details',
            });
            entStateDB = new EntStateDatabase(db, {
                changelog: 'changelog',
                details: 'details',
            });
        });

        const entID = '56d9bf92f9be48771d6fe5b4';
        const stateID = '56d9bf92f9be48771d6fe5b3';
        const topicID = '56d9bf92f9be48771d6fe5b2';

        it('should not allow updates to other types', async () => {
            await expect(stateDB.update({
                ...empty('UPDATE'),
                id: entID,
                name: 'invalid name'
            })).rejects.toThrowError('invalid entity ID');
            await expect(stateDB.update({
                ...empty('UPDATE'),
                id: topicID,
                name: 'invalid name'
            })).rejects.toThrowError('invalid entity ID');

            await expect(entStateDB.update({
                ...empty('UPDATE'),
                id: topicID,
                name: 'invalid name'
            })).rejects.toThrowError('invalid entity ID');
            await expect(entStateDB.update({
                ...empty('UPDATE'),
                id: stateID,
                name: 'invalid name'
            })).rejects.toThrowError('invalid entity ID');

            await expect(topicsDB.update({
                ...empty('UPDATE'),
                id: entID,
                name: 'invalid name'
            })).rejects.toThrowError('invalid entity ID');
            await expect(topicsDB.update({
                ...empty('UPDATE'),
                id: stateID,
                name: 'invalid name'
            })).rejects.toThrowError('invalid entity ID');
        });

    })
});
