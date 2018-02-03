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
var eventemitter3_1 = require("eventemitter3");
var Chat = /** @class */ (function (_super) {
    __extends(Chat, _super);
    function Chat(bot, userId) {
        var _this = _super.call(this) || this;
        if (!bot || !userId) {
            throw new Error('You need to specify a BootBot instance and a userId');
        }
        _this.bot = bot;
        _this.userId = userId;
        return _this;
    }
    Chat.prototype.say = function (message, options) {
        return this.bot.say(this.userId, message, options);
    };
    Chat.prototype.sendTextMessage = function (text, quickReplies, options) {
        return this.bot.sendTextMessage(this.userId, text, quickReplies, options);
    };
    Chat.prototype.sendButtonTemplate = function (text, buttons, options) {
        return this.bot.sendButtonTemplate(this.userId, text, buttons, options);
    };
    Chat.prototype.sendGenericTemplate = function (cards, options) {
        return this.bot.sendGenericTemplate(this.userId, cards, options);
    };
    Chat.prototype.sendListTemplate = function (elements, buttons, options) {
        return this.bot.sendListTemplate(this.userId, elements, buttons, options);
    };
    Chat.prototype.sendTemplate = function (payload, options) {
        return this.bot.sendTemplate(this.userId, payload, options);
    };
    Chat.prototype.sendAttachment = function (type, url, quickReplies, options) {
        return this.bot.sendAttachment(this.userId, type, url, quickReplies, options);
    };
    Chat.prototype.sendAction = function (action, options) {
        return this.bot.sendAction(this.userId, action, options);
    };
    Chat.prototype.sendMessage = function (message, options) {
        return this.bot.sendMessage(this.userId, message, options);
    };
    Chat.prototype.sendRequest = function (body, endpoint, method) {
        return this.bot.sendRequest(body, endpoint, method);
    };
    Chat.prototype.sendTypingIndicator = function (milliseconds) {
        return this.bot.sendTypingIndicator(this.userId, milliseconds);
    };
    Chat.prototype.getUserProfile = function () {
        return this.bot.getUserProfile(this.userId);
    };
    Chat.prototype.conversation = function (factory) {
        return this.bot.conversation(this.userId, factory);
    };
    return Chat;
}(eventemitter3_1.EventEmitter));
exports.Chat = Chat;
