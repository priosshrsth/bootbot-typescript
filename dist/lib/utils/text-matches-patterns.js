"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function textMatchesPatterns(text, patterns) {
    var keywords = Array.isArray(patterns) ? patterns : [patterns];
    for (var i = 0; i < keywords.length; i += 1) {
        var keyword = keywords[i];
        if (typeof keyword === 'string' && keyword.toLowerCase() === text.toLowerCase()) {
            return { keyword: keyword };
        }
        else if (keyword instanceof RegExp && keyword.test(text)) {
            return {
                keyword: keyword,
                match: text.match(keyword)
            };
        }
    }
    return false;
}
exports.default = textMatchesPatterns;
;
