import { _ml, setupGlobalLogger } from './logging/Log';

setupGlobalLogger();
const __ = _ml(__filename);

import fs from 'fs/promises';
import path from 'path';
import * as z from 'zod';
import { StateDatabase } from "./database/StateDatabase";
import bind from "./Binding";
import { ConfigurationSchema } from "./ConfigurationTypes";
import {EquipmentMessage as EM, EquipmentResponse as ER} from "@uems/uemscommlib";
import { EntStateDatabase } from "./database/EntStateDatabase";
import { RabbitNetworkHandler } from "@uems/micro-builder";

__.info('starting hephaestus...');

let messager: RabbitNetworkHandler<any, any, any, any, any, any> | undefined;
let database: StateDatabase | undefined;
let entDatabase: EntStateDatabase | undefined;
let configuration: z.infer<typeof ConfigurationSchema> | undefined;

fs.readFile(path.join(__dirname, '..', 'config', 'configuration.json'), { encoding: 'utf8' })
    .then((file) => {
        __.debug('loaded configuration file');

        configuration = ConfigurationSchema.parse(JSON.parse(file));
    })
    .then(() => (new Promise<StateDatabase>((resolve, reject) => {
        if (!configuration) {
            __.error('reached an uninitialised configuration, this should not be possible');
            reject(new Error('uninitialised configuration'));
            return;
        }

        __.info('setting up database connection');

        database = new StateDatabase({
            username: configuration.database.username,
            password: configuration.database.password,
            uri: configuration.database.uri,
            port: configuration.database.port,
            settings: configuration.database.settings,

            collections: configuration.database.instance.state.collections,
            database: configuration.database.instance.state.database,
            server: configuration.database.instance.state.server,
        });
        entDatabase = new EntStateDatabase({
            username: configuration.database.username,
            password: configuration.database.password,
            uri: configuration.database.uri,
            port: configuration.database.port,
            settings: configuration.database.settings,

            collections: configuration.database.instance.ent.collections,
            database: configuration.database.instance.ent.database,
            server: configuration.database.instance.ent.server,
        });

        const unbind = database.once('error', (err) => {
            __.error('failed to setup the database connection', {
                error: err,
            });

            reject(err);
        });

        database.once('ready', () => {
            __.info('database connection enabled');
            // Make sure we dont later try and reject a resolved promise from an unrelated error
            unbind();

            if (database) resolve(database);
            else reject(new Error('database is invalid'));
        });
    })))
    .then(() => (new Promise<void>((resolve, reject) => {
        if (!configuration) {
            __.error('reached an uninitialised configuration, this should not be possible');
            reject(new Error('uninitialised configuration'));
            return;
        }

        __.info('setting up the message broker');

        messager = new RabbitNetworkHandler<EM.EquipmentMessage,
            EM.CreateEquipmentMessage,
            EM.DeleteEquipmentMessage,
            EM.ReadEquipmentMessage,
            EM.UpdateEquipmentMessage,
            ER.EquipmentReadResponseMessage | ER.EquipmentResponseMessage>
        (
            configuration.message,
            (data) => true,
            (data) => true,
        );

        const unbind = messager.once('error', (err) => {
            __.error('failed to setup the message broker', {
                error: err,
            });

            reject(err);
        });

        messager.once('ready', () => {
            __.info('message broker enabled');
            // Make sure we dont later try and reject a resolved promise from an unrelated error
            unbind();
            resolve();
        });
    })))
    .then(() => {
        if (!messager || !database || !entDatabase) {
            __.error('reached an uninitialised database or messenger, this should not be possible');
            throw new Error('uninitialised database or messenger');
        }

        __.info('binding database to messenger');

        bind(database, entDatabase, messager);

        // We're ready to start!
        __.info('hera up and running');
    })
    .catch((err) => {
        __.error('failed to launch', {
            error: err as unknown,
        });
    });
