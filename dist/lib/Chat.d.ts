import { EventEmitter } from 'eventemitter3';
export declare class Chat extends EventEmitter {
    bot: any;
    userId: any;
    constructor(bot: any, userId: any);
    say(message: any, options: any): any;
    sendTextMessage(text: any, quickReplies: any, options: any): any;
    sendButtonTemplate(text: any, buttons: any, options: any): any;
    sendGenericTemplate(cards: any, options: any): any;
    sendListTemplate(elements: any, buttons: any, options: any): any;
    sendTemplate(payload: any, options: any): any;
    sendAttachment(type: any, url: any, quickReplies: any, options: any): any;
    sendAction(action: any, options: any): any;
    sendMessage(message: any, options: any): any;
    sendRequest(body: any, endpoint: any, method: any): any;
    sendTypingIndicator(milliseconds: any): any;
    getUserProfile(): any;
    conversation(factory: any): any;
}
