"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Chat_1 = require("./Chat");
var text_matches_patterns_1 = require("./utils/text-matches-patterns");
var Conversation = /** @class */ (function (_super) {
    __extends(Conversation, _super);
    function Conversation(bot, userId) {
        var _this = _super.call(this, bot, userId) || this;
        _this.bot = bot;
        _this.userId = userId;
        _this.context = {};
        _this.waitingForAnswer = false;
        _this.start();
        return _this;
    }
    Conversation.prototype.ask = function (question, answer, callbacks, options) {
        if (!question || !answer || typeof answer !== 'function') {
            return console.error("You need to specify a question and answer to ask");
        }
        if (typeof question === 'function') {
            question.apply(this, [this]);
        }
        else {
            this.say(question, options);
        }
        this.waitingForAnswer = true;
        this.listeningAnswer = answer;
        this.listeningCallbacks = Array.isArray(callbacks) ? callbacks : (callbacks ? [callbacks] : []);
        return this;
    };
    Conversation.prototype.respond = function (payload, data) {
        if (!this.isWaitingForAnswer()) {
            // If the conversation has been started but no question has been asked yet,
            // ignore the response. This is usually caused by a race condition with long
            // typing indicators.
            return;
        }
        // Check for callbacks listening for postback or quick_reply
        if (data.type === 'postback' || data.type === 'quick_reply') {
            var postbackPayload_1 = (data.type === 'postback') ? payload.postback.payload : payload.message.quick_reply.payload;
            var specificPostbackCallback = this.listeningCallbacks.find(function (callbackObject) { return (callbackObject.event === data.type + ":" + postbackPayload_1); });
            if (specificPostbackCallback && typeof specificPostbackCallback.callback === 'function') {
                this.stopWaitingForAnswer();
                return specificPostbackCallback.callback.apply(this, [payload, this, data]);
            }
            var genericPostbackCallback = this.listeningCallbacks.find(function (callbackObject) { return (callbackObject.event === data.type); });
            if (genericPostbackCallback && typeof genericPostbackCallback.callback === 'function') {
                this.stopWaitingForAnswer();
                return genericPostbackCallback.callback.apply(this, [payload, this, data]);
            }
        }
        // Check for a callback listening for an attachment
        if (data.type === 'attachment') {
            var attachmentCallback = this.listeningCallbacks.find(function (callbackObject) { return (callbackObject.event === 'attachment'); });
            if (attachmentCallback && typeof attachmentCallback.callback === 'function') {
                this.stopWaitingForAnswer();
                return attachmentCallback.callback.apply(this, [payload, this, data]);
            }
        }
        // Check for text messages that match a listening pattern
        var patternCallbacks = this.listeningCallbacks.filter(function (callbackObject) { return (callbackObject.pattern !== undefined); });
        if (data.type === 'message' && patternCallbacks.length > 0) {
            for (var i = 0; i < patternCallbacks.length; i += 1) {
                var match = text_matches_patterns_1.default(payload.message.text, patternCallbacks[i].pattern);
                if (match !== false) {
                    this.stopWaitingForAnswer();
                    data.keyword = match.keyword;
                    if (match.match) {
                        data.match = match.match;
                    }
                    return patternCallbacks[i].callback.apply(this, [payload, this, data]);
                }
            }
        }
        // If event is a text message that contains a quick reply, and there's already a listening callback
        // for that quick reply that will be executed later, return without calling listeningAnswer
        if (data.type === 'message' && payload.message.quick_reply && payload.message.quick_reply.payload) {
            var quickReplyCallback = this.listeningCallbacks.find(function (callbackObject) { return (callbackObject.event === "quick_reply" || callbackObject.event === "quick_reply:" + payload.message.quick_reply.payload); });
            if (quickReplyCallback && typeof quickReplyCallback.callback === 'function') {
                return;
            }
        }
        // If event is quick_reply at this point, it means there was no quick_reply callback listening,
        // and the message was already responded when the message event fired, so return without calling listeningAnswer
        if (data.type === 'quick_reply') {
            return;
        }
        if (this.listeningAnswer && typeof this.listeningAnswer === 'function') {
            // Solution for nested conversation.ask() by @hudgins
            var listeningAnswer = this.listeningAnswer;
            this.listeningAnswer = null;
            listeningAnswer.apply(this, [payload, this, data]);
            return this;
        }
        // Conversation is still active, but there's no callback waiting for a response.
        // This probably means you forgot to call convo.end(); in your last callback.
        // We'll end the convo but this message is probably lost in time and space.
        return this.end();
    };
    Conversation.prototype.isActive = function () {
        return this.active;
    };
    Conversation.prototype.isWaitingForAnswer = function () {
        return this.waitingForAnswer;
    };
    Conversation.prototype.stopWaitingForAnswer = function () {
        this.waitingForAnswer = false;
        this.listeningCallbacks = [];
    };
    Conversation.prototype.start = function () {
        this.active = true;
        this.emit('start', this);
        return this;
    };
    Conversation.prototype.end = function () {
        this.active = false;
        this.emit('end', this);
        return this;
    };
    Conversation.prototype.get = function (property) {
        return this.context[property];
    };
    Conversation.prototype.set = function (property, value) {
        this.context[property] = value;
        return this.context[property];
    };
    return Conversation;
}(Chat_1.Chat));
exports.Conversation = Conversation;
