import {constants} from "http2";
import {StateDatabase} from "./database/StateDatabase";
import {_ml} from "./logging/Log";
import {GenericDatabase, RabbitNetworkHandler, tryApplyTrait} from "@uems/micro-builder/build/src";
import {EntStateDatabase} from "./database/EntStateDatabase";
import {
    DiscoveryMessage,
    DiscoveryResponse,
    EntStateMessageValidator,
    MsgStatus,
    StateMessageValidator,
    TopicMessageValidator
} from '@uems/uemscommlib'
import {TopicDatabase} from "./database/TopicDatabase";
import {ClientFacingError} from "./error/ClientFacingError";

const _b = _ml(__filename, 'binding');

// @ts-ignore
const requestTracker: ('success' | 'fail')[] & { save: (d: 'success' | 'fail') => void } = [];
requestTracker.save = function save(d) {
    if (requestTracker.length >= 50) requestTracker.shift();
    requestTracker.push(d);
    tryApplyTrait('successful', requestTracker.filter((e) => e === 'success').length);
    tryApplyTrait('fail', requestTracker.filter((e) => e === 'fail').length);
};

async function executeGeneric<MESSAGE extends { msg_intention: string, msg_id: number, userID: string },
    DATABASE extends GenericDatabase<any, any, any, any, REPR>,
    RESPONSE extends (MESSAGE & { status: number, result: string[] | REPR[], userID: string }),
    REPR>(
    message: MESSAGE,
    database: DATABASE | undefined,
    send: (res: RESPONSE) => void,
) {
    if (!database) {
        _b.warn('query was received without a valid database connection');
        requestTracker.save('fail');
        throw new Error('uninitialised database connection');
    }

    let status: number = constants.HTTP_STATUS_INTERNAL_SERVER_ERROR;
    let result: string[] | REPR[] = [];


    try {
        switch (message.msg_intention) {
            case 'CREATE':
                result = await database.create(message);
                status = MsgStatus.SUCCESS;
                break;
            case 'DELETE':
                result = await database.delete(message);
                status = MsgStatus.SUCCESS;
                break;
            case 'READ':
                result = await database.query(message);
                status = MsgStatus.SUCCESS;
                break;
            case 'UPDATE':
                result = await database.update(message);
                status = MsgStatus.SUCCESS;
                break;
            default:
                status = constants.HTTP_STATUS_BAD_REQUEST;
        }
    } catch (e) {
        _b.error('failed to query database for events', {
            error: e as unknown,
        });
        requestTracker.save('fail');

        if (e instanceof ClientFacingError) {
            send({
                userID: message.userID,
                status: MsgStatus.FAIL,
                msg_id: message.msg_id,
                msg_intention: message.msg_intention,
                result: [e.message],
            } as RESPONSE);
            return;
        } else {
            send({
                userID: message.userID,
                status: constants.HTTP_STATUS_INTERNAL_SERVER_ERROR,
                msg_id: message.msg_id,
                msg_intention: message.msg_intention,
                result: ['internal server error'],
            } as RESPONSE);
            return;
        }
    }

    if (message.msg_intention === 'READ') {
        send({
            msg_intention: message.msg_intention,
            msg_id: message.msg_id,
            status,
            result: result,
            userID: message.userID,
        } as RESPONSE);
    } else {
        send({
            msg_intention: message.msg_intention,
            msg_id: message.msg_id,
            status,
            result: result,
            userID: message.userID,
        } as RESPONSE);
    }
    requestTracker.save(status === constants.HTTP_STATUS_BAD_REQUEST ? 'fail' : 'success');
}


async function discover(
    message: DiscoveryMessage.DiscoverMessage,
    database: { type: 'state', database: StateDatabase } | { type: 'ent', database: EntStateDatabase } | { type: 'topic', database: TopicDatabase },
    send: (res: DiscoveryResponse.DiscoveryDeleteResponse) => void,
) {
    const result: DiscoveryResponse.DiscoverResponse = {
        userID: message.userID,
        status: MsgStatus.SUCCESS,
        msg_id: message.msg_id,
        msg_intention: 'READ',
        restrict: 0,
        modify: 0,
    };

    if (['state', 'ent', 'topic'].includes(message.assetType)) {
        result.modify = (await database.database.query({
            msg_id: message.msg_id,
            msg_intention: 'READ',
            status: 0,
            userID: 'anonymous',
            id: message.assetID,
        })).length;
    }

    send(result);
}


async function removeDiscover(
    message: DiscoveryMessage.DeleteMessage,
    database: { type: 'state', database: StateDatabase } | { type: 'ent', database: EntStateDatabase } | { type: 'topic', database: TopicDatabase },
    send: (res: DiscoveryResponse.DiscoveryDeleteResponse) => void,
) {
    const result: DiscoveryResponse.DeleteResponse = {
        userID: message.userID,
        status: MsgStatus.SUCCESS,
        msg_id: message.msg_id,
        msg_intention: 'DELETE',
        restrict: 0,
        modified: 0,
        successful: false,
    };

    if (['state', 'ent', 'topic'].includes(message.assetType)) {
        try {
            result.modified = (await database.database.delete({
                msg_id: message.msg_id,
                msg_intention: 'DELETE',
                status: 0,
                userID: 'anonymous',
                id: message.assetID,
            })).length;
            result.successful = true;
        } catch (e) {
            result.successful = false;
        }
    }

    send(result);
}


const entValidator = new EntStateMessageValidator();
const stateValidator = new StateMessageValidator();
const topicValidator = new TopicMessageValidator();

export default function bind(state: StateDatabase, ent: EntStateDatabase, topic: TopicDatabase, broker: RabbitNetworkHandler<any, any, any, any, any, any>): void {
    broker.on('query', async (message, send, routingKey) => {
        if (routingKey === 'states.details.discover') {
            await discover(message, {type: 'state', database: state}, send);
        } else if (routingKey === 'ents.details.discover') {
            await discover(message, {type: 'ent', database: ent}, send);
        } else if (routingKey === 'topics.details.discover') {
            await discover(message, {type: 'topic', database: topic}, send);
        } else if (routingKey === 'states.details.delete') {
            await removeDiscover(message, {type: 'state', database: state}, send);
        } else if (routingKey === 'ents.details.delete') {
            await removeDiscover(message, {type: 'ent', database: ent}, send);
        } else if (routingKey === 'topics.details.delete') {
            await removeDiscover(message, {type: 'topic', database: topic}, send);
        } else {
            if (routingKey.startsWith("ents.") && await entValidator.validate(message)) {
                return executeGeneric(message, ent, send);
            } else if (routingKey.startsWith("states.") && await stateValidator.validate(message)) {
                return executeGeneric(message, state, send);
            } else if (routingKey.startsWith("topics.") && await topicValidator.validate(message)) {
                return executeGeneric(message, topic, send);
            }

            console.log(message, routingKey);

            requestTracker.save('fail');
            send({
                msg_intention: message.msg_intention,
                msg_id: message.msg_id,
                status: MsgStatus.FAIL,
                result: ['Invalid key or message'],
            });

            return undefined;
        }
    });
    _b.debug('bound [query] event [state]');

    broker.on('delete', async (message, send, routingKey) => {
        if (routingKey.startsWith("ents.") && await entValidator.validate(message)) {
            return executeGeneric(message, ent, send);
        } else if (routingKey.startsWith("states.") && await stateValidator.validate(message)) {
            return executeGeneric(message, state, send)
        } else if (routingKey.startsWith("topics.") && await topicValidator.validate(message)) {
            return executeGeneric(message, topic, send);
        }

        requestTracker.save('fail');
        send({
            msg_intention: message.msg_intention,
            msg_id: message.msg_id,
            status: MsgStatus.FAIL,
            result: ['Invalid key or message'],
        });

        return undefined;
    });
    _b.debug('bound [delete] event [state]');

    broker.on('update', async (message, send, routingKey) => {
        if (routingKey.startsWith("ents.") && await entValidator.validate(message)) {
            return executeGeneric(message, ent, send);
        } else if (routingKey.startsWith("states.") && await stateValidator.validate(message)) {
            return executeGeneric(message, state, send)
        } else if (routingKey.startsWith("topics.") && await topicValidator.validate(message)) {
            return executeGeneric(message, topic, send);
        }

        requestTracker.save('fail');
        send({
            msg_intention: message.msg_intention,
            msg_id: message.msg_id,
            status: MsgStatus.FAIL,
            result: ['Invalid key or message'],
        });

        return undefined;
    });
    _b.debug('bound [update] event [state]');

    broker.on('create', async (message, send, routingKey) => {
        if (routingKey.startsWith("ents.") && await entValidator.validate(message)) {
            return executeGeneric(message, ent, send);
        } else if (routingKey.startsWith("states.") && await stateValidator.validate(message)) {
            return executeGeneric(message, state, send);
        } else if (routingKey.startsWith("topics.") && await topicValidator.validate(message)) {
            return executeGeneric(message, topic, send);
        }

        requestTracker.save('fail');
        send({
            msg_intention: message.msg_intention,
            msg_id: message.msg_id,
            status: MsgStatus.FAIL,
            result: ['Invalid key or message'],
        });

        return undefined;
    });
    _b.debug('bound [create] event for [state]');
}
