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
var Conversation_1 = require("./Conversation");
var eventemitter3_1 = require("eventemitter3");
var express = require("express");
var bodyParser = require("body-parser");
var crypto = require("crypto");
var fetch = require("node-fetch");
var normalize_string_1 = require("./utils/normalize-string");
var BootBot = /** @class */ (function (_super) {
    __extends(BootBot, _super);
    function BootBot(options) {
        var _this = _super.call(this) || this;
        if (!options || (options && (!options.accessToken || !options.verifyToken || !options.appSecret))) {
            throw new Error('You need to specify an accessToken, verifyToken and appSecret');
        }
        _this.accessToken = options.accessToken;
        _this.verifyToken = options.verifyToken;
        _this.appSecret = options.appSecret;
        _this.broadcastEchoes = options.broadcastEchoes || false;
        _this.app = express();
        _this.webhook = options.webhook || '/webhook';
        _this.webhook = _this.webhook.charAt(0) !== '/' ? "/" + _this.webhook : _this.webhook;
        _this.app.use(bodyParser.json({ verify: _this._verifyRequestSignature.bind(_this) }));
        _this._hearMap = [];
        _this._conversations = [];
        return _this;
    }
    BootBot.prototype.start = function (port) {
        var _this = this;
        this._initWebhook();
        this.app.set('port', port || 3000);
        this.server = this.app.listen(this.app.get('port'), function () {
            var portNum = _this.app.get('port');
            console.log('BootBot running on port', portNum);
            console.log("Facebook Webhook running on localhost:" + portNum + _this.webhook);
        });
    };
    BootBot.prototype.close = function () {
        this.server.close();
    };
    BootBot.prototype.sendTextMessage = function (recipientId, text, quickReplies, options) {
        var message = { text: text };
        var formattedQuickReplies = this._formatQuickReplies(quickReplies);
        if (formattedQuickReplies && formattedQuickReplies.length > 0) {
            message.quick_replies = formattedQuickReplies;
        }
        return this.sendMessage(recipientId, message, options);
    };
    BootBot.prototype.sendButtonTemplate = function (recipientId, text, buttons, options) {
        var payload = {
            template_type: 'button',
            text: text
        };
        var formattedButtons = this._formatButtons(buttons);
        payload.buttons = formattedButtons;
        return this.sendTemplate(recipientId, payload, options);
    };
    BootBot.prototype.sendGenericTemplate = function (recipientId, elements, options) {
        var payload = {
            template_type: 'generic',
            elements: elements
        };
        options && options.imageAspectRatio && (payload.image_aspect_ratio = options.imageAspectRatio) && (delete options.imageAspectRatio);
        return this.sendTemplate(recipientId, payload, options);
    };
    BootBot.prototype.sendListTemplate = function (recipientId, elements, buttons, options) {
        var payload = {
            template_type: 'list',
            elements: elements
        };
        options && options.topElementStyle && (payload.top_element_style = options.topElementStyle) && (delete options.topElementStyle);
        buttons && buttons.length && (payload.buttons = this._formatButtons([buttons[0]]));
        return this.sendTemplate(recipientId, payload, options);
    };
    BootBot.prototype.sendTemplate = function (recipientId, payload, options) {
        var message = {
            attachment: {
                type: 'template',
                payload: payload
            }
        };
        return this.sendMessage(recipientId, message, options);
    };
    BootBot.prototype.sendAttachment = function (recipientId, type, url, quickReplies, options) {
        var message = {
            attachment: {
                type: type,
                payload: { url: url }
            }
        };
        var formattedQuickReplies = this._formatQuickReplies(quickReplies);
        if (formattedQuickReplies && formattedQuickReplies.length > 0) {
            message.quick_replies = formattedQuickReplies;
        }
        return this.sendMessage(recipientId, message, options);
    };
    BootBot.prototype.sendAction = function (recipientId, action, options) {
        var recipient = this._createRecipient(recipientId);
        return this.sendRequest({
            recipient: recipient,
            sender_action: action
        });
    };
    BootBot.prototype.sendMessage = function (recipientId, message, options) {
        var _this = this;
        var recipient = this._createRecipient(recipientId);
        var onDelivery = options && options.onDelivery;
        var onRead = options && options.onRead;
        var req = function () { return (_this.sendRequest({
            recipient: recipient,
            message: message
        }).then(function (json) {
            if (typeof onDelivery === 'function') {
                _this.once('delivery', onDelivery);
            }
            if (typeof onRead === 'function') {
                _this.once('read', onRead);
            }
            return json;
        })); };
        let allowTypingIndicator = this.allowTypingIndicator;
        if (options && 'typing' in options) {
            allowTypingIndicator = options.allowTypingIndicator;
        }
        if (allowTypingIndicator) {
            var autoTimeout = (message && message.text) ? message.text.length * 10 : 1000;
            var timeout = (typeof options.typing === 'number') ? options.typing : autoTimeout;
            return this.sendTypingIndicator(recipientId, timeout).then(req);
        }
        return req();
    };
    BootBot.prototype.sendRequest = function (body, endpoint, method) {
        endpoint = endpoint || 'messages';
        method = method || 'POST';
        return fetch("https://graph.facebook.com/v2.6/me/" + endpoint + "?access_token=" + this.accessToken, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })
            .then(function (res) { return res.json(); })
            .then(function (res) {
            if (res.error) {
                console.log('Messenger Error received. For more information about error codes, see: https://goo.gl/d76uvB');
                console.log(res.error);
            }
            return res;
        })
            .catch(function (err) { return console.log("Error sending message: " + err); });
    };
    BootBot.prototype.sendThreadRequest = function (body, method) {
        console.log("\n      sendThreadRequest: Dreprecation warning. Thread API has been replaced by the Messenger Profile API.\n      Please update your code to use the sendProfileRequest() method instead.");
        return this.sendRequest(body, 'thread_settings', method);
    };
    BootBot.prototype.sendProfileRequest = function (body, method) {
        return this.sendRequest(body, 'messenger_profile', method);
    };
    BootBot.prototype.sendTypingIndicator = function (recipientId, milliseconds) {
        var _this = this;
        var timeout = isNaN(milliseconds) ? 0 : milliseconds;
        if (milliseconds > 20000) {
            milliseconds = 20000;
            console.error('sendTypingIndicator: max milliseconds value is 20000 (20 seconds)');
        }
        return new Promise(function (resolve, reject) {
            return _this.sendAction(recipientId, 'typing_on').then(function () {
                setTimeout(function () { return _this.sendAction(recipientId, 'typing_off').then(function (json) { return resolve(json); }); }, timeout);
            });
        });
    };
    BootBot.prototype.getUserProfile = function (userId) {
        var url = "https://graph.facebook.com/v2.6/" + userId + "?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=" + this.accessToken;
        return fetch(url)
            .then(function (res) { return res.json(); })
            .catch(function (err) { return console.log("Error getting user profile: " + err); });
    };
    BootBot.prototype.setGreetingText = function (text) {
        var greeting = (typeof text !== 'string') ? text : [{
                locale: 'default',
                text: text
            }];
        return this.sendProfileRequest({ greeting: greeting });
    };
    BootBot.prototype.setGetStartedButton = function (action) {
        var payload = (typeof action === 'string') ? action : 'BOOTBOT_GET_STARTED';
        if (typeof action === 'function') {
            this.on("postback:" + payload, action);
        }
        return this.sendProfileRequest({
            get_started: {
                payload: payload
            }
        });
    };
    BootBot.prototype.deleteGetStartedButton = function () {
        return this.sendProfileRequest({
            fields: [
                'get_started'
            ]
        }, 'DELETE');
    };
    BootBot.prototype.setPersistentMenu = function (buttons, disableInput) {
        if (buttons && buttons[0] && buttons[0].locale !== undefined) {
            // Received an array of locales, send it as-is.
            return this.sendProfileRequest({ persistent_menu: buttons });
        }
        // If it's not an array of locales, we'll assume is an array of buttons.
        var formattedButtons = this._formatButtons(buttons);
        return this.sendProfileRequest({
            persistent_menu: [{
                    locale: 'default',
                    composer_input_disabled: disableInput || false,
                    call_to_actions: formattedButtons
                }]
        });
    };
    BootBot.prototype.deletePersistentMenu = function () {
        return this.sendProfileRequest({
            fields: [
                'persistent_menu'
            ]
        }, 'DELETE');
    };
    BootBot.prototype.say = function (recipientId, message, options) {
        var _this = this;
        if (typeof message === 'string') {
            return this.sendTextMessage(recipientId, message, [], options);
        }
        else if (message && message.text) {
            if (message.quickReplies && message.quickReplies.length > 0) {
                return this.sendTextMessage(recipientId, message.text, message.quickReplies, options);
            }
            else if (message.buttons && message.buttons.length > 0) {
                return this.sendButtonTemplate(recipientId, message.text, message.buttons, options);
            }
        }
        else if (message && message.attachment) {
            return this.sendAttachment(recipientId, message.attachment, message.url, message.quickReplies, options);
        }
        else if (message && message.elements && message.buttons) {
            return this.sendListTemplate(recipientId, message.elements, message.buttons, options);
        }
        else if (message && message.cards) {
            return this.sendGenericTemplate(recipientId, message.cards, options);
        }
        else if (Array.isArray(message)) {
            return message.reduce(function (promise, msg) {
                return promise.then(function () { return _this.say(recipientId, msg, options); });
            }, Promise.resolve());
        }
        console.error('Invalid format for .say() message.');
    };
    BootBot.prototype.hear = function (keywords, callback) {
        var _this = this;
        keywords = Array.isArray(keywords) ? keywords : [keywords];
        keywords.forEach(function (keyword) { return _this._hearMap.push({ keyword: keyword, callback: callback }); });
        return this;
    };
    BootBot.prototype.module = function (factory) {
        return factory.apply(this, [this]);
    };
    BootBot.prototype.conversation = function (recipientId, factory) {
        var _this = this;
        if (!recipientId || !factory || typeof factory !== 'function') {
            return console.error("You need to specify a recipient and a callback to start a conversation");
        }
        var convo = new Conversation_1.Conversation(this, recipientId);
        this._conversations.push(convo);
        convo.on('end', function (endedConvo) {
            var removeIndex = _this._conversations.indexOf(endedConvo);
            _this._conversations.splice(removeIndex, 1);
        });
        factory.apply(this, [convo]);
        return convo;
    };
    BootBot.prototype._formatButtons = function (buttons) {
        return buttons && buttons.map(function (button) {
            if (typeof button === 'string') {
                return {
                    type: 'postback',
                    title: button,
                    payload: 'BOOTBOT_BUTTON_' + normalize_string_1.default(button)
                };
            }
            else if (button && button.type) {
                return button;
            }
            return {};
        });
    };
    BootBot.prototype._formatQuickReplies = function (quickReplies) {
        return quickReplies && quickReplies.map(function (reply) {
            if (typeof reply === 'string') {
                return {
                    content_type: 'text',
                    title: reply,
                    payload: 'BOOTBOT_QR_' + normalize_string_1.default(reply)
                };
            }
            else if (reply && reply.title) {
                return Object.assign({
                    content_type: 'text',
                    payload: 'BOOTBOT_QR_' + normalize_string_1.default(reply.title)
                }, reply);
            }
            return reply;
        });
    };
    BootBot.prototype._handleEvent = function (type, event, data) {
        var recipient = (type === 'authentication' && !event.sender) ? { user_ref: event.optin.user_ref } : event.sender.id;
        var chat = new Chat_1.Chat(this, recipient);
        this.emit(type, event, chat, data);
    };
    BootBot.prototype._handleMessageEvent = function (event) {
        var _this = this;
        if (this._handleConversationResponse('message', event)) {
            return;
        }
        var text = event.message.text;
        var senderId = event.sender.id;
        var captured = false;
        if (!text) {
            return;
        }
        this._hearMap.forEach(function (hear) {
            if (typeof hear.keyword === 'string' && hear.keyword.toLowerCase() === text.toLowerCase()) {
                var res = hear.callback.apply(_this, [event, new Chat_1.Chat(_this, senderId), {
                        keyword: hear.keyword,
                        captured: captured
                    }]);
                captured = true;
                return res;
            }
            else if (hear.keyword instanceof RegExp && hear.keyword.test(text)) {
                var res = hear.callback.apply(_this, [event, new Chat_1.Chat(_this, senderId), {
                        keyword: hear.keyword,
                        match: text.match(hear.keyword),
                        captured: captured
                    }]);
                captured = true;
                return res;
            }
        });
        this._handleEvent('message', event, { captured: captured });
    };
    BootBot.prototype._handleAttachmentEvent = function (event) {
        if (this._handleConversationResponse('attachment', event)) {
            return;
        }
        this._handleEvent('attachment', event);
    };
    BootBot.prototype._handlePostbackEvent = function (event) {
        if (this._handleConversationResponse('postback', event)) {
            return;
        }
        var payload = event.postback.payload;
        if (payload) {
            this._handleEvent("postback:" + payload, event);
        }
        this._handleEvent('postback', event);
    };
    BootBot.prototype._handleQuickReplyEvent = function (event) {
        if (this._handleConversationResponse('quick_reply', event)) {
            return;
        }
        var payload = event.message.quick_reply && event.message.quick_reply.payload;
        if (payload) {
            this._handleEvent("quick_reply:" + payload, event);
        }
        this._handleEvent('quick_reply', event);
    };
    BootBot.prototype._handleConversationResponse = function (type, event) {
        var userId = event.sender.id;
        var captured = false;
        this._conversations.forEach(function (convo) {
            if (userId && userId === convo.userId && convo.isActive()) {
                captured = true;
                return convo.respond(event, { type: type });
            }
        });
        return captured;
    };
    BootBot.prototype._createRecipient = function (recipient) {
        return (typeof recipient === 'object') ? recipient : { id: recipient };
    };
    BootBot.prototype._initWebhook = function () {
        var _this = this;
        this.app.get(this.webhook, function (req, res) {
            if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === _this.verifyToken) {
                console.log('Validation Succeded.');
                res.status(200).send(req.query['hub.challenge']);
            }
            else {
                console.error('Failed validation. Make sure the validation tokens match.');
                res.sendStatus(403);
            }
        });
        this.app.post(this.webhook, function (req, res) {
            var data = req.body;
            if (data.object !== 'page') {
                return;
            }
            _this.handleFacebookData(data);
            // Must send back a 200 within 20 seconds or the request will time out.
            res.sendStatus(200);
        }).bind(this);
    };
    BootBot.prototype.handleFacebookData = function (data) {
        var _this = this;
        // Iterate over each entry. There may be multiple if batched.
        data.entry.forEach(function (entry) {
            // Iterate over each messaging event
            entry.messaging.forEach(function (event) {
                if (event.message && event.message.is_echo && !_this.broadcastEchoes) {
                    return;
                }
                if (event.optin) {
                    _this._handleEvent('authentication', event);
                }
                else if (event.message && event.message.text) {
                    _this._handleMessageEvent(event);
                    if (event.message.quick_reply) {
                        _this._handleQuickReplyEvent(event);
                    }
                }
                else if (event.message && event.message.attachments) {
                    _this._handleAttachmentEvent(event);
                }
                else if (event.postback) {
                    _this._handlePostbackEvent(event);
                }
                else if (event.delivery) {
                    _this._handleEvent('delivery', event);
                }
                else if (event.read) {
                    _this._handleEvent('read', event);
                }
                else if (event.account_linking) {
                    _this._handleEvent('account_linking', event);
                }
                else if (event.referral) {
                    _this._handleEvent('referral', event);
                }
                else {
                    console.log('Webhook received unknown event: ', event);
                }
            });
        });
    };
    BootBot.prototype._verifyRequestSignature = function (req, res, buf) {
        var signature = req.headers['x-hub-signature'];
        if (!signature) {
            throw new Error('Couldn\'t validate the request signature.');
        }
        else {
            var elements = signature.split('=');
            var method = elements[0];
            var signatureHash = elements[1];
            var expectedHash = crypto.createHmac('sha1', this.appSecret)
                .update(buf)
                .digest('hex');
            if (signatureHash != expectedHash) {
                throw new Error('Couldn\'t validate the request signature.');
            }
        }
    };
    return BootBot;
}(eventemitter3_1.EventEmitter));
exports.BootBot = BootBot;
