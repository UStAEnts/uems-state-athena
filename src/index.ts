import { _ml, setupGlobalLogger } from './logging/Log';

setupGlobalLogger();
const __ = _ml(__filename);

import fs from 'fs/promises';
import path from 'path';
import * as z from 'zod';
import { StateDatabase } from "./database/StateDatabase";
import bind from "./Binding";
import { ConfigurationSchema } from "./ConfigurationTypes";
import { EquipmentMessage as EM, EquipmentResponse as ER, has } from "@uems/uemscommlib";
import { EntStateDatabase } from "./database/EntStateDatabase";
import { launchCheck, RabbitNetworkHandler } from "@uems/micro-builder/build/src";
import { TopicDatabase } from "./database/TopicDatabase";
import { tryApplyTrait } from "@uems/micro-builder/build/src";

__.info('starting hephaestus...');

launchCheck(['successful', 'errored', 'rabbitmq', 'database', 'config'], (traits: Record<string, any>) => {
    if (has(traits, 'rabbitmq') && traits.rabbitmq !== '_undefined' && !traits.rabbitmq) return 'unhealthy';
    if (has(traits, 'database') && traits.database !== '_undefined' && !traits.database) return 'unhealthy';
    if (has(traits, 'config') && traits.config !== '_undefined' && !traits.config) return 'unhealthy';

    // If 75% of results fail then we return false
    if (has(traits, 'successful') && has(traits, 'errored')) {
        const errorPercentage = traits.errored / (traits.successful + traits.errored);
        if (errorPercentage > 0.05) return 'unhealthy-serving';
    }

    return 'healthy';
});

let messager: RabbitNetworkHandler<any, any, any, any, any, any> | undefined;
let topic: TopicDatabase | undefined;
let database: StateDatabase | undefined;
let entDatabase: EntStateDatabase | undefined;
let configuration: z.infer<typeof ConfigurationSchema> | undefined;

fs.readFile(process.env.UEMS_ATHENA_CONFIG_LOCATION ?? path.join(__dirname, '..', '..', 'config', 'configuration.json'), { encoding: 'utf8' })
    .then((file) => {
        __.debug('loaded configuration file');
        tryApplyTrait('config', true);

        configuration = ConfigurationSchema.parse(JSON.parse(file));
    })
    .then(() => (new Promise<StateDatabase>((resolve, reject) => {
        if (!configuration) {
            __.error('reached an uninitialised configuration, this should not be possible');
            reject(new Error('uninitialised configuration'));
            tryApplyTrait('config', false);
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
        topic = new TopicDatabase({
            username: configuration.database.username,
            password: configuration.database.password,
            uri: configuration.database.uri,
            port: configuration.database.port,
            settings: configuration.database.settings,

            collections: configuration.database.instance.topic.collections,
            database: configuration.database.instance.topic.database,
            server: configuration.database.instance.topic.server,
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
            tryApplyTrait('database', false);

            reject(err);
        });

        database.once('ready', () => {
            __.info('database connection enabled');
            // Make sure we dont later try and reject a resolved promise from an unrelated error
            unbind();

            if (database) {
                tryApplyTrait('database', true);
                resolve(database);
            }            else {
                tryApplyTrait('database', false);
                reject(new Error('database is invalid'));
            }
        });
    })))
    .then(() => (new Promise<void>((resolve, reject) => {
        if (!configuration) {
            __.error('reached an uninitialised configuration, this should not be possible');
            reject(new Error('uninitialised configuration'));
            tryApplyTrait('config', false);
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
            tryApplyTrait('rabbitmq', false);

            reject(err);
        });

        messager.once('ready', () => {
            __.info('message broker enabled');
            tryApplyTrait('rabbitmq', true);
            // Make sure we dont later try and reject a resolved promise from an unrelated error
            unbind();
            resolve();
        });
    })))
    .then(() => {
        if (!messager || !database || !entDatabase || !topic) {
            __.error('reached an uninitialised database or messenger, this should not be possible');
            tryApplyTrait('rabbitmq', false);
            tryApplyTrait('database', false);
            throw new Error('uninitialised database or messenger');
        }

        __.info('binding database to messenger');

        bind(database, entDatabase, topic, messager);

        // We're ready to start!
        __.info('hera up and running');
    })
    .catch((err) => {
        __.error('failed to launch', {
            error: err as unknown,
        });
    });
