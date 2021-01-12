import { constants } from "http2";
import { StateDatabase } from "./database/StateDatabase";
import { _ml } from "./logging/Log";
import { GenericDatabase, RabbitNetworkHandler } from "@uems/micro-builder";
import { EntStateDatabase } from "./database/EntStateDatabase";
import { EntStateMessageValidator, MsgStatus, StateMessageValidator } from '@uems/uemscommlib'
import { TopicValidators } from "@uems/uemscommlib/build/topic/TopicValidators";
import TopicMessageValidator = TopicValidators.TopicMessageValidator;
import { TopicDatabase } from "./database/TopicDatabase";
import { ClientFacingError } from "./error/ClientFacingError";

const _b = _ml(__filename, 'binding');

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
}

const entValidator = new EntStateMessageValidator();
const stateValidator = new StateMessageValidator();
const topicValidator = new TopicMessageValidator();

export default function bind(state: StateDatabase, ent: EntStateDatabase, topic: TopicDatabase, broker: RabbitNetworkHandler<any, any, any, any, any, any>): void {
    broker.on('query', async (message, send, routingKey) => {
        if (routingKey.startsWith("ents.") && await entValidator.validate(message)) {
            return executeGeneric(message, ent, send);
        } else if (routingKey.startsWith("states.") && await stateValidator.validate(message)) {
            return executeGeneric(message, state, send);
        } else if (routingKey.startsWith("topics.") && await topicValidator.validate(message)) {
            return executeGeneric(message, topic, send);
        }

        console.log(message, routingKey);

        send({
            msg_intention: message.msg_intention,
            msg_id: message.msg_id,
            status: MsgStatus.FAIL,
            result: ['Invalid key or message'],
        });

        return undefined;
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
